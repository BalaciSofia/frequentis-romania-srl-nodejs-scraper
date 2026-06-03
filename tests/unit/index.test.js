import { jest } from '@jest/globals';

describe('index.js Component Tests', () => {
  let index;

  beforeAll(async () => {
    index = await import('../../index.js');
  });

  describe('transformJobsForSOLR', () => {
    it('should filter locations to only Romanian cities', () => {
      const payload = {
        jobs: [
          { url: 'https://test.com/1', title: 'Job 1', location: ['Romania'] },
          { url: 'https://test.com/2', title: 'Job 2', location: ['Cluj-Napoca'] },
          { url: 'https://test.com/3', title: 'Job 3', location: ['Bulgaria'] },
          { url: 'https://test.com/4', title: 'Job 4', location: ['Cluj-Napoca'] },
          { url: 'https://test.com/5', title: 'Job 5', location: [] }
        ]
      };

      const result = index.transformJobsForSOLR(payload);

      expect(result.jobs[0].location).toEqual(['România']);
      expect(result.jobs[1].location).toEqual(['Cluj-Napoca']);
      expect(result.jobs[2].location).toEqual(['România']);
      expect(result.jobs[3].location).toEqual(['Cluj-Napoca']);
      expect(result.jobs[4].location).toEqual(['România']);
    });

    it('should keep company uppercase', () => {
      const payload = {
        source: 'jobs.frequentis.com',
        company: 'frequentis romania srl',
        cif: '25475641',
        jobs: [
          { url: 'https://test.com/1', title: 'Job 1', company: 'frequentis romania', cif: '25475641' }
        ]
      };

      const result = index.transformJobsForSOLR(payload);

      expect(result.company).toBe('FREQUENTIS ROMANIA SRL');
    });

    it('should normalize workmode values', () => {
      const payload = {
        jobs: [
          { url: 'https://test.com/1', title: 'Job 1', workmode: 'Remote' },
          { url: 'https://test.com/2', title: 'Job 2', workmode: 'ON-SITE' },
          { url: 'https://test.com/3', title: 'Job 3', workmode: 'Hybrid' },
          { url: 'https://test.com/4', title: 'Job 4', workmode: 'hybrid' }
        ]
      };

      const result = index.transformJobsForSOLR(payload);

      expect(result.jobs[0].workmode).toBe('remote');
      expect(result.jobs[1].workmode).toBe('on-site');
      expect(result.jobs[2].workmode).toBe('hybrid');
      expect(result.jobs[3].workmode).toBe('hybrid');
    });

    it('should handle empty jobs array', () => {
      const result = index.transformJobsForSOLR({ jobs: [] });
      expect(result.jobs).toEqual([]);
    });
  });

  describe('mapToJobModel', () => {
    it('should map raw job to job model format', () => {
      const rawJob = {
        url: 'https://jobs.frequentis.com/careers/JobDetail/ROU-Test/123',
        title: 'Senior Developer',
        location: ['Cluj-Napoca'],
        tags: ['Java', 'Spring'],
        workmode: 'hybrid'
      };

      const COMPANY_NAME = 'FREQUENTIS ROMANIA SRL';
      const COMPANY_CIF = '25475641';

      const result = index.mapToJobModel(rawJob, COMPANY_CIF, COMPANY_NAME);

      expect(result.url).toBe(rawJob.url);
      expect(result.title).toBe(rawJob.title);
      expect(result.company).toBe(COMPANY_NAME);
      expect(result.cif).toBe(COMPANY_CIF);
      expect(result.location).toEqual(rawJob.location);
      expect(result.tags).toEqual(rawJob.tags);
      expect(result.workmode).toBe(rawJob.workmode);
      expect(result.status).toBe('scraped');
      expect(result.date).toBeDefined();
    });

    it('should remove undefined fields', () => {
      const rawJob = {
        url: 'https://test.com/1',
        title: 'Job 1'
      };

      const result = index.mapToJobModel(rawJob, '25475641');

      expect(result.location).toBeUndefined();
      expect(result.tags).toBeUndefined();
      expect(result.workmode).toBeUndefined();
    });

    it('should handle missing title', () => {
      const rawJob = { url: 'https://test.com/1' };

      const result = index.mapToJobModel(rawJob, '25475641');

      expect(result.title).toBeUndefined();
      expect(result.url).toBe('https://test.com/1');
    });
  });

  describe('parseJobListing', () => {
    it('should parse HTML and return Romanian jobs', () => {
      const mockHtml = `
        <html><body>
          <div class="list__item__text__title">
            <a href="https://jobs.frequentis.com/careers/JobDetail/ROU-Java-Developer/3425">Java Developer</a>
          </div>
          <div class="list__item__text__title">
            <a href="https://jobs.frequentis.com/careers/JobDetail/VIE-Engineer/3431">Engineer Vienna</a>
          </div>
        </body></html>
      `;

      const jobs = index.parseJobListing(mockHtml);

      expect(jobs).toHaveLength(1);
      expect(jobs[0].title).toBe('Java Developer');
      expect(jobs[0].url).toContain('ROU-');
    });

    it('should handle empty job list', () => {
      const jobs = index.parseJobListing('<html></html>');
      expect(jobs).toEqual([]);
    });
  });
});
