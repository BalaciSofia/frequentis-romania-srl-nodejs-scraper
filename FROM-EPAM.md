# FROM-EPAM.md - FREQUENTIS & EPAM Sync Relationship

Acest document explica rela?ia dintre repo-urile scraper:

- **EPAM** - [`epam-systems-international-srl-nodejs-scraper`](https://github.com/sebiboga/epam-systems-international-srl-nodejs-scraper) - ?ablonul principal
- **RebelDot** - [`rebeldot-solutions-srl-nodejs-scraper`](https://github.com/BalaciSofia/rebeldot-solutions-srl-nodejs-scraper) - repo derivat intermediar
- **FREQUENTIS** - [`frequentis-romania-srl-nodejs-scraper`](https://github.com/BalaciSofia/frequentis-romania-srl-nodejs-scraper) - repo derivat

## Scop

Repo-ul EPAM con?ine ?ablonul de referin?a pentru structura, configurare ?i bune practici.
FREQUENTIS este derivat din EPAM (prin RebelDot) ?i ar trebui sa ram�na sincronizat.

Pentru lista completa de verificare, vezi [SYNC-CHECKLIST.md](SYNC-CHECKLIST.md).

## Diferen?e cunoscute

| Aspect | EPAM | FREQUENTIS |
|--------|------|------------|
| CIF | `33159615` | `25475641` |
| Company | `EPAM SYSTEMS INTERNATIONAL SRL` | `FREQUENTIS ROMANIA SRL` |
| Brand | `EPAM` | `FREQUENTIS` |
| Sursa job-uri | API JSON (careers.epam.com) | Avature ATS HTML (jobs.frequentis.com) |
| Metoda scraping | JSON API + paginare | HTML DOM parsing (cheerio) |
| `src/anaf.js` | Da (modular) | Da (modular, sincronizat) |
