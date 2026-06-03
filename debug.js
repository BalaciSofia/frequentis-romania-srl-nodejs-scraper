import fetch from "node-fetch";
import * as cheerio from "cheerio";

const res = await fetch("https://jobs.frequentis.com/careers/SearchJobs?sort=date&folder=true", {
  headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
});

const html = await res.text();
const $ = cheerio.load(html);

console.log("=== All <a> tags with href containing /careers/ ===");
$('a[href*="/careers/"]').each((i, el) => {
  const $el = $(el);
  console.log(`\n--- Job ${i + 1} ---`);
  console.log("href:", $el.attr("href"));
  console.log("text:", $el.text().trim().substring(0, 200));
});

console.log("\n\n=== All elements with class containing 'list__item' ===");
$('[class*="list__item"]').each((i, el) => {
  const $el = $(el);
  console.log(`\n--- Element ${i + 1} ---`);
  console.log("class:", $el.attr("class"));
  console.log("text:", $el.text().trim().substring(0, 300));
});

console.log("\n\n=== Total job links found:", $('a[href*="/careers/"]').length);
console.log("=== Total ROU- links:", $('a[href*="ROU-"]').length);
