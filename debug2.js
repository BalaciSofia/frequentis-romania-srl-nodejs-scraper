import fetch from "node-fetch";
import * as cheerio from "cheerio";

const res = await fetch("https://jobs.frequentis.com/careers/SearchJobs?sort=date&folder=true", {
  headers: { "User-Agent": "Mozilla/5.0" }
});

const html = await res.text();
const $ = cheerio.load(html);

const firstJobLink = $('.list__item__text__title a').first();
const parentDiv = firstJobLink.closest("div");
const grandparent = parentDiv.parent();

console.log("=== Grandparent HTML (first 2000 chars) ===");
console.log(grandparent.html()?.substring(0, 2000));

console.log("\n\n=== Parent div HTML ===");
console.log(parentDiv.html()?.substring(0, 2000));

console.log("\n\n=== First job link text via text() ===");
console.log(">%s<", firstJobLink.text().trim());

console.log("\n=== First job link contents (text nodes only):");
firstJobLink.contents().each((i, n) => {
  if (n.type === "text") {
    console.log("  text[%d]: >%s<", i, n.data?.trim());
  } else {
    console.log("  node[%d]: type=%s name=%s", i, n.type, n.name);
  }
});

const href = firstJobLink.attr("href");
if (href) {
  const url = href.startsWith("http") ? href : `https://jobs.frequentis.com${href}`;
  console.log(`\n\n=== Fetching detail page: ${url} ===`);
  const detailRes = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" }
  });
  const detailHtml = await detailRes.text();
  const $d = cheerio.load(detailHtml);
  console.log("Detail h1:", $d("h1").first().text().trim());
  console.log("Detail title tag:", $d("title").text().trim());
  console.log("Detail HTML length:", detailHtml.length);
}
