# job_seeker_ro_spider - FREQUENTIS Careers Romania Scraper

[![WebScraper FREQUENTIS to Peviitor](https://github.com/BalaciSofia/frequentis-romania-srl-nodejs-scraper/actions/workflows/scrape.yml/badge.svg)](https://github.com/BalaciSofia/frequentis-romania-srl-nodejs-scraper/actions/workflows/scrape.yml)
[![Automation Tests](https://github.com/BalaciSofia/frequentis-romania-srl-nodejs-scraper/actions/workflows/test.yml/badge.svg)](https://github.com/BalaciSofia/frequentis-romania-srl-nodejs-scraper/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![JavaScript](https://img.shields.io/badge/javascript-ESM-F7DF1E?logo=javascript&logoColor=black)](https://ecma-international.org/)
[![Node.js](https://img.shields.io/badge/node-24-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)

**job_seeker_ro_spider** - un scraper pentru job-urile FREQUENTIS Romania. Extrage anunturile de pe [FREQUENTIS Careers Romania](https://jobs.frequentis.com) si le publica in [peviitor.ro](https://peviitor.ro) prin API-ul SOLR.

## Overview

Proiectul automatizeaza colectarea zilnica a job-urilor FREQUENTIS din Romania, mentinand board-ul peviitor.ro la zi cu cele mai recente oportunitati de cariera.

## Features

- Extrage job-uri din pagina de cariere FREQUENTIS (Avature ATS)
- Valideaza compania via ANAF (CUI, status activ/inactiv, adresa completa)
- Cross-valideaza cu Peviitor API
- Stocheaza in SOLR (job core + company core)
- GitHub Actions: scrape zilnic + testare automata (unit, integration, e2e)
- Se identifica prin User-Agent: `job_seeker_ro_spider`

## Project Structure

```
??? index.js           # Main scraper entry point
??? company.js         # Company validation via ANAF + Peviitor + SOLR
??? demoanaf.js        # CLI wrapper for src/anaf.js
??? src/anaf.js        # ANAF API core module (search + company details)
??? solr.js            # SOLR operations (query, upsert, delete, company)
??? company.json       # Cached company data (fallback when ANAF is down)
??? test/              # Test suite
?   ??? unit/          # Unit tests (mocked APIs)
?   ??? integration/   # Integration tests (ANAF + SOLR live)
?   ??? e2e/           # E2E tests (full pipeline, real FREQUENTIS site)
??? .github/workflows/
    ??? scrape.yml     # Daily scraping at 6 AM UTC
    ??? test.yml       # Automation Tests on push/PR
??? package.json
```

## Setup

### Prerequisites

- Node.js 24+
- npm

### Installation

```bash
npm install
```

### Configuration

Set the `SOLR_AUTH` environment variable with your Solr credentials:

```bash
export SOLR_AUTH="username:password"
```

## Usage

### Run the Scraper

```bash
npm run scrape
```

### Run Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

## Workflows

### Daily Scraping

The `scrape.yml` workflow runs daily at 6 AM UTC via GitHub Actions. It:
1. Validates company data via ANAF
2. Scrapes current job listings from FREQUENTIS Careers
3. Updates Solr with new/removed jobs
4. Uploads job data as artifacts

### Test Automation

The `test.yml` workflow runs on every push and pull request. It:
1. Ensures FREQUENTIS exists in the company core
2. Runs unit, integration, and E2E tests
3. Validates data integrity in Solr

## Company Details

- **Legal Name**: FREQUENTIS ROMANIA SRL
- **CIF**: 25475641
- **Registration**: J2009000957129
- **CAEN**: 6210 - Activitati de realizare a soft-ului la comanda
- **Location**: Cluj-Napoca, Romania

## Robots.txt Policy

Acest scraper respecta regulile din [robots.txt](https://www.frequentis.com/robots.txt) al site-ului FREQUENTIS.

Puncte cheie:
- Se acceseaza doar paginile publice de job-uri
- Rate limiting: 1 cerere/10 job-uri, delay intre pagini
- Un singur User-Agent identificabil (`job_seeker_ro_spider`)
- Fara concurenta sau paralelism agresiv

## License

Copyright (c) 2024-2026 BALACI SOFIA

Licensed under the [MIT License](LICENSE).

## Managed By

This project is managed by [ASOCIATIA OPORTUNITATI SI CARIERE](https://oportunitatisicariere.ro) and used as a web scraper for the [peviitor.ro](https://peviitor.ro) job board project.
