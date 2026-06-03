import { jest } from "@jest/globals";

const itIfSolr = process.env.SOLR_AUTH ? it : it.skip;

describe("FREQUENTIS Scraper - Integration Tests", () => {
  describe("ANAF API", () => {
    it("should fetch FREQUENTIS company data from ANAF", async () => {
      const { getCompanyFromANAF } = await import("../src/anaf.js");
      const data = await getCompanyFromANAF("25475641");

      expect(data).toBeDefined();
      expect(data.cui).toBe(25475641);
      expect(data.name).toBe("FREQUENTIS ROMANIA SRL");
    });

    it("should search for FREQUENTIS in ANAF", async () => {
      const { searchCompany } = await import("../src/anaf.js");
      const results = await searchCompany("FREQUENTIS");

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.name.includes("FREQUENTIS"))).toBe(true);
    });
  });

  describe("SOLR Operations", () => {
    itIfSolr("should query SOLR for FREQUENTIS jobs", async () => {
      const { querySOLR } = await import("../solr.js");
      const result = await querySOLR("25475641");

      expect(result).toBeDefined();
      expect(result.numFound).toBeDefined();
      expect(Array.isArray(result.docs)).toBe(true);
    });
  });
});
