import { jest } from "@jest/globals";

describe("FREQUENTIS Scraper - Unit Tests", () => {
  describe("parseJobListing", () => {
    it("should extract Romanian job URLs from HTML", async () => {
      const { parseJobListing } = await import("../index.js");

      const mockHtml = `
        <html>
        <body>
          <div class="list__item__text__title">
            <a href="https://jobs.frequentis.com/careers/JobDetail/ROU-Java-Developer/3425">Java Developer</a>
          </div>
          <div class="list__item__text__title">
            <a href="https://jobs.frequentis.com/careers/JobDetail/VIE-Engineer/3431">Engineer Vienna</a>
          </div>
        </body>
        </html>
      `;

      const jobs = parseJobListing(mockHtml);
      expect(jobs).toHaveLength(1);
      expect(jobs[0].title).toBe("Java Developer");
      expect(jobs[0].url).toContain("ROU-");
    });

    it("should return empty array for non-Romanian jobs", () => {
      const { parseJobListing } = await import("../index.js");

      const mockHtml = `
        <html>
        <body>
          <div class="list__item__text__title">
            <a href="https://jobs.frequentis.com/careers/JobDetail/VIE-Engineer/3431">Engineer</a>
          </div>
        </body>
        </html>
      `;

      const jobs = parseJobListing(mockHtml);
      expect(jobs).toHaveLength(0);
    });
  });

  describe("mapToJobModel", () => {
    it("should map raw job to SOLR model", async () => {
      const { mapToJobModel } = await import("../index.js");

      const rawJob = {
        url: "https://jobs.frequentis.com/careers/JobDetail/ROU-Java-Developer/3425",
        title: "Java Developer",
        location: ["Cluj-Napoca"],
        workmode: "hybrid",
        tags: ["java", "microservices"]
      };

      const result = mapToJobModel(rawJob, "25475641", "FREQUENTIS ROMANIA SRL");

      expect(result.url).toBe(rawJob.url);
      expect(result.title).toBe("Java Developer");
      expect(result.cif).toBe("25475641");
      expect(result.company).toBe("FREQUENTIS ROMANIA SRL");
      expect(result.location).toEqual(["Cluj-Napoca"]);
      expect(result.status).toBe("scraped");
      expect(result.date).toBeDefined();
    });

    it("should remove undefined fields", async () => {
      const { mapToJobModel } = await import("../index.js");

      const rawJob = {
        url: "https://jobs.frequentis.com/careers/JobDetail/ROU-Test/123",
        title: "Test"
      };

      const result = mapToJobModel(rawJob, "25475641", "FREQUENTIS ROMANIA SRL");

      expect(result.location).toBeUndefined();
      expect(result.tags).toBeUndefined();
      expect(result.workmode).toBeUndefined();
    });
  });

  describe("transformJobsForSOLR", () => {
    it("should uppercase company name", async () => {
      const { transformJobsForSOLR } = await import("../index.js");

      const payload = {
        company: "Frequentis Romania SRL",
        cif: "25475641",
        jobs: [{ url: "https://test.url/job1", title: "Dev" }]
      };

      const result = transformJobsForSOLR(payload);
      expect(result.company).toBe("FREQUENTIS ROMANIA SRL");
    });

    it("should set default location to Romania", async () => {
      const { transformJobsForSOLR } = await import("../index.js");

      const payload = {
        company: "FREQUENTIS ROMANIA SRL",
        cif: "25475641",
        jobs: [{ url: "https://test.url/job1", title: "Dev", location: [] }]
      };

      const result = transformJobsForSOLR(payload);
      expect(result.jobs[0].location).toEqual(["România"]);
    });
  });
});
