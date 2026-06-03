# job_seeker_ro_spider

**job_seeker_ro_spider** - scraper pentru job-urile FREQUENTIS din Romania.

Extrage anunturile de pe [FREQUENTIS Careers](https://jobs.frequentis.com) si le publica in [peviitor.ro](https://peviitor.ro) prin API-ul SOLR.

## Identificare

Toate request-urile HTTP folosesc User-Agent-ul:

```
job_seeker_ro_spider
```

## Ce face

1. **Valideaza compania** - interogheaza API-ul public ANAF ([demoanaf.ro](https://demoanaf.ro)) dupa CIF-ul FREQUENTIS (25475641) si verifica:
   - Denumirea oficiala: FREQUENTIS ROMANIA SRL
   - Status: activ/inactiv/radiat
   - Adresa completa din registrul comertului
2. **Cross-valideaza cu Peviitor** - verifica existenta companiei in API-ul Peviitor
3. **Scrape-uieste job-urile** - extrage lista completa de job-uri din pagina HTML FREQUENTIS Careers, filtrat pe Romania
4. **Transforma datele** - normalizeaza locatiile (doar orase romanesti), tag-urile (lowercase), workmode-ul (remote/on-site/hybrid)
5. **Stocheaza in SOLR** - upsert in `job` core (job-urile) si `company` core (datele companiei cu adresa completa)

## Structura proiect

```
??? index.js           # Orchestrator principal
??? company.js         # Validare companie (ANAF + Peviitor + SOLR)
??? demoanaf.js        # CLI wrapper pentru src/anaf.js
??? src/anaf.js        # Modul ANAF API (search + company details)
??? solr.js            # Operatii SOLR (query, upsert, delete, company)
??? company.json       # Cache companie (fallback cand ANAF e down)
??? ROBOTS.md          # Analiza robots.txt si politici de scraping
??? tests/
?   ??? unit/          # Teste unitare (API-uri mock-uite)
?   ??? integration/   # Teste de integrare (ANAF + SOLR live)
?   ??? e2e/           # Teste end-to-end (pipeline complet)
??? .github/workflows/
    ??? scrape.yml     # Ruleaza zilnic la 6 AM UTC
    ??? test.yml       # Teste automate la fiecare push/PR
```

## API-uri folosite

| API | URL | Autentificare |
|---|---|---|
| FREQUENTIS Careers | `https://jobs.frequentis.com/careers/...` | Public |
| ANAF (demoanaf) | `https://demoanaf.ro/api/...` | Public |
| Peviitor | `https://api.peviitor.ro/v1/company/` | Public |
| SOLR (job core) | `https://solr.peviitor.ro/solr/job` | `SOLR_AUTH` |
| SOLR (company core) | `https://solr.peviitor.ro/solr/company` | `SOLR_AUTH` |

## Robots.txt

FREQUENTIS [robots.txt](https://www.frequentis.com/robots.txt) nu blocheaza accesul la paginile de cariere.

Scraper-ul foloseste rate limiting (1.5s delay intre pagini) si un singur User-Agent identificabil. Paginile individuale de job sunt accesate secvential.

Pentru analiza completa, vezi [ROBOTS.md](../ROBOTS.md).

## Testare

```bash
# Toate testele
npm test

# Doar unitare
npm run test:unit

# Doar integrare (necesita ANAF live, SOLR conditional)
npm run test:integration

# Doar E2E (API real FREQUENTIS + ANAF + SOLR)
npm run test:e2e
```

Testele SOLR folosesc `itIfSolr` - se auto-skip daca variabila `SOLR_AUTH` nu e setata.
