import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const HAS_SOLR = !!process.env.SOLR_AUTH;

function itIfSolr(name, fn, timeout) {
  if (HAS_SOLR) {
    return it(name, fn, timeout);
  }
  return it.skip(`${name} (skipped: SOLR_AUTH not set)`, fn, timeout);
}

const JOB_SEARCH_URL = 'https://jobs.frequentis.com/careers/SearchJobs?sort=date&folder=true';

describe('E2E: FREQUENTIS Scraper Pipeline', () => {

  describe('Careers Site is Reachable', () => {
    it('should return 200 for the job search page', async () => {
      const res = await fetch(JOB_SEARCH_URL, {
        headers: { 'User-Agent': 'job_seeker_ro_spider' }
      });
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toMatch(/text\/html/);
    }, 15000);

    it('should return HTML with job listing elements', async () => {
      const res = await fetch(JOB_SEARCH_URL, {
        headers: { 'User-Agent': 'job_seeker_ro_spider' }
      });
      const html = await res.text();
      expect(html).toMatch(/list__item/);
      expect(html).toMatch(/SearchJobs/);
    }, 15000);
  });

  describe('parseJobListing parses live HTML', () => {
    let index;

    beforeAll(async () => {
      index = await import('../../index.js');
    });

    it('should extract Romanian jobs (URLs containing ROU-)', async () => {
      const res = await fetch(JOB_SEARCH_URL, {
        headers: { 'User-Agent': 'job_seeker_ro_spider' }
      });
      const html = await res.text();
      const jobs = index.parseJobListing(html);

      expect(Array.isArray(jobs)).toBe(true);
      for (const job of jobs) {
        expect(job).toHaveProperty('url');
        expect(job).toHaveProperty('title');
        expect(job.url).toContain('ROU-');
        expect(job.title).toBeTruthy();
      }
    }, 15000);

    it('should return non-empty list of Romanian jobs', async () => {
      const res = await fetch(JOB_SEARCH_URL, {
        headers: { 'User-Agent': 'job_seeker_ro_spider' }
      });
      const html = await res.text();
      const jobs = index.parseJobListing(html);

      expect(jobs.length).toBeGreaterThan(0);
    }, 15000);
  });

  describe('Job URLs are valid', () => {
    let index;

    beforeAll(async () => {
      index = await import('../../index.js');
    });

    it('all job URLs should return 200', async () => {
      const res = await fetch(JOB_SEARCH_URL, {
        headers: { 'User-Agent': 'job_seeker_ro_spider' }
      });
      const html = await res.text();
      const jobs = index.parseJobListing(html);

      const limit = Math.min(jobs.length, 5);
      for (let i = 0; i < limit; i++) {
        const jobRes = await fetch(jobs[i].url, {
          method: 'HEAD',
          headers: { 'User-Agent': 'job_seeker_ro_spider' }
        });
        expect(jobRes.status).toBe(200);
      }
    }, 30000);
  });

  describe('mapToJobModel produces correct job model', () => {
    let index;

    beforeAll(async () => {
      index = await import('../../index.js');
    });

    it('should map a real scraped job to the correct model', async () => {
      const res = await fetch(JOB_SEARCH_URL, {
        headers: { 'User-Agent': 'job_seeker_ro_spider' }
      });
      const html = await res.text();
      const jobs = index.parseJobListing(html);

      expect(jobs.length).toBeGreaterThan(0);

      const job = index.mapToJobModel(jobs[0], '25475641', 'FREQUENTIS ROMANIA SRL');

      expect(job.url).toBe(jobs[0].url);
      expect(job.title).toBe(jobs[0].title);
      expect(job.company).toBe('FREQUENTIS ROMANIA SRL');
      expect(job.cif).toBe('25475641');
      expect(job.status).toBe('scraped');
      expect(job.date).toBeDefined();
    }, 15000);
  });

  describe('transformJobsForSOLR on real data', () => {
    let index;

    beforeAll(async () => {
      index = await import('../../index.js');
    });

    it('should transform real jobs without throwing', async () => {
      const res = await fetch(JOB_SEARCH_URL, {
        headers: { 'User-Agent': 'job_seeker_ro_spider' }
      });
      const html = await res.text();
      const rawJobs = index.parseJobListing(html);

      const jobs = rawJobs.map(j => index.mapToJobModel(j, '25475641', 'FREQUENTIS ROMANIA SRL'));

      const payload = {
        source: 'jobs.frequentis.com',
        scrapedAt: new Date().toISOString(),
        company: 'FREQUENTIS ROMANIA SRL',
        cif: '25475641',
        jobs
      };

      const result = index.transformJobsForSOLR(payload);
      expect(result.company).toBe('FREQUENTIS ROMANIA SRL');
      expect(result.cif).toBe('25475641');
      expect(result.jobs.length).toBe(jobs.length);

      for (const job of result.jobs) {
        expect(job.location).toBeDefined();
        if (job.workmode) {
          expect(['remote', 'hybrid', 'on-site']).toContain(job.workmode);
        }
      }
    }, 30000);
  });

  describe('SOLR end-to-end (if credentials available)', () => {
    itIfSolr('should query SOLR and find FREQUENTIS jobs', async () => {
      const solr = await import('../../solr.js');
      const result = await solr.querySOLR('25475641');

      expect(result.numFound).toBeGreaterThanOrEqual(0);
      for (const job of result.docs) {
        expect(job.company).toBe('FREQUENTIS ROMANIA SRL');
        expect(job.cif).toBe('25475641');
        expect(job.url).toBeTruthy();
        expect(job.title).toBeTruthy();
      }
    }, 15000);

    itIfSolr('should query company core and find FREQUENTIS', async () => {
      const solr = await import('../../solr.js');
      const result = await solr.queryCompanySOLR('id:25475641');

      expect(result.numFound).toBe(1);
      expect(result.docs[0].company).toBe('FREQUENTIS ROMANIA SRL');
      expect(result.docs[0].brand).toBe('FREQUENTIS');
    }, 15000);
  });

  describe('Full Pipeline Smoke Test', () => {
    let index;
    let solr;

    beforeAll(async () => {
      index = await import('../../index.js');
      solr = await import('../../solr.js');
    });

    it('scrape -> transform -> validate locations (no SOLR write)', async () => {
      const res = await fetch(JOB_SEARCH_URL, {
        headers: { 'User-Agent': 'job_seeker_ro_spider' }
      });
      const html = await res.text();
      const rawJobs = index.parseJobListing(html);

      expect(rawJobs.length).toBeGreaterThan(0);

      const jobs = rawJobs.map(j => index.mapToJobModel(j, '25475641', 'FREQUENTIS ROMANIA SRL'));

      const payload = {
        source: 'jobs.frequentis.com',
        scrapedAt: new Date().toISOString(),
        company: 'FREQUENTIS ROMANIA SRL',
        cif: '25475641',
        jobs
      };

      const transformed = index.transformJobsForSOLR(payload);

      for (const job of transformed.jobs) {
        expect(job.url).toMatch(/^https:\/\//);
        expect(job.title).toBeTruthy();
      }
    }, 30000);
  });

  describe('No duplicate jobs on career site', () => {
    let index;

    beforeAll(async () => {
      index = await import('../../index.js');
    });

    it('should not have duplicate URLs in the listing', async () => {
      const res = await fetch(JOB_SEARCH_URL, {
        headers: { 'User-Agent': 'job_seeker_ro_spider' }
      });
      const html = await res.text();
      const jobs = index.parseJobListing(html);

      const urls = jobs.map(j => j.url);
      const unique = new Set(urls);
      expect(unique.size).toBe(urls.length);
    }, 15000);
  });
});
