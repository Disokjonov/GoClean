import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const client = new URL("../dist/client/", import.meta.url);
const read = file => readFile(new URL(file, client), "utf8");

const publicPages = [
  "index.html",
  "services.html",
  "general-cleaning.html",
  "blog.html",
  "about.html",
  "business.html",
  "office-cleaning.html",
  "contact.html"
];

for (const page of publicPages) {
  const html = await read(page);
  assert.match(html, /<meta\s+name=["']description["']/i, `${page} is missing a description`);
  assert.match(html, /<link\s+rel=["']canonical["']/i, `${page} is missing a canonical`);
}

for (const page of ["booking.html", "business-request.html"]) {
  const html = await read(page);
  assert.match(html, /<meta\s+name=["']robots["']\s+content=["']noindex,follow["']/i, `${page} must be noindex,follow`);
}

for (const page of ["service.html", "legal.html"]) {
  assert.match(await read(page), /seo-runtime\.js/, `${page} is missing runtime SEO metadata`);
}

const robots = await read("robots.txt");
assert.match(robots, /Sitemap:\s+https:\/\/go-clean\.uz\/sitemap\.xml/i);

const sitemap = await read("sitemap.xml");
assert.match(sitemap, /<urlset\s+xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);

const context = { window: {} };
vm.runInNewContext(await readFile(new URL("../data.js", import.meta.url), "utf8"), context);
for (const service of context.window.GOCLEAN_SERVICES) {
  const expectedUrl = service.slug === "general-cleaning"
    ? "https://go-clean.uz/general-cleaning.html"
    : `https://go-clean.uz/service.html?slug=${service.slug}`;
  assert.ok(
    sitemap.includes(expectedUrl),
    `sitemap is missing ${service.slug}`
  );
}

const general = await read("general-cleaning.html");
assert.match(general, /<title>General tozalash Toshkentda — Goclean\.uz<\/title>/);
assert.match(general, /<meta\s+name="description"\s+content="Toshkentda kvartira, hovli va ofis uchun general tozalash\./);
assert.match(general, /<link\s+rel="canonical"\s+href="https:\/\/go-clean\.uz\/general-cleaning\.html">/);
assert.match(general, /<h1>General tozalash<\/h1>/);
assert.match(general, /Barcha ochiq yuzalar, oshxona, sanuzel, eshiklar, plintuslar/);
assert.match(general, /data-service-lead="General tozalash"/);
assert.doesNotMatch(general, /<main[^>]*>\s*<\/main>/);

for (const page of ["index.html", "shared.js", "services.html"]) {
  assert.match(await read(page), /general-cleaning\.html/, `${page} must link to the prerendered general cleaning page`);
}
assert.ok(!sitemap.includes("service.html?slug=general-cleaning"), "legacy general cleaning URL must not remain in the sitemap");

console.log(`SEO artifact validated for ${publicPages.length} public pages and ${context.window.GOCLEAN_SERVICES.length} services.`);
