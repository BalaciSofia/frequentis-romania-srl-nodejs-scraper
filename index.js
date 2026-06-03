import fetch from "node-fetch";
import * as cheerio from "cheerio";
import fs from "fs";
import { fileURLToPath } from "url";
import { validateAndGetCompany } from "./company.js";
import { querySOLR, deleteJobByUrl, upsertJobs, upsertCompany } from "./solr.js";
import { sleep } from "./src/utils.js";

const COMPANY_CIF = "25475641";
const TIMEOUT = 10000;
const JOB_SEARCH_URL = "https://jobs.frequentis.com/careers/SearchJobs";
const JOB_BASE = "https://jobs.frequentis.com";

let COMPANY_NAME = null;

async function fetchJobsPage(pageNum) {
  const url = `${JOB_SEARCH_URL}?page=${pageNum}&sort=date&folder=true`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "job_seeker_ro_spider",
      "Accept": "text/html,application/xhtml+xml"
    },
    timeout: TIMEOUT
  });

  if (!res.ok) {
    throw new Error(`Search page error ${res.status} for page=${pageNum}`);
  }

  return await res.text();
}

function parseJobListing(html) {
  const $ = cheerio.load(html);
  const jobs = [];

  $('.list__item__text__title a').each((i, el) => {
    const href = $(el).attr('href');
    const title = $(el).text().trim();

    if (!href || !title) return;

    const url = href.startsWith('http') ? href : `${JOB_BASE}${href}`;

    if (!url.includes('ROU-')) return;

    jobs.push({
      url,
      title
    });
  });

  return jobs;
}

async function fetchJobDetails(url) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "job_seeker_ro_spider",
        "Accept": "text/html,application/xhtml+xml"
      },
      timeout: TIMEOUT
    });

    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);

    const location = [];
    $('.list__item__text__subtitle span, .job-location, [class*="location"]').each((i, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 0) location.push(text);
    });

    const bodyText = $('body').text();

    let workmode = "on-site";
    if (/remote|hybrid|flexibil/i.test(bodyText)) {
      if (/remote/i.test(bodyText) && !/on.?site|office/i.test(bodyText)) workmode = "remote";
      else if (/hybrid/i.test(bodyText)) workmode = "hybrid";
    }

    const tags = [];
    const keywords = [/java/i, /javascript/i, /python/i, /c[+\+#]{1,2}/i, /go\b/i,
      /react/i, /angular/i, /node/i, /aws/i, /azure/i, /docker/i, /kubernetes/i,
      /linux/i, /agile/i, /scrum/i, /rest/i, /sql/i, /nosql/i, /microservice/i,
      /devops/i, /ci\/cd/i, /git/i, /jenkins/i, /test/i, /puppet/i, /ansible/i];

    for (const kw of keywords) {
      if (kw.test(bodyText)) {
        tags.push(kw.source.replace(/[\\\/\^\$\.\|\?\+\*\(\)\[\{]/g, '').toLowerCase().replace(/^\\b|\\b$/g, ''));
      }
    }

    return {
      location: location.length > 0 ? location : ["Cluj-Napoca"],
      workmode,
      tags: [...new Set(tags)].slice(0, 20)
    };
  } catch (err) {
    console.log(`  Warning: Could not fetch details for ${url}: ${err.message}`);
    return null;
  }
}

async function scrapeAllListings(testOnlyOnePage = false) {
  const allJobs = [];
  const seenUrls = new Set();
  let page = 1;
  const MAX_PAGES = 10;

  while (true) {
    console.log(`Fetching search page: ${page}`);
    const html = await fetchJobsPage(page);
    const pageJobs = parseJobListing(html);

    if (!pageJobs.length) {
      if (page === 1 && html.includes("SearchJobs")) {
        console.warn("Warning: HTML contains 'SearchJobs' but no jobs parsed - site structure may have changed");
      }
      console.log(`No Romanian jobs found on page ${page}, stopping.`);
      break;
    }

    if (page === 1) {
      console.log(`Romanian jobs on page 1: ${pageJobs.length}`);
    }

    let newJobs = 0;
    for (const job of pageJobs) {
      if (!seenUrls.has(job.url)) {
        seenUrls.add(job.url);
        console.log(`  Fetching details: ${job.title}`);
        const details = await fetchJobDetails(job.url);
        if (details) {
          allJobs.push({
            url: job.url,
            title: details.title || job.title,
            workmode: details.workmode,
            location: details.location,
            tags: details.tags
          });
          newJobs++;
        }
        await sleep(1000);
      }
    }

    console.log(`Page ${page}: ${pageJobs.length} jobs, ${newJobs} new (total: ${allJobs.length})`);

    if (testOnlyOnePage) {
      console.log("Test mode: stopping after page 1.");
      break;
    }

    if (page >= MAX_PAGES) {
      console.log(`Max pages (${MAX_PAGES}) reached, stopping.`);
      break;
    }

    if (newJobs === 0) {
      console.log(`No new jobs on page ${page}, stopping.`);
      break;
    }

    page += 1;
    await sleep(1500);
  }

  console.log(`Total unique Romanian jobs collected: ${allJobs.length}`);
  return allJobs;
}

function mapToJobModel(rawJob, cif, companyName = COMPANY_NAME) {
  const now = new Date().toISOString();

  const job = {
    url: rawJob.url,
    title: rawJob.title,
    company: companyName,
    cif: cif,
    location: rawJob.location?.length ? rawJob.location : undefined,
    tags: rawJob.tags?.length ? rawJob.tags : undefined,
    workmode: rawJob.workmode || undefined,
    date: now,
    status: "scraped"
  };

  Object.keys(job).forEach((k) => job[k] === undefined && delete job[k]);

  return job;
}

function transformJobsForSOLR(payload) {
  const romanianCities = [
    'Cluj-Napoca', 'Cluj Napoca', 'Bucharest', 'Bucuresti', 'Timisoara', 'Iasi',
    'Brasov', 'Constanta', 'Craiova', 'Bacau', 'Sibiu', 'Targu Mures',
    'Oradea', 'Baia Mare', 'Satu Mare', 'Ploiesti', 'Pitesti', 'Arad',
    'Galati', 'Braila', 'Drobeta-Turnu Severin', 'Ramnicu Valcea',
    'Buzau', 'Botosani', 'Zalau', 'Hunedoara', 'Deva', 'Suceava',
    'Bistrita', 'Tulcea', 'Calarasi', 'Giurgiu', 'Alba Iulia', 'Slatina',
    'Piatra Neamt', 'Roman', 'Dumbravita', 'Voluntari', 'Popesti-Leordeni',
    'Chitila', 'Mogosoaia', 'Otopeni'
  ];

  const citySet = new Set(romanianCities.map(c => c.toLowerCase()));

  const REMOTE_WORDS = ['remote'];
  const ONSITE_WORDS = ['office', 'on-site', 'on site'];
  const HYBRID_WORDS = ['hybrid'];

  const normalizeWorkmode = (wm) => {
    if (!wm) return undefined;
    const lower = wm.toLowerCase();
    if (REMOTE_WORDS.some(w => lower.includes(w))) return 'remote';
    if (ONSITE_WORDS.some(w => lower.includes(w))) return 'on-site';
    if (HYBRID_WORDS.some(w => lower.includes(w))) return 'hybrid';
    return undefined;
  };

  const transformed = {
    ...payload,
    company: payload.company?.toUpperCase(),
    jobs: payload.jobs.map(job => {
      const validLocations = (job.location || []).filter(loc => {
        const lower = loc.toLowerCase().trim();
        if (lower === 'romania' || lower === 'românia') return true;
        return citySet.has(lower);
      }).map(loc => loc.toLowerCase() === 'romania' ? 'România' : loc);

      return {
        ...job,
        location: validLocations.length > 0 ? validLocations : ['România'],
        workmode: normalizeWorkmode(job.workmode)
      };
    })
  };

  return transformed;
}

function validateEnv() {
  const required = ["SOLR_AUTH"];
  const missing = required.filter(v => !process.env[v]);
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }
}

