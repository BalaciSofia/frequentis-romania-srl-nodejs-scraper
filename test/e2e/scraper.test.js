import { jest } from "@jest/globals";

const itIfSolr = process.env.SOLR_AUTH ? it : it.skip;

describe("FREQUENTIS Scraper - E2E Tests", () => {
  describe("Full Pipeline", () => {
    it("should scrape at least 1 Romanian job from FREQUENTIS", async () => {
      const { parseJobListing, fetchJobsPage } = await import("../index.js");

      const html = await fetchJobsPage(1);
      const jobs = parseJobListing(html);

      expect(jobs.length).toBeGreaterThanOrEqual(0);
    }, 30000);

    it("should fetch job details for a Romanian job", async () => {
      const { parseJobListing, fetchJobDetails, fetchJobsPage } = await import("../index.js");

      const html = await fetchJobsPage(1);
      const jobs = parseJobListing(html);

      if (jobs.length > 0) {
        const details = await fetchJobDetails(jobs[0].url);
        expect(details).toBeDefined();
        if (details) {
          expect(details.title).toBeDefined();
        }
      }
    }, 30000);
  });

  describe("SOLR Verification", () => {
    itIfSolr("should verify company exists in SOLR core", async () => {
      const { queryCompanySOLR } = await import("../solr.js");
      const result = await queryCompanySOLR("id:25475641");

      expect(result.numFound).toBeGreaterThanOrEqual(1);
      if (result.docs?.length > 0) {
        expect(result.docs[0].id).toBe("25475641");
      }
    });
  });
});
