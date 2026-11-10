import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const client = new URL("../dist/client/", import.meta.url);
const read = file => readFile(new URL(file, client), "utf8");
const organizationId = "https://go-clean.uz/#organization";
const jsonLdBlocks = html => [...html.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)]
  .map(([, source]) => JSON.parse(source));
const graphNodes = blocks => blocks.flatMap(block => block["@graph"] || [block]);
const forbiddenStructuredKeys = new Set(["legalName", "openingHours", "openingHoursSpecification", "address", "sameAs", "aggregateRating", "review"]);
function assertNoUnverifiedStructuredFacts(value, page) {
  if (!value || typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value)) {
    assert.ok(!forbiddenStructuredKeys.has(key), `${page} contains unverified structured field ${key}`);
    assertNoUnverifiedStructuredFacts(nested, page);
  }
}

const publicPages = [
  "index.html",
  "services.html",
  "general-cleaning.html",
  "furniture-cleaning.html",
  "after-renovation-cleaning.html",
  "window-cleaning.html",
  "carpet-cleaning.html",
  "disinfection.html",
  "marble-cleaning.html",
  "paving-cleaning.html",
  "curtain-cleaning.html",
  "facade-cleaning.html",
  "blanket-cleaning.html",
  "emergency-cleaning.html",
  "odor-removal.html",
  "mold-removal.html",
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
  disinfection: "disinfection.html",
  "marble-cleaning": "marble-cleaning.html",
  "paving-cleaning": "paving-cleaning.html",
  "curtain-cleaning": "curtain-cleaning.html",
  "facade-cleaning": "facade-cleaning.html",
  "blanket-cleaning": "blanket-cleaning.html",
  "emergency-cleaning": "emergency-cleaning.html",
  "odor-removal": "odor-removal.html",
  "mold-removal": "mold-removal.html"
};

const expectedTitles = {
  "marble-cleaning": "Marmar tozalash va jilolash Toshkentda — Goclean.uz",
  "paving-cleaning": "Bruschatka yuvish Toshkentda — Goclean.uz",
  "curtain-cleaning": "Parda yuvish Toshkentda — Goclean.uz",
  "facade-cleaning": "Fasad yuvish Toshkentda — Goclean.uz",
  "blanket-cleaning": "Pled yuvish Toshkentda — Goclean.uz",
  "emergency-cleaning": "Favqulodda holatdan keyin tozalash Toshkentda — Goclean.uz",
  "odor-removal": "Yoqimsiz hidlarni yo‘qotish Toshkentda — Goclean.uz",
  "mold-removal": "Mog‘orni yo‘qotish Toshkentda — Goclean.uz"
};

for (const page of ["index.html", "about.html"]) {
  const html = await read(page);
  const blocks = jsonLdBlocks(html);
  const organizations = graphNodes(blocks).filter(node => node["@type"] === "Organization");
  assert.equal(organizations.length, 1, `${page} must contain exactly one Organization entity`);
  const organization = organizations[0];
  assert.equal(organization["@id"], organizationId, `${page} Organization ID is incorrect`);
  assert.equal(organization.name, "GoClean", `${page} Organization name is incorrect`);
  assert.equal(organization.url, "https://go-clean.uz/", `${page} Organization URL is incorrect`);
  assert.equal(organization.telephone, "+998 97 707 15 15", `${page} Organization phone is incorrect`);
  assert.equal(organization.email, "hello@goclean.uz", `${page} Organization email is incorrect`);
  assert.equal(organization.areaServed?.["@type"], "City", `${page} Organization area type is incorrect`);
  assert.equal(organization.areaServed?.name, "Toshkent", `${page} Organization area is incorrect`);
  assertNoUnverifiedStructuredFacts(organization, page);
}

const about = await read("about.html");
for (const visibleFact of ["GoClean haqida qisqa faktlar", "GoClean", "Toshkent shahri", "+998 97 707 15 15", "hello@goclean.uz", "Oxirgi yangilanish: 10 noyabr 2026"]) {
  assert.ok(about.includes(visibleFact), `about.html is missing visible fact: ${visibleFact}`);
}
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
  if (expectedTitles[slug]) assert.equal(title, expectedTitles[slug], `${file} title is incorrect`);
  titles.add(title);
  descriptions.add(description);
  assert.equal((html.match(/<link\s+rel="canonical"/gi) || []).length, 1, `${file} must have one canonical`);
  assert.ok(html.includes(`<link rel="canonical" href="https://go-clean.uz/${file}">`), `${file} canonical is incorrect`);
  assert.ok(html.includes(`<h1>${service.name}</h1>`), `${file} H1 is incorrect`);
  assert.ok(html.includes(service.description), `${file} must contain the service description`);
  assert.ok(html.includes(service.price), `${file} must contain the service price`);
  for (const item of service.includes) assert.ok(html.includes(item), `${file} must contain ${item}`);
  assert.ok(html.includes(`data-service-lead="${service.name}"`), `${file} must preserve the service lead CTA`);
  assert.doesNotMatch(html, /\$\{s\.name\}/, `${file} contains an unresolved template expression`);
  if (expectedTitles[slug]) {
    assert.doesNotMatch(html, /Sifat kafolati|bepul qayta tozalaymiz/i, `${file} must not add an unapproved guarantee`);
  }

  const blocks = jsonLdBlocks(html);
  const nodes = graphNodes(blocks);
  const structuredServices = nodes.filter(node => node["@type"] === "Service");
  const breadcrumbs = nodes.filter(node => node["@type"] === "BreadcrumbList");
  assert.equal(structuredServices.length, 1, `${file} must contain exactly one Service entity`);
  assert.equal(breadcrumbs.length, 1, `${file} must contain exactly one BreadcrumbList entity`);
  const structuredService = structuredServices[0];
  const url = `https://go-clean.uz/${file}`;
  assert.equal(structuredService["@id"], `${url}#service`, `${file} Service ID is incorrect`);
  assert.equal(structuredService.name, service.name, `${file} Service name must match visible content`);
  assert.equal(structuredService.serviceType, service.name, `${file} Service type must match visible content`);
  assert.equal(structuredService.description, service.description, `${file} Service description must match visible content`);
  assert.equal(structuredService.url, url, `${file} Service URL is incorrect`);
  assert.equal(structuredService.areaServed?.["@type"], "City", `${file} Service area type is incorrect`);
  assert.equal(structuredService.areaServed?.name, "Toshkent", `${file} Service area is incorrect`);
  assert.equal(structuredService.provider?.["@id"], organizationId, `${file} Service provider ID is incorrect`);
  assertNoUnverifiedStructuredFacts(structuredService, file);

  const breadcrumb = breadcrumbs[0];
  assert.deepEqual(
    breadcrumb.itemListElement.map(item => [item.position, item.name, item.item]),
    [
      [1, "Bosh sahifa", "https://go-clean.uz/"],
      [2, "Xizmatlar", "https://go-clean.uz/services.html"],
      [3, service.name, url]
    ],
    `${file} BreadcrumbList must match the visible breadcrumb`
  );
  assert.ok(html.includes('<div class="breadcrumbs"><a href="index.html">Bosh sahifa</a><span>→</span><a href="services.html">Xizmatlar</a>'), `${file} visible breadcrumb is missing`);
  assertNoUnverifiedStructuredFacts(breadcrumb, file);
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
