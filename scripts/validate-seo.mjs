import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const client = new URL("../dist/client/", import.meta.url);
const read = file => readFile(new URL(file, client), "utf8");

const publicPages = [
  "index.html",
  "services.html",
  "general-cleaning.html",
  "furniture-cleaning.html",
  "after-renovation-cleaning.html",
  "window-cleaning.html",
  "carpet-cleaning.html",
  "disinfection.html",
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

for (const page of ["business-request.html"]) {
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
const canonicalServicePages = {
  "general-cleaning": "general-cleaning.html",
  "furniture-cleaning": "furniture-cleaning.html",
  "after-renovation": "after-renovation-cleaning.html",
  "window-cleaning": "window-cleaning.html",
  "carpet-cleaning": "carpet-cleaning.html",
  disinfection: "disinfection.html"
};
for (const service of context.window.GOCLEAN_SERVICES) {
  const expectedUrl = canonicalServicePages[service.slug]
    ? `https://go-clean.uz/${canonicalServicePages[service.slug]}`
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

const titles = new Set();
const descriptions = new Set();
for (const [slug, file] of Object.entries(canonicalServicePages)) {
  const service = context.window.GOCLEAN_SERVICES.find(item => item.slug === slug);
  const html = await read(file);
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
  const description = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)?.[1]?.trim();
  assert.ok(title, `${file} must have a non-empty title`);
  assert.ok(description, `${file} must have a non-empty description`);
  assert.ok(!titles.has(title), `${file} title must be unique`);
  assert.ok(!descriptions.has(description), `${file} description must be unique`);
  titles.add(title);
  descriptions.add(description);
  assert.equal((html.match(/<link\s+rel="canonical"/gi) || []).length, 1, `${file} must have one canonical`);
  assert.ok(html.includes(`<link rel="canonical" href="https://go-clean.uz/${file}">`), `${file} canonical is incorrect`);
  assert.ok(html.includes(`<h1>${service.name}</h1>`), `${file} H1 is incorrect`);
  assert.ok(html.includes(service.description), `${file} must contain the service description`);
  assert.ok(html.includes(service.price), `${file} must contain the service price`);
  assert.ok(html.includes(`data-service-lead="${service.name}"`), `${file} must preserve the service lead CTA`);
  assert.doesNotMatch(html, /\$\{s\.name\}/, `${file} contains an unresolved template expression`);
}

for (const page of ["index.html", "shared.js", "services.html"]) {
  assert.match(await read(page), /general-cleaning\.html/, `${page} must link to the prerendered general cleaning page`);
}
assert.ok(!sitemap.includes("service.html?slug=general-cleaning"), "legacy general cleaning URL must not remain in the sitemap");
const seoRuntime = await read("seo-runtime.js");
for (const [slug, file] of Object.entries(canonicalServicePages)) {
  assert.ok(!sitemap.includes(`service.html?slug=${slug}`), `legacy ${slug} URL must not remain in the sitemap`);
  const mapping = slug === "disinfection" ? `disinfection: '${file}'` : `'${slug}': '${file}'`;
  assert.ok(seoRuntime.includes(mapping), `legacy ${slug} URL must canonicalize to ${file}`);
}

for (const page of ["index.html", "shared.js", "services.html", "blog.html", "office-cleaning.html", "business.html"]) {
  const html = await read(page);
  for (const slug of Object.keys(canonicalServicePages)) {
    assert.ok(!html.includes(`service.html?slug=${slug}`), `${page} must not link to legacy ${slug}`);
  }
}

console.log(`SEO artifact validated for ${publicPages.length} public pages and ${context.window.GOCLEAN_SERVICES.length} services.`);
