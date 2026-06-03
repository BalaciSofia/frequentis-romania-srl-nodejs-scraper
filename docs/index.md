# Documentation

## Overview

FREQUENTIS Romania job scraper for peviitor.ro.

## Modules

- **index.js** - Main scraper: fetches jobs from jobs.frequentis.com, parses HTML, transforms to SOLR format
- **company.js** - Company validation: checks ANAF for company status, caches data
- **solr.js** - SOLR operations: query, upsert, delete jobs and company data
- **src/anaf.js** - ANAF API client: search companies and get company details

## Scraping Flow

1. Check existing jobs in SOLR for FREQUENTIS (CIF: 25475641)
2. Validate company via ANAF (active/inactive)
3. Scrape job listings from FREQUENTIS Careers (Avature ATS)
4. Filter only Romanian (ROU-*) jobs
5. Transform data to SOLR job model
6. Upsert jobs to SOLR
7. Report summary

## GitHub Actions

- **scrape.yml** - Runs daily at 6 AM UTC
- **test.yml** - Runs on push/PR; ensures company in SOLR core, runs unit/integration/e2e tests
