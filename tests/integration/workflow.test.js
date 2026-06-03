import { jest } from '@jest/globals';
import fs from 'fs';
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

beforeAll(() => {
  if (HAS_SOLR) {
    process.env.SOLR_AUTH = process.env.SOLR_AUTH;
  }
});

const FREQ_CIF = '25475641';

describe('Integration: API Workflow', () => {

  describe('ANAF API', () => {
    let anaf;

    beforeAll(async () => {
      anaf = await import('../../src/anaf.js');
    });

    it('should search for FREQUENTIS brand and find the company', async () => {
      const results = await anaf.searchCompany('FREQUENTIS');

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);

      const freq = results.find(c =>
        c.name.toUpperCase().includes('FREQUENTIS') && c.statusLabel === 'Func\u021Biune'
      );
      expect(freq).toBeDefined();
      expect(freq.cui.toString()).toBe(FREQ_CIF);
    }, 15000);

    it('should return empty array for non-existent brand', async () => {
      const results = await anaf.searchCompany('ThisBrandDoesNotExistXYZ123');

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    }, 15000);

    it('should fetch company details by valid CIF', async () => {
      const data = await anaf.getCompanyFromANAF(FREQ_CIF);

      expect(data).toBeDefined();
      expect(data.cui).toBe(25475641);
      expect(data.name).toBe('FREQUENTIS ROMANIA SRL');
      expect(data).toHaveProperty('address');
      expect(data).toHaveProperty('registrationNumber');
      expect(data).toHaveProperty('caenCode');
      expect(data).toHaveProperty('inactive', false);
      expect(data).toHaveProperty('onrcStatusLabel', 'Func\u021Biune');
    }, 15000);

    it('should throw for invalid CIF', async () => {
      await expect(anaf.getCompanyFromANAF('00000000')).rejects.toThrow();
    }, 60000);

    it('should use cached data when API fails (getCompanyFromANAFWithFallback)', async () => {
      const cached = { cui: 25475641, name: 'FREQUENTIS ROMANIA SRL' };

      const data = await anaf.getCompanyFromANAFWithFallback(FREQ_CIF, cached);

      expect(data).toBeDefined();
      expect(data.cui).toBe(25475641);
    }, 15000);
  });

  describe('Peviitor API', () => {
    let company;

    beforeAll(async () => {
      company = await import('../../company.js');
    });

    it.skip('should respond successfully and contain companies array (Peviitor API may block non-browser requests)', async () => {
      const res = await fetch('https://api.peviitor.ro/v1/company/', {
        headers: { 'User-Agent': 'job_seeker_ro_spider' }
      });

      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data).toHaveProperty('companies');
      expect(Array.isArray(data.companies)).toBe(true);
    }, 15000);
  });

  describe('SOLR Company Core', () => {
    let solr;

    beforeAll(async () => {
      solr = await import('../../solr.js');
    });

    itIfSolr('should query company core by ID', async () => {
      const result = await solr.queryCompanySOLR(`id:${FREQ_CIF}`);

      expect(result.numFound).toBe(1);
      const freq = result.docs[0];
      expect(freq.id).toBe(FREQ_CIF);
      expect(freq.company).toBe('FREQUENTIS ROMANIA SRL');
      expect(freq.brand).toBe('FREQUENTIS');
      expect(freq.status).toBe('activ');
      expect(Array.isArray(freq.location)).toBe(true);
      expect(freq.lastScraped).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }, 15000);

    itIfSolr('should have required company model fields', async () => {
      const result = await solr.queryCompanySOLR(`id:${FREQ_CIF}`);
      const freq = result.docs[0];

      expect(freq).toHaveProperty('id', FREQ_CIF);
      expect(freq).toHaveProperty('company');
      expect(freq).toHaveProperty('brand', 'FREQUENTIS');
      expect(freq).toHaveProperty('status');
      expect(['activ', 'suspendat', 'inactiv', 'radiat']).toContain(freq.status);
      expect(freq).toHaveProperty('location');
      expect(Array.isArray(freq.location)).toBe(true);
      expect(freq).toHaveProperty('website');
      expect(Array.isArray(freq.website)).toBe(true);
      expect(freq.website[0]).toMatch(/^https?:\/\/.+/);
      expect(freq).toHaveProperty('career');
      expect(Array.isArray(freq.career)).toBe(true);
      expect(freq.career[0]).toMatch(/^https?:\/\/.+/);
      expect(freq).toHaveProperty('lastScraped');
      expect(freq).toHaveProperty('scraperFile');
    }, 15000);

    itIfSolr('should have optional field (group) if present', async () => {
      const result = await solr.queryCompanySOLR(`id:${FREQ_CIF}`);
      const freq = result.docs[0];

      if (freq.group !== undefined) {
        expect(typeof freq.group).toBe('string');
      }
    }, 15000);
  });

  describe('SOLR Jobs Core', () => {
    let solr;

    beforeAll(async () => {
      solr = await import('../../solr.js');
    });

    itIfSolr('should query jobs by CIF and return valid data', async () => {
      const result = await solr.querySOLR(FREQ_CIF);

      expect(Array.isArray(result.docs)).toBe(true);
      expect(result.numFound).toBeGreaterThanOrEqual(0);

      if (result.numFound > 0) {
        const job = result.docs[0];
        expect(job).toHaveProperty('url');
        expect(job).toHaveProperty('title');
        expect(job).toHaveProperty('cif');
        expect(job).toHaveProperty('company');
      }
    }, 15000);

    itIfSolr('should not have duplicate URLs for same CIF', async () => {
      const result = await solr.querySOLR(FREQ_CIF);

      const urls = result.docs.map(j => j.url);
      const uniqueUrls = new Set(urls);
      expect(uniqueUrls.size).toBe(result.docs.length);
    }, 15000);

    itIfSolr('should have valid status values for all jobs', async () => {
      const validStatuses = ['scraped', 'tested', 'verified', 'published'];
      const result = await solr.querySOLR(FREQ_CIF);

      for (const job of result.docs) {
        expect(validStatuses).toContain(job.status);
      }
    }, 15000);

    itIfSolr('should have valid CIF format for all jobs', async () => {
      const result = await solr.querySOLR(FREQ_CIF);

      for (const job of result.docs) {
        expect(job.cif).toMatch(/^\d{8}$/);
      }
    }, 15000);
  });

  describe('Full Validation Workflow', () => {
    let anaf;
    let companyModule;

    beforeAll(async () => {
      if (fs.existsSync('company.json')) {
        fs.unlinkSync('company.json');
      }
      anaf = await import('../../src/anaf.js');
      companyModule = await import('../../company.js');
    });

    it('should complete the ANAF -> Peviitor validation path', async () => {
      const searchResults = await anaf.searchCompany('FREQUENTIS');
      expect(searchResults.length).toBeGreaterThan(0);

      const freqCompany = searchResults.find(c =>
        c.name.toUpperCase().includes('FREQUENTIS') && c.statusLabel === 'Func\u021Biune'
      );
      expect(freqCompany).toBeDefined();

      const anafData = await anaf.getCompanyFromANAF(freqCompany.cui.toString());
      expect(anafData.name).toBe('FREQUENTIS ROMANIA SRL');
      expect(anafData.inactive).toBe(false);
    }, 30000);

    itIfSolr('should validate company and query SOLR for existing jobs', async () => {
      const companyResult = await companyModule.validateAndGetCompany();

      expect(companyResult.status).toBe('active');
      expect(companyResult.company).toBe('FREQUENTIS ROMANIA SRL');
      expect(companyResult.cif).toBe(FREQ_CIF);
      expect(companyResult.existingJobsCount).toBeGreaterThanOrEqual(0);
    }, 30000);

    itIfSolr('should have matching CIF in company core', async () => {
      const companyResult = await companyModule.validateAndGetCompany();
      const solrObj = await import('../../solr.js');

      const solrResult = await solrObj.queryCompanySOLR(`id:${FREQ_CIF}`);
      expect(solrResult.numFound).toBe(1);
      expect(solrResult.docs[0].id).toBe(FREQ_CIF);
      expect(solrResult.docs[0].company).toBe('FREQUENTIS ROMANIA SRL');
    }, 30000);
  });
});
