# SYNC-CHECKLIST.md - Verificare sincronizare cu EPAM

C�nd EPAM (?ablonul principal) prime?te actualizari, verifica daca acestea
trebuie propagate �n FREQUENTIS. Vezi [FROM-EPAM.md](FROM-EPAM.md) pentru context.

## Checklist

- [x] `AGENTS.md` - reguli AI, comenzi test, structura module
- [x] `ISSUES.md` - proces contribu?ie, reguli issue
- [x] `CONTRIBUTING.md` - ghid contribu?ie
- [x] `SECURITY.md` - politici securitate
- [x] `ROBOTS.md` - analiza robots.txt (specific sursei)
- [x] `TOPICS.md` - topic-uri GitHub About
- [x] `UPDATE-REPO-ABOUT.md` - ghid actualizare About
- [x] `src/anaf.js` - modul ANAF modular
- [x] `demoanaf.js` - CLI wrapper (guardat la import)
- [x] `validate-jobs.js` - validator URL-uri job
- [x] `tests/validate-frequentis-jobs.js` - validator specific FREQUENTIS
- [x] `tests/unit/` - teste unitare
- [x] `tests/integration/` - teste integrare
- [x] `tests/e2e/` - teste end-to-end
- [x] `.github/workflows/scrape.yml` - workflow scrape zilnic
- [x] `.github/workflows/test.yml` - workflow testare automata
- [x] `.github/workflows/deploy.yml` - deploy GitHub Pages
- [x] `.github/CODEOWNERS` - code owners
- [ ] `README.md` - badge-uri, features, structura proiect (actualizat structura)
- [x] `package.json` - scripts, jest config
- [x] `.gitignore` - fi?iere ignorate
- [ ] `company.json` - date companie (CIF, nume) (se genereaza la runtime)
- [ ] `UPDATE-REPO-ABOUT.md` - descriere, website, topics (necesita owner)

## Cum se sincronizeaza

1. Verifica `git log` �n EPAM pentru commit-uri noi
2. Pentru fiecare fi?ier din checklist, compara �ntre EPAM ?i FREQUENTIS
3. Daca diferen?a e doar de configurare (CIF, nume companie, URL sursa),
   aplica modificarea �n FREQUENTIS
4. Daca e o schimbare structurala, adapteaza pentru specificul FREQUENTIS
5. Ruleaza `npm test` �nainte de commit
