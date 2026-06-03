import fetch from "node-fetch";
import fs from "fs";
import { fileURLToPath } from "url";

const SOLR_URL = "https://solr.peviitor.ro/solr/job";
const SOLR_COMPANY_URL = "https://solr.peviitor.ro/solr/company";
const TIMEOUT = 10000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

export function getSolrAuth() {
  return process.env.SOLR_AUTH;
}

function getAuth() {
  const auth = process.env.SOLR_AUTH;
  if (!auth) throw new Error("SOLR_AUTH not set in environment");
  return auth;
}

async function parseSolrResponse(res, context) {
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`SOLR ${context} error: ${res.status} - ${text}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`SOLR ${context} non-JSON response: ${text.substring(0, 200)}`);
  }
}

function validateResponse(data, context) {
  if (!data || typeof data !== 'object') {
    throw new Error(`SOLR ${context} unexpected response type: ${typeof data}`);
  }
  if (data.error) {
    throw new Error(`SOLR ${context} returned error: ${JSON.stringify(data.error)}`);
  }
  return data;
}

async function withRetry(fn, context) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        console.log(`SOLR ${context} attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}, retrying...`);
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
      }
    }
  }
  throw lastError;
}

export async function querySOLR(cif) {
  const AUTH = getAuth();
  const params = new URLSearchParams({
    q: `cif:${cif}`,
    rows: 100,
    wt: "json"
  });

  return withRetry(async () => {
    const res = await fetch(`${SOLR_URL}/select?${params}`, {
      timeout: TIMEOUT,
      headers: {
        "Authorization": "Basic " + Buffer.from(AUTH).toString("base64"),
        "User-Agent": "job_seeker_ro_spider"
      }
    });

    const data = validateResponse(await parseSolrResponse(res, "query"), "query");
    if (!data.response) throw new Error("SOLR query response missing response field");
    return data.response;
  }, "query");
}

export async function upsertCompany(companyDoc) {
  const AUTH = getAuth();
  const params = new URLSearchParams({ commit: "true" });

  return withRetry(async () => {
    const res = await fetch(`${SOLR_COMPANY_URL}/update?${params}`, {
      method: "POST",
      timeout: TIMEOUT,
      headers: {
        "Authorization": "Basic " + Buffer.from(AUTH).toString("base64"),
        "Content-Type": "application/json",
        "User-Agent": "job_seeker_ro_spider"
      },
      body: JSON.stringify([companyDoc])
    });

    const data = validateResponse(await parseSolrResponse(res, "company upsert"), "company upsert");
    console.log(`? Company "${companyDoc.company}" upserted to SOLR company core.`);
    return data;
  }, "company upsert");
}

export async function queryCompanySOLR(companyQuery) {
  const AUTH = getAuth();
  const params = new URLSearchParams({
    q: companyQuery,
    rows: 10,
    wt: "json"
  });

  return withRetry(async () => {
    const res = await fetch(`${SOLR_COMPANY_URL}/select?${params}`, {
      timeout: TIMEOUT,
      headers: {
        "Authorization": "Basic " + Buffer.from(AUTH).toString("base64"),
        "User-Agent": "job_seeker_ro_spider"
      }
    });

    const data = validateResponse(await parseSolrResponse(res, "company query"), "company query");
    if (!data.response) throw new Error("SOLR company query response missing response field");
    return data.response;
  }, "company query");
}

export async function deleteJobsByCIF(cif) {
  const AUTH = getAuth();
  const params = new URLSearchParams({ commit: "true" });

  return withRetry(async () => {
    const deleteQuery = JSON.stringify({
      delete: { query: `cif:${cif}` }
    });

    const res = await fetch(`${SOLR_URL}/update?${params}`, {
      method: "POST",
      timeout: TIMEOUT,
      headers: {
        "Authorization": "Basic " + Buffer.from(AUTH).toString("base64"),
        "Content-Type": "application/json",
        "User-Agent": "job_seeker_ro_spider"
      },
      body: deleteQuery
    });

    const data = validateResponse(await parseSolrResponse(res, "delete"), "delete");
    console.log("? Jobs deleted from SOLR.");
    return data;
  }, "delete");
}

export async function deleteJobByUrl(url) {
  const AUTH = getAuth();
  const params = new URLSearchParams({ commit: "true" });
  const escapedUrl = url.replace(/"/g, '\\"');

  return withRetry(async () => {
    const deleteQuery = JSON.stringify({
      delete: { query: `url:"${escapedUrl}"` }
    });

    const res = await fetch(`${SOLR_URL}/update?${params}`, {
      method: "POST",
      timeout: TIMEOUT,
      headers: {
        "Authorization": "Basic " + Buffer.from(AUTH).toString("base64"),
        "Content-Type": "application/json",
        "User-Agent": "job_seeker_ro_spider"
      },
      body: deleteQuery
    });

    const data = validateResponse(await parseSolrResponse(res, "delete url"), "delete url");
    return data;
  }, "delete url");
}

export async function upsertJobs(jobs) {
  const AUTH = getAuth();
  const params = new URLSearchParams({ commit: "true" });

  return withRetry(async () => {
    const body = JSON.stringify(jobs);

    const res = await fetch(`${SOLR_URL}/update?${params}`, {
      method: "POST",
      timeout: TIMEOUT,
      headers: {
        "Authorization": "Basic " + Buffer.from(AUTH).toString("base64"),
        "Content-Type": "application/json",
        "User-Agent": "job_seeker_ro_spider"
      },
      body
    });

    const data = validateResponse(await parseSolrResponse(res, "upsert"), "upsert");
    console.log(`? Upserted ${jobs.length} jobs to SOLR.`);
    return data;
  }, "upsert");
}

async function checkUrl(url) {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      timeout: TIMEOUT,
      headers: { "User-Agent": "job_seeker_ro_spider" }
    });
    return { url, status: res.status, valid: res.ok };
  } catch (err) {
    return { url, status: 0, valid: false, error: err.message };
  }
}

async function runVerification(cif) {
  console.log("=== Verify SOLR Jobs ===\n");

  const result = await querySOLR(cif);
  console.log(`Total jobs in SOLR for CIF ${cif}: ${result.numFound}`);

  console.log("\nFirst 5 jobs:");
  result.docs.slice(0, 5).forEach((job, i) => {
    console.log(`${i+1}. ${job.title} (${job.location?.join(', ')}) - ${job.workmode}`);
  });

  if (fs.existsSync("jobs_existing.json")) {
    console.log("\n=== Verify existing URLs ===\n");
    const existing = JSON.parse(fs.readFileSync("jobs_existing.json", "utf-8"));
    const existingJobs = existing.jobs || [];
    console.log(`Checking ${existingJobs.length} URLs...`);

    const invalidUrls = [];
    for (let i = 0; i < existingJobs.length; i++) {
      const job = existingJobs[i];
      const res = await checkUrl(job.url);
      console.log(`[${i+1}/${existingJobs.length}] ${res.status > 0 ? res.status : 'ERR'} - ${job.url}`);
      if (!res.valid) invalidUrls.push(job.url);
    }

    if (invalidUrls.length > 0) {
      console.log(`\n?? ${invalidUrls.length} invalid URLs found - deleting from SOLR...`);
      for (const url of invalidUrls) {
        await deleteJobByUrl(url);
      }
      console.log(`? Deleted ${invalidUrls.length} invalid jobs from SOLR`);
    }

    if (invalidUrls.length === 0) {
      console.log("\n? All URLs valid - deleting jobs_existing.json");
      fs.unlinkSync("jobs_existing.json");
    } else {
      console.log("?? Keeping jobs_existing.json for reference");
    }
  }
}

async function runExtract(cif) {
  console.log("=== Extract existing jobs from SOLR ===\n");

  try {
    const result = await querySOLR(cif);
    console.log(`Found ${result.numFound} existing jobs in SOLR for CIF ${cif}`);

    if (result.numFound === 0) {
      console.log("No existing jobs to backup.");
      return;
    }

    const backup = {
      extractedAt: new Date().toISOString(),
      cif: cif,
      count: result.numFound,
      jobs: result.docs
    };

    fs.writeFileSync("jobs_existing.json", JSON.stringify(backup, null, 2), "utf-8");
    console.log("\n? Saved existing jobs to jobs_existing.json\n");
  } catch (err) {
    console.error("Failed to extract existing jobs:", err.message);
    process.exit(1);
  }
}

async function runCompanyQuery(args) {
  console.log("=== Query Company in SOLR ===\n");

  const query = args[1] || "company:FREQUENTIS*";
  console.log(`Query: ${query}`);

  const result = await queryCompanySOLR(query);
  console.log(`Found ${result.numFound} companies`);

  if (result.docs?.length) {
    console.log("\nFirst company:");
    console.log(JSON.stringify(result.docs[0], null, 2));
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);

  if (args.includes("extract")) {
    const cif = args[1] || null;
    if (!cif) {
      console.error("Error: CIF required. Usage: node solr.js extract <CIF>");
      process.exit(1);
    }
    await runExtract(cif);
  } else if (args.includes("company")) {
    await runCompanyQuery(args);
  } else {
    const cif = args[0] || null;
    if (!cif) {
      console.error("Error: CIF required. Usage: node solr.js <CIF>");
      process.exit(1);
    }
    await runVerification(cif);
  }
}
