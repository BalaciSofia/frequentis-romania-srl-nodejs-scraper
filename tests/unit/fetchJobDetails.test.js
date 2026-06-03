import { jest } from '@jest/globals';

const mockFetch = jest.fn();

jest.unstable_mockModule('node-fetch', () => ({
  default: mockFetch
}));

function makeHtmlResponse(html) {
  return {
    ok: true,
    text: async () => html
  };
}

function makeErrorResponse(status) {
  return {
    ok: false,
    status,
    text: async () => 'Error'
  };
}

describe('fetchJobDetails', () => {
  let index;

  beforeAll(async () => {
    process.env.SOLR_AUTH = 'test:test';
    index = await import('../../index.js');
  });

  afterAll(() => {
    delete process.env.SOLR_AUTH;
  });

  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should extract location, workmode and tags from detail page', async () => {
    const html = `<html><body>
      <span class="list__item__text__subtitle">Cluj-Napoca, Romania</span>
      <span class="job-location">Remote</span>
      <span>Hybrid</span>
      <div class="description">Java, Spring, AWS, Docker, PostgreSQL</div>
    </body></html>`;

    mockFetch.mockResolvedValue(makeHtmlResponse(html));

    const result = await index.fetchJobDetails('https://jobs.frequentis.com/careers/JobDetail/ROU-Test/123');

    expect(result).not.toBeNull();
    expect(result.location).toBeDefined();
    expect(result.location.length).toBeGreaterThan(0);
    expect(result.workmode).toBeDefined();
    expect(Array.isArray(result.tags)).toBe(true);
  });

  it('should return default location when no location found', async () => {
    const html = `<html><body>No location here</body></html>`;

    mockFetch.mockResolvedValue(makeHtmlResponse(html));

    const result = await index.fetchJobDetails('https://jobs.frequentis.com/careers/JobDetail/ROU-Test/456');

    expect(result).not.toBeNull();
    expect(result.location).toEqual(['Cluj-Napoca']);
  });

  it('should detect remote workmode', async () => {
    const html = `<html><body>
      <div class="description">This is a fully remote position</div>
    </body></html>`;

    mockFetch.mockResolvedValue(makeHtmlResponse(html));

    const result = await index.fetchJobDetails('https://jobs.frequentis.com/careers/JobDetail/ROU-Remote/789');

    expect(result).not.toBeNull();
    expect(result.workmode).toBe('remote');
  });

  it('should detect hybrid workmode', async () => {
    const html = `<html><body>
      <div class="description">Hybrid work model, 3 days in office</div>
    </body></html>`;

    mockFetch.mockResolvedValue(makeHtmlResponse(html));

    const result = await index.fetchJobDetails('https://jobs.frequentis.com/careers/JobDetail/ROU-Hybrid/101');

    expect(result).not.toBeNull();
    expect(result.workmode).toBe('hybrid');
  });

  it('should detect on-site workmode', async () => {
    const html = `<html><body>
      <div class="description">On-site position at our Cluj office</div>
    </body></html>`;

    mockFetch.mockResolvedValue(makeHtmlResponse(html));

    const result = await index.fetchJobDetails('https://jobs.frequentis.com/careers/JobDetail/ROU-Onsite/202');

    expect(result).not.toBeNull();
    expect(result.workmode).toBe('on-site');
  });

  it('should extract tags from description', async () => {
    const html = `<html><body>
      <div class="description">
        We are looking for a Java Developer with experience in JavaScript,
        Python, React, Angular, Docker, Kubernetes, AWS, and SQL.
      </div>
    </body></html>`;

    mockFetch.mockResolvedValue(makeHtmlResponse(html));

    const result = await index.fetchJobDetails('https://jobs.frequentis.com/careers/JobDetail/ROU-Dev/303');

    expect(result).not.toBeNull();
    expect(result.tags.length).toBeGreaterThan(0);
    expect(result.tags.some(t => t === 'java' || t === 'javascript')).toBe(true);
  });

  it('should not include non-matching tags', async () => {
    const html = `<html><body>
      <div class="description">Some random text about nothing in particular</div>
    </body></html>`;

    mockFetch.mockResolvedValue(makeHtmlResponse(html));

    const result = await index.fetchJobDetails('https://jobs.frequentis.com/careers/JobDetail/ROU-NoTags/404');

    expect(result).not.toBeNull();
    expect(result.tags).toEqual([]);
  });

  it('should return null on HTTP error', async () => {
    mockFetch.mockResolvedValue(makeErrorResponse(404));

    const result = await index.fetchJobDetails('https://jobs.frequentis.com/careers/JobDetail/ROU-Gone/505');

    expect(result).toBeNull();
  });

  it('should return null on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network timeout'));

    const result = await index.fetchJobDetails('https://jobs.frequentis.com/careers/JobDetail/ROU-Timeout/606');

    expect(result).toBeNull();
  });

  it('should cap tags at 20', async () => {
    const tagNames = ['java', 'javascript', 'python', 'react', 'angular', 'node',
      'aws', 'azure', 'docker', 'kubernetes', 'linux', 'agile', 'scrum',
      'rest', 'sql', 'nosql', 'devops', 'git', 'jenkins', 'test', 'ansible',
      'puppet'];

    const html = `<html><body>
      <div class="description">${tagNames.join(', ')}</div>
    </body></html>`;

    mockFetch.mockResolvedValue(makeHtmlResponse(html));

    const result = await index.fetchJobDetails('https://jobs.frequentis.com/careers/JobDetail/ROU-Tags/707');

    expect(result).not.toBeNull();
    expect(result.tags.length).toBeLessThanOrEqual(20);
  });
});

describe('parseJobListing', () => {
  let index;

  beforeAll(async () => {
    index = await import('../../index.js');
  });

  it('should handle malformed HTML gracefully', () => {
    const jobs = index.parseJobListing('not really html');
    expect(jobs).toEqual([]);
  });

  it('should handle null href', () => {
    const html = `<html><body>
      <div class="list__item__text__title">
        <a>No href attribute</a>
      </div>
    </body></html>`;

    const jobs = index.parseJobListing(html);
    expect(jobs).toEqual([]);
  });

  it('should handle non-ROU jobs', () => {
    const html = `<html><body>
      <div class="list__item__text__title">
        <a href="https://jobs.frequentis.com/careers/JobDetail/DEU-Berlin/123">Berlin Job</a>
      </div>
    </body></html>`;

    const jobs = index.parseJobListing(html);
    expect(jobs).toEqual([]);
  });

  it('should handle relative URLs', () => {
    const html = `<html><body>
      <div class="list__item__text__title">
        <a href="/careers/JobDetail/ROU-Dev/999">Dev Job</a>
      </div>
    </body></html>`;

    const jobs = index.parseJobListing(html);

    expect(jobs).toHaveLength(1);
    expect(jobs[0].url).toContain('https://jobs.frequentis.com');
  });
});
