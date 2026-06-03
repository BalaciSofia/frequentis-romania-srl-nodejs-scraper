# Files in this project

| File | Description |
|------|-------------|
| `index.js` | Main scraper entry point |
| `company.js` | Company validation via ANAF + Peviitor + SOLR |
| `demoanaf.js` | CLI wrapper for src/anaf.js |
| `solr.js` | SOLR operations (query, upsert, delete, company) |
| `company.json` | Cached company data (fallback when ANAF is down) |
| `src/anaf.js` | ANAF API core module (search + company details) |
| `package.json` | Dependencies and scripts |
| `AGENTS.md` | Rules for AI agents |
| `CHANGELOG.md` | Version history |
| `CONTRIBUTING.md` | Contribution guidelines |
| `ISSUES.md` | Issue templates |
| `LICENSE` | MIT License |
| `README.md` | Project documentation |
| `SECURITY.md` | Security policy |
| `TOPICS.md` | GitHub topics |
| `UPDATE-REPO-ABOUT.md` | Repo about section settings |
| `company-model.md` | Company data model documentation |
| `job-model.md` | Job data model documentation |
| `delete_request.json` | SOLR delete request template |
| `.gitignore` | Git ignore rules |
| `.github/workflows/scrape.yml` | Daily scraping workflow |
| `.github/workflows/test.yml` | Test automation workflow |
| `tests/unit/` | Unit tests |
| `tests/integration/` | Integration tests |
| `tests/e2e/` | End-to-end tests |
