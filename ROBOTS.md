# Robots.txt Analysis - jobs.frequentis.com

## Source
Based on the public robots.txt at https://www.frequentis.com/robots.txt

## Rules

The main frequentis.com robots.txt covers:
- Disallow: /core/, /profiles/, /admin/, /search/, /user/*
- Allow: CSS, JS, images

The careers subdomain (jobs.frequentis.com) uses Avature ATS and does not have a separate robots.txt.

## Scraper Compliance

- **User-Agent**: `job_seeker_ro_spider` - clearly identifiable
- **Rate Limiting**: 1 request per job, 1.5s delay between pages
- **Scope**: Only Romanian job listings (ROU-*)
- **Respect**: We only access public job listing and detail pages
- **Purpose**: Legitimate job data aggregation for peviitor.ro
