#!/usr/bin/env node

import { getCompanyFromANAF, getCompanyFromANAFWithFallback, searchCompany } from "./src/anaf.js";

export { getCompanyFromANAF, getCompanyFromANAFWithFallback, searchCompany };

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === "search") {
    const brand = args[1] || "FREQUENTIS";
    console.log(`=== Searching for: ${brand} ===\n`);

    try {
      const results = await searchCompany(brand);
      console.log(`Found ${results.length} results:\n`);
      results.forEach((c, i) => {
        console.log(`${i+1}. ${c.name} (CIF: ${c.cui}) - ${c.statusLabel || 'N/A'}`);
      });
    } catch (err) {
      console.error("Error:", err.message);
      process.exit(1);
    }
  } else {
    const cif = args[0] || "25475641";
    console.log(`=== Testing ANAF API for CIF: ${cif} ===\n`);

    try {
      const data = await getCompanyFromANAF(cif);
      console.log("Company data:");
      console.log(JSON.stringify(data, null, 2));
    } catch (err) {
      console.error("Error:", err.message);
      process.exit(1);
    }
  }
}

if (process.argv[1]?.includes('demoanaf')) {
  main().catch(err => {
    console.error("Error:", err.message);
    process.exit(1);
  });
}