async function main() {
  validateEnv();
  const testOnlyOnePage = process.argv.includes("--test");

  try {
    console.log("=== Step 1: Get existing jobs count ===");
    const existingResult = await querySOLR(COMPANY_CIF);
    const existingCount = existingResult.numFound;
    console.log(`Found ${existingCount} existing jobs in SOLR`);
    console.log("(Keeping existing jobs - will upsert FREQUENTIS jobs only)");

    console.log("=== Step 2: Validate company via ANAF ===");
    const { company, cif, address } = await validateAndGetCompany();
    COMPANY_NAME = company;
    const localCif = cif;

    try {
      await upsertCompany({
        id: cif,
        company,
        brand: "FREQUENTIS",
        status: "activ",
        location: address ? [address] : ["Cluj-Napoca"],
        website: ["https://www.frequentis.com"],
        career: ["https://jobs.frequentis.com"],
        lastScraped: new Date().toISOString().split('T')[0],
        scraperFile: "https://raw.githubusercontent.com/BalaciSofia/frequentis-romania-srl-nodejs-scraper/master/.github/workflows/scrape.yml"
      });
    } catch (err) {
      console.log(`Note: Could not upsert company to SOLR core: ${err.message}`);
    }

    const rawJobs = await scrapeAllListings(testOnlyOnePage);
    const scrapedCount = rawJobs.length;
    console.log(`?? Jobs scraped from FREQUENTIS careers website: ${scrapedCount}`);

    const jobs = rawJobs.map(job => mapToJobModel(job, localCif));

    const payload = {
      source: "jobs.frequentis.com",
      scrapedAt: new Date().toISOString(),
      company: COMPANY_NAME,
      cif: localCif,
      jobs
    };

    console.log("Transforming jobs for SOLR...");
    const transformedPayload = transformJobsForSOLR(payload);
    const validCount = transformedPayload.jobs.filter(j => j.location).length;
    console.log(`?? Jobs with valid Romanian locations: ${validCount}`);

    fs.writeFileSync("jobs.json", JSON.stringify(transformedPayload, null, 2), "utf-8");
    console.log("Saved jobs.json");

    console.log("\n=== Step 4: Upsert jobs to SOLR ===");
    await upsertJobs(transformedPayload.jobs);

    const finalResult = await querySOLR(COMPANY_CIF);
    console.log(`\n?? === SUMMARY ===`);
    console.log(`?? Jobs existing in SOLR before scrape: ${existingCount}`);
    console.log(`?? Jobs scraped from FREQUENTIS website: ${scrapedCount}`);
    console.log(`?? Jobs in SOLR after scrape: ${finalResult.numFound}`);
    console.log(`====================`);

    console.log("\n=== DONE ===");
    console.log("Scraper completed successfully!");

  } catch (err) {
    console.error("Scraper failed:", err);
    process.exit(1);
  }
}

export { parseJobListing, fetchJobDetails, mapToJobModel, transformJobsForSOLR };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
