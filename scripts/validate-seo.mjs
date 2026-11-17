import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { serviceContent } from "./service-content.mjs";

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
  "cleaning-preparation-guide.html",
  "about.html",
  "business.html",
  "office-cleaning.html",
  "ru/index.html",
  "ru/general-cleaning.html",
  "ru/office-cleaning.html",
  "ru/after-renovation-cleaning.html",
  "ru/furniture-cleaning.html",
  "ru/carpet-cleaning.html",
  "ru/window-cleaning.html",
  "ru/curtain-cleaning.html",
  "ru/blanket-cleaning.html",
  "ru/paving-cleaning.html",
  "ru/marble-cleaning.html",
  "ru/cleaning-preparation-guide.html",
  "contact.html",
  "privacy.html",
  "terms.html"
];

for (const page of publicPages) {
  const html = await read(page);
  assert.match(html, /<meta\s+name=["']description["']/i, `${page} is missing a description`);
  assert.match(html, /<link\s+rel=["']canonical["']/i, `${page} is missing a canonical`);
  assert.match(html, /shared\.js\?v=27/, `${page} must load the current shared navigation asset`);
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
assert.doesNotMatch(sitemap, /<lastmod>/, "sitemap must omit unverified lastmod values");
const sitemapUrls = [...sitemap.matchAll(/<loc>(https:\/\/go-clean\.uz\/[^<]*)<\/loc>/g)].map(match => match[1]);
assert.equal(sitemapUrls.length, publicPages.length, "sitemap URL count must match public pages");
assert.equal(new Set(sitemapUrls).size, sitemapUrls.length, "sitemap must not contain duplicate URLs");
const publicCanonicalUrls = [];
for (const page of publicPages) {
  const html = await read(page);
  const canonical = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1];
  assert.ok(canonical, `${page} canonical URL could not be parsed`);
  publicCanonicalUrls.push(canonical);
}
assert.deepEqual([...sitemapUrls].sort(), [...publicCanonicalUrls].sort(), "sitemap URLs must exactly match public canonicals");
assert.match(sitemap, /https:\/\/go-clean\.uz\/privacy\.html/);
assert.match(sitemap, /https:\/\/go-clean\.uz\/terms\.html/);
assert.doesNotMatch(sitemap, /legal\.html\?doc=/);
assert.match(sitemap, /https:\/\/go-clean\.uz\/ru\//);
assert.match(sitemap, /https:\/\/go-clean\.uz\/ru\/office-cleaning\.html/);
assert.match(sitemap, /https:\/\/go-clean\.uz\/cleaning-preparation-guide\.html/);
assert.match(sitemap, /https:\/\/go-clean\.uz\/ru\/cleaning-preparation-guide\.html/);

const preparationGuidePages = [
  {
    file: "cleaning-preparation-guide.html",
    lang: "uz",
    canonical: "https://go-clean.uz/cleaning-preparation-guide.html",
    alternate: "https://go-clean.uz/ru/cleaning-preparation-guide.html",
    h1: "Tozalash mutaxassisi kelishidan oldin uyni qanday tayyorlash kerak?",
    publishedLabel: "Nashr qilingan: 15 noyabr 2026"
  },
  {
    file: "ru/cleaning-preparation-guide.html",
    lang: "ru",
    canonical: "https://go-clean.uz/ru/cleaning-preparation-guide.html",
    alternate: "https://go-clean.uz/cleaning-preparation-guide.html",
    h1: "Как подготовить квартиру к приезду клинеров",
    publishedLabel: "Опубликовано: 15 ноября 2026"
  }
];
for (const guide of preparationGuidePages) {
  const html = await read(guide.file);
  assert.match(html, new RegExp(`<html lang=["']${guide.lang}["']`), `${guide.file} language is incorrect`);
  assert.ok(html.includes(`<link rel="canonical" href="${guide.canonical}">`), `${guide.file} canonical is incorrect`);
  assert.ok(html.includes(`hreflang="${guide.lang}" href="${guide.canonical}"`), `${guide.file} self hreflang is missing`);
  assert.ok(html.includes(`href="${guide.alternate}"`), `${guide.file} reciprocal language link is missing`);
  assert.ok(html.includes(`<h1>${guide.h1}</h1>`), `${guide.file} H1 is incorrect`);
  assert.ok(html.includes(`<time datetime="2026-11-15">${guide.publishedLabel}</time>`), `${guide.file} visible publication date is missing`);
  assert.equal((html.match(/<details>/g) || []).length, 5, `${guide.file} must contain five FAQs`);
  assert.equal((html.match(/class="guide-check-item"/g) || []).length, 5, `${guide.file} must contain five checklist items`);
  assert.equal((html.match(/data-article-lead(?:\s|>)/g) || []).length, 1, `${guide.file} must contain one article lead form`);
  assert.ok(html.includes('name="name" autocomplete="name" required'), `${guide.file} name must be required`);
  assert.ok(html.includes('name="phone" type="tel"') && html.includes('maxlength="12" required'), `${guide.file} phone must be required`);
  assert.ok(html.includes('name="area" type="number" min="1"') && !html.includes('name="area" type="number" min="1" required'), `${guide.file} area must stay optional`);
  assert.ok(html.includes('data-article-area-field hidden'), `${guide.file} optional area must be hidden initially`);
  assert.ok(html.includes('article-lead.js?v=1'), `${guide.file} must load the reusable article lead behavior`);
  assert.ok(!html.includes('data-article-lead-form'), `${guide.file} article form placeholder must be rendered at build time`);
  const nodes = graphNodes(jsonLdBlocks(html));
  assert.equal(nodes.filter(node => node["@type"] === "Article").length, 1, `${guide.file} must contain one Article entity`);
  const article = nodes.find(node => node["@type"] === "Article");
  assert.equal(article.datePublished, "2026-11-15T16:34:03Z", `${guide.file} publication time must match the first successful Render release`);
  assert.ok(!article.dateModified, `${guide.file} must not claim an editorial modification date for the enquiry-form-only release`);
  assert.ok(!article.author, `${guide.file} must not invent an unverified author`);
  assert.equal(nodes.filter(node => node["@type"] === "FAQPage").length, 1, `${guide.file} must contain one FAQPage entity`);
  assertNoUnverifiedStructuredFacts(nodes, guide.file);
}

const blogHtml = await read("blog.html");
assert.ok(blogHtml.includes('href="cleaning-preparation-guide.html"'), "blog must link to the Uzbek preparation guide");
assert.ok(blogHtml.includes('href="ru/cleaning-preparation-guide.html"'), "blog must link to the Russian preparation guide");
assert.equal((blogHtml.match(/class="blog-card"/g) || []).length, 1, "blog must list only real published articles");
assert.match(blogHtml, /<h2><a class="blog-card-title" href="cleaning-preparation-guide\.html" aria-label="[^"]+">Tozalash mutaxassisi kelishidan oldin uyni qanday tayyorlash kerak\?<\/a><\/h2>/);
for (const placeholderTitle of ["Divandagi dog‘ni chuqurlashtirib yubormaslik uchun 5 qoida", "Oynani iz qoldirmay yuvishning oddiy tartibi", "General tozalash qachon kerak bo‘ladi?"]) {
  assert.ok(!blogHtml.includes(placeholderTitle), `blog must remove unpublished placeholder: ${placeholderTitle}`);
}

const articleLeadScript = await read("article-lead.js");
assert.match(articleLeadScript, /form\.dataset\.submitting==='true'/, "article lead form must guard repeated submissions");
assert.match(articleLeadScript, /leads\.send\('order'/, "article lead form must reuse the existing lead route");

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
assert.match(general, /const titles=\{"uz":"General tozalash Toshkentda — Goclean\.uz","ru":"Генеральная уборка в Ташкенте \| GoClean"\}/);
assert.match(general, /data-content-lang="uz"[\s\S]*aria-label="Tegishli xizmatlar"[\s\S]*>Savol va bog‘lanish<\/a>/);
assert.match(general, /data-content-lang="ru" hidden[\s\S]*aria-label="Связанные услуги"[\s\S]*<b>Связанные услуги<\/b>[\s\S]*>Вопросы и связь<\/a>/);
assert.equal((general.match(/<details>/g) || []).length, 8, "general-cleaning must keep exactly four FAQs per language");

const generalRu = await read("ru/general-cleaning.html");
assert.match(generalRu, /<html lang="ru">/);
assert.match(generalRu, /<base href="\.\.\/">/);
assert.match(generalRu, /<title>Генеральная уборка в Ташкенте — GoClean<\/title>/);
assert.match(generalRu, /<meta name="description" content="Генеральная уборка квартир, домов с двором и офисов в Ташкенте\./);
assert.match(generalRu, /<link rel="canonical" href="https:\/\/go-clean\.uz\/ru\/general-cleaning\.html">/);
for (const [hreflang, href] of [["uz", "https://go-clean.uz/general-cleaning.html"], ["ru", "https://go-clean.uz/ru/general-cleaning.html"], ["x-default", "https://go-clean.uz/general-cleaning.html"]]) {
  assert.ok(general.includes(`<link rel="alternate" hreflang="${hreflang}" href="${href}">`), `UZ general is missing ${hreflang} hreflang`);
  assert.ok(generalRu.includes(`<link rel="alternate" hreflang="${hreflang}" href="${href}">`), `RU general is missing ${hreflang} hreflang`);
}
assert.match(general, /class="page-language-link" href="ru\/general-cleaning\.html"/);
assert.match(generalRu, /data-page-language="ru" data-language-switch="general-cleaning\.html"/);
assert.match(generalRu, /class="page-language-link" href="general-cleaning\.html" hreflang="uz"/);
assert.match(generalRu, /<h1>Генеральная уборка в Ташкенте<\/h1>/);
assert.equal((generalRu.match(/<details>/g) || []).length, 3, "RU general must contain three verified non-price FAQs");
assert.ok((generalRu.match(/data-service-area-option/g) || []).length >= 2, "RU general CTAs must keep optional area");
assert.doesNotMatch(generalRu, /500\s*000|за вызов одного сотрудника|почасов/i, "RU general must not publish the pending price basis");
assert.match(generalRu, /<b>Гарантия качества<\/b><small>Если результат не устроит, уберём повторно бесплатно<\/small>/, "RU general must match the confirmed UZ guarantee");
const generalRuNodes = graphNodes(jsonLdBlocks(generalRu));
const generalRuService = generalRuNodes.find(node => node["@type"] === "Service");
const generalRuFaq = generalRuNodes.find(node => node["@type"] === "FAQPage");
assert.equal(generalRuService?.url, "https://go-clean.uz/ru/general-cleaning.html");
assert.equal(generalRuService?.description, serviceContent["general-cleaning"].ru.intro);
const expectedGeneralRuFaqs = [serviceContent["general-cleaning"].ru.faqs[0], serviceContent["general-cleaning"].ru.faqs[2], serviceContent["general-cleaning"].ru.faqs[3]];
assert.deepEqual(generalRuFaq?.mainEntity.map(item => [item.name, item.acceptedAnswer?.text]), expectedGeneralRuFaqs);
assert.ok(sitemap.includes("https://go-clean.uz/ru/general-cleaning.html"), "sitemap must include RU general");

const guaranteedServicePairs = [
  ["general-cleaning.html", "ru/general-cleaning.html"],
  ["after-renovation-cleaning.html", "ru/after-renovation-cleaning.html"],
  ["furniture-cleaning.html", "ru/furniture-cleaning.html"],
  ["carpet-cleaning.html", "ru/carpet-cleaning.html"],
  ["window-cleaning.html", "ru/window-cleaning.html"]
];
for (const [uzFile, ruFile] of guaranteedServicePairs) {
  const uzHtml = await read(uzFile);
  const ruHtml = await read(ruFile);
  assert.equal((uzHtml.match(/Natija yoqmasa, bepul qayta tozalaymiz/g) || []).length, 1, `${uzFile} must keep one confirmed UZ guarantee`);
  assert.equal((ruHtml.match(/Если результат не устроит, уберём повторно бесплатно/g) || []).length, 1, `${ruFile} must contain one matching RU guarantee`);
}
for (const ruFile of ["ru/blanket-cleaning.html", "ru/curtain-cleaning.html", "ru/marble-cleaning.html", "ru/paving-cleaning.html"]) {
  assert.doesNotMatch(await read(ruFile), /Если результат не устроит, уберём повторно бесплатно/, `${ruFile} must not gain a guarantee absent from its UZ pair`);
}

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
  assert.equal(structuredService.description, serviceContent[slug]?.uz.intro || service.description, `${file} Service description must match visible content`);
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

  if (serviceContent[slug]) {
    const faqPages = nodes.filter(node => node["@type"] === "FAQPage");
    assert.equal(faqPages.length, 1, `${file} must contain one FAQPage`);
    assert.deepEqual(
      faqPages[0].mainEntity.map(item => [item.name, item.acceptedAnswer?.text]),
      serviceContent[slug].uz.faqs,
      `${file} FAQ schema must match visible UZ FAQ content`
    );
    assert.ok(html.includes(serviceContent[slug].uz.intro), `${file} must contain the UZ introduction in source HTML`);
    assert.ok(html.includes(serviceContent[slug].ru.intro), `${file} must contain the RU introduction for the language toggle`);
    for (const [question, answer] of serviceContent[slug].uz.faqs) {
      assert.ok(html.includes(question) && html.includes(answer), `${file} must display FAQ: ${question}`);
    }
  } else {
    assert.equal(nodes.filter(node => node["@type"] === "FAQPage").length, 0, `${file} must not add FAQ schema without visible FAQ content`);
  }
}

for (const page of ["index.html", "shared.js", "services.html"]) {
  assert.match(await read(page), /general-cleaning\.html/, `${page} must link to the prerendered general cleaning page`);
}

const homeUz = await read("index.html");
const homeRu = await read("ru/index.html");
for (const [page, html, lang, canonical, alternate] of [
  ["index.html", homeUz, "uz", "https://go-clean.uz/", "ru/"],
  ["ru/index.html", homeRu, "ru", "https://go-clean.uz/ru/", "/"]
]) {
  assert.match(html, new RegExp(`<html lang="${lang}">`), `${page} language is incorrect`);
  assert.equal((html.match(/<link\s+rel="canonical"/g) || []).length, 1, `${page} must contain one canonical`);
  assert.ok(html.includes(`<link rel="canonical" href="${canonical}"`), `${page} self-canonical is incorrect`);
  for (const [hreflang, href] of [["uz", "https://go-clean.uz/"], ["ru", "https://go-clean.uz/ru/"], ["x-default", "https://go-clean.uz/"]]) {
    assert.ok(html.includes(`<link rel="alternate" hreflang="${hreflang}" href="${href}"`), `${page} is missing ${hreflang} hreflang`);
  }
  assert.ok(html.includes(`id="langToggle" href="${alternate}"`), `${page} is missing a crawlable reciprocal language link`);
}
assert.match(homeRu, /<title>Клининг в Ташкенте для дома и бизнеса — GoClean<\/title>/);
assert.match(homeRu, /<meta name="description" content="Клининг в Ташкенте/);
assert.match(homeRu, /<h1 data-i18n="heroTitle">Клининг в Ташкенте для дома и бизнеса<\/h1>/);
assert.match(homeRu, /<base href="\.\.\/"/);
assert.equal((homeRu.match(/href="\/ru\/#top"/g) || []).length, 2, "Russian homepage must keep both brand links on /ru/#top");
assert.equal((homeRu.match(/href="\/ru\/#how"/g) || []).length, 2, "Russian homepage must keep both how-it-works links on /ru/#how");
assert.doesNotMatch(homeRu, /href="#(?:top|how)"/, "Russian homepage must not contain base-relative fragment links");
const sharedClient = await read("shared.js");
assert.ok(sharedClient.includes("const homeOfferHref=russianPage?'/ru/?offer=first-order':'/?offer=first-order'"), "shared navigation must define language-aware Home offer destinations");
assert.ok(sharedClient.includes("cta.href=mode==='home'?homeOfferHref:'/business-request.html'"), "drawer modes must restore the language-aware Home destination and root Business destination");
assert.ok(homeRu.includes('href="ru/office-cleaning.html">Уборка офисов</a>'), "Russian homepage must link to the Russian office page");
assert.ok(homeRu.includes('href="ru/general-cleaning.html">Генеральная уборка</a>'), "Russian homepage must link to the Russian general page");
assert.ok(homeRu.includes("GoClean оказывает услуги уборки для квартир, домов, офисов и коммерческих объектов в Ташкенте."), "Russian homepage must contain useful source content");
for (const fact of ["GoClean", "Ташкент", "+998 97 707 15 15", "hello@goclean.uz"]) assert.ok(homeRu.includes(fact), `Russian homepage is missing verified fact: ${fact}`);
for (const unverified of ["4.9", "12 000+", "180+", "98%", "24 часа", "Гарантия качества", "бесплатно устраним"]) assert.ok(!homeRu.includes(unverified), `Russian homepage contains unverified claim: ${unverified}`);
for (const form of ["orderForm", "businessForm", "discountForm"]) assert.ok(homeRu.includes(`id="${form}"`), `Russian homepage must preserve ${form}`);
const homeRuNodes = graphNodes(jsonLdBlocks(homeRu));
const homeRuOrganization = homeRuNodes.filter(node => node["@type"] === "Organization");
const homeRuWebPage = homeRuNodes.filter(node => node["@type"] === "WebPage");
assert.equal(homeRuOrganization.length, 1, "Russian homepage must contain one Organization entity");
assert.equal(homeRuOrganization[0]["@id"], organizationId, "Russian homepage Organization ID is incorrect");
assert.equal(homeRuOrganization[0].telephone, "+998 97 707 15 15", "Russian homepage phone is incorrect");
assert.equal(homeRuOrganization[0].email, "hello@goclean.uz", "Russian homepage email is incorrect");
assert.equal(homeRuWebPage.length, 1, "Russian homepage must contain one WebPage entity");
assert.equal(homeRuWebPage[0].url, "https://go-clean.uz/ru/", "Russian homepage WebPage URL is incorrect");
assert.equal(homeRuWebPage[0].inLanguage, "ru", "Russian homepage language schema is incorrect");
assertNoUnverifiedStructuredFacts(homeRuNodes, "ru/index.html");

const officeUz = await read("office-cleaning.html");
const officeRu = await read("ru/office-cleaning.html");
for (const [page, html, lang, canonical, alternate] of [
  ["office-cleaning.html", officeUz, "uz", "https://go-clean.uz/office-cleaning.html", "ru/office-cleaning.html"],
  ["ru/office-cleaning.html", officeRu, "ru", "https://go-clean.uz/ru/office-cleaning.html", "office-cleaning.html"]
]) {
  assert.match(html, new RegExp(`<html lang="${lang}">`), `${page} language is incorrect`);
  assert.equal((html.match(/<link\s+rel="canonical"/g) || []).length, 1, `${page} must contain one canonical`);
  assert.ok(html.includes(`<link rel="canonical" href="${canonical}">`), `${page} self-canonical is incorrect`);
  for (const [hreflang, href] of [["uz", "https://go-clean.uz/office-cleaning.html"], ["ru", "https://go-clean.uz/ru/office-cleaning.html"], ["x-default", "https://go-clean.uz/office-cleaning.html"]]) {
    assert.ok(html.includes(`<link rel="alternate" hreflang="${hreflang}" href="${href}">`), `${page} is missing ${hreflang} hreflang`);
  }
  assert.ok(html.includes(`class="page-language-link" href="${alternate}"`), `${page} is missing a crawlable reciprocal language link`);
  const nodes = graphNodes(jsonLdBlocks(html));
  const service = nodes.filter(node => node["@type"] === "Service");
  const breadcrumb = nodes.filter(node => node["@type"] === "BreadcrumbList");
  assert.equal(service.length, 1, `${page} must contain one Service entity`);
  assert.equal(breadcrumb.length, 1, `${page} must contain one BreadcrumbList entity`);
  assert.equal(service[0].url, canonical, `${page} Service URL is incorrect`);
  assert.equal(service[0].provider?.["@id"], organizationId, `${page} provider is incorrect`);
  assertNoUnverifiedStructuredFacts(service[0], page);
  assert.deepEqual(breadcrumb[0].itemListElement.map(item => item.item), [lang === "ru" ? "https://go-clean.uz/ru/" : "https://go-clean.uz/", "https://go-clean.uz/business.html", canonical], `${page} breadcrumb URLs are incorrect`);
}
assert.match(officeUz, /<title>Ofis tozalash Toshkentda — Goclean\.uz<\/title>/);
assert.match(officeRu, /<title>Уборка офисов в Ташкенте — Goclean\.uz<\/title>/);
assert.match(officeRu, /<h1>Пусть ваш офис каждый день будет готов к работе<\/h1>/);
assert.match(officeRu, /<base href="\.\.\/">/);
for (const serviceName of ["Регулярная уборка офиса", "Генеральная уборка офиса", "Уборка склада и цеха"]) assert.ok(officeRu.includes(`data-service-lead="${serviceName}"`), `RU office CTA is missing ${serviceName}`);
assert.doesNotMatch(officeRu, /data-service-lead="[^"]*(?:Kundalik|Ofisni|tozalash)[^"]*"/i);
assert.doesNotMatch(officeUz, /Obyekt turi, maydon va kontaktni qoldirasiz|Maydon va telefonni qoldiring/);
assert.doesNotMatch(officeRu, /Obyekt turi, maydon va kontaktni qoldirasiz|Maydon va telefonni qoldiring/);
assert.ok((officeUz.match(/data-service-area-option/g) || []).length >= 6, "Office UZ CTAs must expose optional area");
assert.ok((officeRu.match(/data-service-area-option/g) || []).length >= 6, "Office RU CTAs must expose optional area");
const servicesSource = (await read("services.html")).split('<script src="data.js')[0];
assert.equal((servicesSource.match(/<article class="catalog-card"/g) || []).length, 14, "services source must contain 14 cards");
for (const file of Object.values(canonicalServicePages)) {
  assert.ok(servicesSource.includes(`href="${file}"`), `services source must link to ${file}`);
}
for (const page of ["services.html", "general-cleaning.html", "privacy.html", "terms.html"]) {
  const html = await read(page);
  assert.equal((html.match(/id="mainNav"/g) || []).length, 1, `${page} must contain one source navigation`);
  assert.equal((html.match(/<footer>/g) || []).length, 1, `${page} must contain one source footer`);
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

const afterRenovation = await read("after-renovation-cleaning.html");
for (const text of [
  "Hisob-kitob uchun nimalarni aniqlashtiramiz?",
  "Maydonni bilmasangiz ham ariza qoldirishingiz mumkin.",
  "Ish tarkibini oldindan aniqlashtiring",
  "Что нужно уточнить для расчёта?",
  "Заявку можно оставить, даже если площадь пока неизвестна.",
  "Заранее уточните состав работ"
]) assert.ok(afterRenovation.includes(text), `after-renovation content is missing: ${text}`);
for (const href of ["general-cleaning.html", "window-cleaning.html", "marble-cleaning.html", "office-cleaning.html"]) {
  assert.ok(afterRenovation.includes(`href="${href}"`), `after-renovation must contextually link to ${href}`);
}
assert.equal((afterRenovation.match(/<details>/g) || []).length, serviceContent["after-renovation"].uz.faqs.length * 2, "after-renovation UZ/RU visible FAQ count is incorrect");

const afterRenovationRu = await read("ru/after-renovation-cleaning.html");
assert.match(afterRenovationRu, /<html lang="ru">/);
assert.match(afterRenovationRu, /<base href="\.\.\/">/);
assert.match(afterRenovationRu, /<title>Уборка после ремонта в Ташкенте — GoClean<\/title>/);
assert.match(afterRenovationRu, /<meta name="description" content="Уборка после ремонта в Ташкенте:/);
assert.match(afterRenovationRu, /<link rel="canonical" href="https:\/\/go-clean\.uz\/ru\/after-renovation-cleaning\.html">/);
for (const [hreflang, href] of [["uz", "https://go-clean.uz/after-renovation-cleaning.html"], ["ru", "https://go-clean.uz/ru/after-renovation-cleaning.html"], ["x-default", "https://go-clean.uz/after-renovation-cleaning.html"]]) {
  assert.ok(afterRenovation.includes(`<link rel="alternate" hreflang="${hreflang}" href="${href}">`), `UZ after-renovation is missing ${hreflang} hreflang`);
  assert.ok(afterRenovationRu.includes(`<link rel="alternate" hreflang="${hreflang}" href="${href}">`), `RU after-renovation is missing ${hreflang} hreflang`);
}
assert.match(afterRenovation, /class="page-language-link" href="ru\/after-renovation-cleaning\.html"/);
assert.match(afterRenovationRu, /data-page-language="ru" data-language-switch="after-renovation-cleaning\.html"/);
assert.match(afterRenovationRu, /class="page-language-link" href="after-renovation-cleaning\.html" hreflang="uz"/);
assert.match(afterRenovationRu, /<h1>Уборка после ремонта в Ташкенте<\/h1>/);
for (const [question, answer] of serviceContent["after-renovation"].ru.faqs) {
  assert.ok(afterRenovationRu.includes(question) && afterRenovationRu.includes(answer), `RU after-renovation must display FAQ: ${question}`);
}
assert.equal((afterRenovationRu.match(/<details>/g) || []).length, 9, "RU after-renovation must contain nine visible FAQs");
const afterRenovationRuNodes = graphNodes(jsonLdBlocks(afterRenovationRu));
const afterRenovationRuService = afterRenovationRuNodes.find(node => node["@type"] === "Service");
const afterRenovationRuFaq = afterRenovationRuNodes.find(node => node["@type"] === "FAQPage");
assert.equal(afterRenovationRuService?.url, "https://go-clean.uz/ru/after-renovation-cleaning.html");
assert.equal(afterRenovationRuService?.description, serviceContent["after-renovation"].ru.intro);
assert.deepEqual(afterRenovationRuFaq?.mainEntity.map(item => [item.name, item.acceptedAnswer?.text]), serviceContent["after-renovation"].ru.faqs);
assert.ok(sitemap.includes("https://go-clean.uz/ru/after-renovation-cleaning.html"), "sitemap must include RU after-renovation");
assert.ok(homeRu.includes('href="ru/after-renovation-cleaning.html">Уборка после ремонта</a>'), "RU homepage must link to RU after-renovation");

const furnitureUz = await read("furniture-cleaning.html");
const furnitureRu = await read("ru/furniture-cleaning.html");
assert.match(furnitureRu, /<html lang="ru">/);
assert.match(furnitureRu, /<base href="\.\.\/">/);
assert.match(furnitureRu, /<title>Химчистка мебели в Ташкенте — GoClean<\/title>/);
assert.match(furnitureRu, /<meta name="description" content="Химчистка диванов, кресел и мягкой мебели в Ташкенте:/);
assert.match(furnitureRu, /<link rel="canonical" href="https:\/\/go-clean\.uz\/ru\/furniture-cleaning\.html">/);
for (const [hreflang, href] of [["uz", "https://go-clean.uz/furniture-cleaning.html"], ["ru", "https://go-clean.uz/ru/furniture-cleaning.html"], ["x-default", "https://go-clean.uz/furniture-cleaning.html"]]) {
  assert.ok(furnitureUz.includes(`<link rel="alternate" hreflang="${hreflang}" href="${href}">`), `UZ furniture is missing ${hreflang} hreflang`);
  assert.ok(furnitureRu.includes(`<link rel="alternate" hreflang="${hreflang}" href="${href}">`), `RU furniture is missing ${hreflang} hreflang`);
}
assert.match(furnitureUz, /class="page-language-link" href="ru\/furniture-cleaning\.html"/);
assert.match(furnitureRu, /data-page-language="ru" data-language-switch="furniture-cleaning\.html"/);
assert.match(furnitureRu, /<h1>Химчистка мебели в Ташкенте<\/h1>/);
assert.ok((furnitureUz.match(/data-service-area-option/g) || []).length >= 2, "UZ furniture CTAs must keep optional area");
assert.ok((furnitureRu.match(/data-service-area-option/g) || []).length >= 2, "RU furniture CTAs must keep optional area");
for (const [question, answer] of serviceContent["furniture-cleaning"].ru.faqs) {
  assert.ok(furnitureRu.includes(question) && furnitureRu.includes(answer), `RU furniture must display FAQ: ${question}`);
}
assert.equal((furnitureRu.match(/<details>/g) || []).length, 6, "RU furniture must contain six visible FAQs");
for (const [heading, text] of serviceContent["furniture-cleaning"].ru.sections) {
  assert.ok(furnitureRu.includes(heading) && furnitureRu.includes(text), `RU furniture must display guidance: ${heading}`);
}
for (const [href, label] of serviceContent["furniture-cleaning"].localizedLinks.ru) {
  assert.ok(furnitureRu.includes(`href="${href}">${label}`), `RU furniture must link to ${href}`);
}
assert.equal((furnitureUz.match(/<details>/g) || []).length, 12, "UZ furniture source must contain six FAQs in both language blocks");
for (const [heading, text] of serviceContent["furniture-cleaning"].uz.sections) {
  assert.ok(furnitureUz.includes(heading) && furnitureUz.includes(text), `UZ furniture must display guidance: ${heading}`);
}
assert.ok(furnitureRu.includes("от 100 000 сум") && furnitureRu.includes("за одно посадочное место"), "RU furniture price and unit must stay unchanged");
assert.ok(furnitureUz.includes("100 000 so‘mdan") && furnitureUz.includes("bir o‘rindiq"), "UZ furniture price and unit must stay unchanged");
assert.doesNotMatch(furnitureRu, /дезинф|безопасн|все пятна исчезнут полностью[^?]/i);
const furnitureRuNodes = graphNodes(jsonLdBlocks(furnitureRu));
const furnitureRuService = furnitureRuNodes.find(node => node["@type"] === "Service");
const furnitureRuFaq = furnitureRuNodes.find(node => node["@type"] === "FAQPage");
assert.equal(furnitureRuService?.url, "https://go-clean.uz/ru/furniture-cleaning.html");
assert.equal(furnitureRuService?.description, serviceContent["furniture-cleaning"].ru.intro);
assert.deepEqual(furnitureRuFaq?.mainEntity.map(item => [item.name, item.acceptedAnswer?.text]), serviceContent["furniture-cleaning"].ru.faqs);
assert.ok(sitemap.includes("https://go-clean.uz/ru/furniture-cleaning.html"), "sitemap must include RU furniture");
assert.ok(homeRu.includes('href="ru/furniture-cleaning.html">Химчистка мебели</a>'), "RU homepage must link to RU furniture");

const carpetUz = await read("carpet-cleaning.html");
const carpetRu = await read("ru/carpet-cleaning.html");
assert.match(carpetRu, /<html lang="ru">/);
assert.match(carpetRu, /<base href="\.\.\/">/);
assert.match(carpetRu, /<title>Чистка ковров в Ташкенте — GoClean<\/title>/);
assert.match(carpetRu, /<meta name="description" content="Чистка ковров и ковровых покрытий в Ташкенте:/);
assert.match(carpetRu, /<link rel="canonical" href="https:\/\/go-clean\.uz\/ru\/carpet-cleaning\.html">/);
for (const [hreflang, href] of [["uz", "https://go-clean.uz/carpet-cleaning.html"], ["ru", "https://go-clean.uz/ru/carpet-cleaning.html"], ["x-default", "https://go-clean.uz/carpet-cleaning.html"]]) {
  assert.ok(carpetUz.includes(`<link rel="alternate" hreflang="${hreflang}" href="${href}">`), `UZ carpet is missing ${hreflang} hreflang`);
  assert.ok(carpetRu.includes(`<link rel="alternate" hreflang="${hreflang}" href="${href}">`), `RU carpet is missing ${hreflang} hreflang`);
}
assert.match(carpetUz, /class="page-language-link" href="ru\/carpet-cleaning\.html"/);
assert.match(carpetRu, /data-page-language="ru" data-language-switch="carpet-cleaning\.html"/);
assert.match(carpetRu, /<h1>Чистка ковров в Ташкенте<\/h1>/);
assert.equal(
  (carpetUz.match(/<details>/g) || []).length,
  serviceContent["carpet-cleaning"].uz.faqs.length + serviceContent["carpet-cleaning"].ru.faqs.length,
  "bilingual UZ carpet fallback FAQ count must match content"
);
assert.equal((carpetRu.match(/<details>/g) || []).length, serviceContent["carpet-cleaning"].ru.faqs.length, "RU carpet FAQ count must match content");
assert.match(carpetRu, /Как оценить примерную площадь\?/);
assert.match(carpetRu, /2 × 3 метра — это примерно 6 м²/);
assert.match(carpetRu, /Заявку можно оставить по имени и телефону, даже если площадь пока неизвестна/);
assert.match(carpetRu, /href="ru\/furniture-cleaning\.html">Химчистка мебели/);
assert.ok((carpetUz.match(/data-service-area-option/g) || []).length >= 2, "UZ carpet CTAs must keep optional area");
assert.ok((carpetRu.match(/data-service-area-option/g) || []).length >= 2, "RU carpet CTAs must keep optional area");
assert.doesNotMatch(carpetRu, /дезинф|гипоаллерген|экологич|все (пятна|запахи).*(удалим|исчезнут)|чистим на дому/i);
const carpetRuNodes = graphNodes(jsonLdBlocks(carpetRu));
const carpetRuService = carpetRuNodes.find(node => node["@type"] === "Service");
const carpetRuFaq = carpetRuNodes.find(node => node["@type"] === "FAQPage");
assert.equal(carpetRuService?.url, "https://go-clean.uz/ru/carpet-cleaning.html");
assert.equal(carpetRuService?.description, serviceContent["carpet-cleaning"].ru.intro);
assert.deepEqual(carpetRuFaq?.mainEntity.map(item => [item.name, item.acceptedAnswer?.text]), serviceContent["carpet-cleaning"].ru.faqs);
assert.ok(sitemap.includes("https://go-clean.uz/ru/carpet-cleaning.html"), "sitemap must include RU carpet");
assert.ok(homeRu.includes('href="ru/carpet-cleaning.html">Чистка ковров</a>'), "RU homepage must link to RU carpet");

const windowUz = await read("window-cleaning.html");
const windowRu = await read("ru/window-cleaning.html");
assert.match(windowRu, /<html lang="ru">/);
assert.match(windowRu, /<base href="\.\.\/">/);
assert.match(windowRu, /<title>Мойка окон в Ташкенте — GoClean<\/title>/);
assert.match(windowRu, /<meta name="description" content="Мойка окон в Ташкенте:/);
assert.match(windowRu, /<link rel="canonical" href="https:\/\/go-clean\.uz\/ru\/window-cleaning\.html">/);
for (const [hreflang, href] of [["uz", "https://go-clean.uz/window-cleaning.html"], ["ru", "https://go-clean.uz/ru/window-cleaning.html"], ["x-default", "https://go-clean.uz/window-cleaning.html"]]) {
  assert.ok(windowUz.includes(`<link rel="alternate" hreflang="${hreflang}" href="${href}">`), `UZ window is missing ${hreflang} hreflang`);
  assert.ok(windowRu.includes(`<link rel="alternate" hreflang="${hreflang}" href="${href}">`), `RU window is missing ${hreflang} hreflang`);
}
assert.match(windowUz, /class="page-language-link" href="ru\/window-cleaning\.html"/);
assert.match(windowRu, /data-page-language="ru" data-language-switch="window-cleaning\.html"/);
assert.match(windowRu, /<h1>Мойка окон в Ташкенте<\/h1>/);
assert.equal((windowRu.match(/<details>/g) || []).length, 0, "RU window must not invent FAQs");
assert.ok((windowUz.match(/data-service-area-option/g) || []).length >= 2, "UZ window CTAs must keep optional area");
assert.ok((windowRu.match(/data-service-area-option/g) || []).length >= 2, "RU window CTAs must keep optional area");
assert.doesNotMatch(windowRu, /альпинист|высот|фасад|безопасн/i);
const windowRuNodes = graphNodes(jsonLdBlocks(windowRu));
const windowRuService = windowRuNodes.find(node => node["@type"] === "Service");
assert.equal(windowRuNodes.filter(node => node["@type"] === "FAQPage").length, 0, "RU window must not add FAQ schema");
assert.equal(windowRuService?.url, "https://go-clean.uz/ru/window-cleaning.html");
assert.equal(windowRuService?.description, "GoClean моет внутренние и наружные поверхности окон, рамы и подоконники в Ташкенте с использованием профессиональных средств.");
assert.ok(sitemap.includes("https://go-clean.uz/ru/window-cleaning.html"), "sitemap must include RU window");
assert.ok(homeRu.includes('href="ru/window-cleaning.html">Мойка окон</a>'), "RU homepage must link to RU window");

const curtainUz = await read("curtain-cleaning.html");
const curtainRu = await read("ru/curtain-cleaning.html");
assert.match(curtainRu, /<html lang="ru">/);
assert.match(curtainRu, /<base href="\.\.\/">/);
assert.match(curtainRu, /<title>Стирка штор в Ташкенте — GoClean<\/title>/);
assert.match(curtainRu, /<meta name="description" content="Стирка штор в Ташкенте:/);
assert.match(curtainRu, /<link rel="canonical" href="https:\/\/go-clean\.uz\/ru\/curtain-cleaning\.html">/);
for (const [hreflang, href] of [["uz", "https://go-clean.uz/curtain-cleaning.html"], ["ru", "https://go-clean.uz/ru/curtain-cleaning.html"], ["x-default", "https://go-clean.uz/curtain-cleaning.html"]]) {
  assert.ok(curtainUz.includes(`<link rel="alternate" hreflang="${hreflang}" href="${href}">`), `UZ curtain is missing ${hreflang} hreflang`);
  assert.ok(curtainRu.includes(`<link rel="alternate" hreflang="${hreflang}" href="${href}">`), `RU curtain is missing ${hreflang} hreflang`);
}
assert.match(curtainUz, /class="page-language-link" href="ru\/curtain-cleaning\.html"/);
assert.match(curtainRu, /data-page-language="ru" data-language-switch="curtain-cleaning\.html"/);
assert.match(curtainRu, /<h1>Стирка штор в Ташкенте<\/h1>/);
assert.equal((curtainRu.match(/<details>/g) || []).length, 0, "RU curtain must not invent FAQs");
assert.ok((curtainUz.match(/data-service-area-option/g) || []).length >= 2, "UZ curtain CTAs must keep optional area");
assert.ok((curtainRu.match(/data-service-area-option/g) || []).length >= 2, "RU curtain CTAs must keep optional area");
assert.doesNotMatch(curtainRu, /гарант|жалюзи|тюль|достав|забер|безопасн/i);
const curtainRuNodes = graphNodes(jsonLdBlocks(curtainRu));
const curtainRuService = curtainRuNodes.find(node => node["@type"] === "Service");
assert.equal(curtainRuNodes.filter(node => node["@type"] === "FAQPage").length, 0, "RU curtain must not add FAQ schema");
assert.equal(curtainRuService?.url, "https://go-clean.uz/ru/curtain-cleaning.html");
assert.equal(curtainRuService?.description, "GoClean определяет тип ткани, стирает шторы в подходящем режиме и по согласованию выполняет повторную установку.");
assert.ok(sitemap.includes("https://go-clean.uz/ru/curtain-cleaning.html"), "sitemap must include RU curtain");
assert.ok(homeRu.includes('href="ru/curtain-cleaning.html">Стирка штор</a>'), "RU homepage must link to RU curtain");

const blanketUz = await read("blanket-cleaning.html");
const blanketRu = await read("ru/blanket-cleaning.html");
assert.match(blanketRu, /<html lang="ru">/);
assert.match(blanketRu, /<base href="\.\.\/">/);
assert.match(blanketRu, /<title>Стирка пледов в Ташкенте — GoClean<\/title>/);
assert.match(blanketRu, /<meta name="description" content="Стирка пледов в Ташкенте:/);
assert.match(blanketRu, /<link rel="canonical" href="https:\/\/go-clean\.uz\/ru\/blanket-cleaning\.html">/);
for (const [hreflang, href] of [["uz", "https://go-clean.uz/blanket-cleaning.html"], ["ru", "https://go-clean.uz/ru/blanket-cleaning.html"], ["x-default", "https://go-clean.uz/blanket-cleaning.html"]]) {
  assert.ok(blanketUz.includes(`<link rel="alternate" hreflang="${hreflang}" href="${href}">`), `UZ blanket is missing ${hreflang} hreflang`);
  assert.ok(blanketRu.includes(`<link rel="alternate" hreflang="${hreflang}" href="${href}">`), `RU blanket is missing ${hreflang} hreflang`);
}
assert.match(blanketUz, /class="page-language-link" href="ru\/blanket-cleaning\.html"/);
assert.match(blanketRu, /data-page-language="ru" data-language-switch="blanket-cleaning\.html"/);
assert.match(blanketRu, /<h1>Стирка пледов в Ташкенте<\/h1>/);
assert.equal((blanketRu.match(/<details>/g) || []).length, 0, "RU blanket must not invent FAQs");
assert.ok((blanketUz.match(/data-service-area-option/g) || []).length >= 2, "UZ blanket CTAs must keep optional area");
assert.ok((blanketRu.match(/data-service-area-option/g) || []).length >= 2, "RU blanket CTAs must keep optional area");
assert.doesNotMatch(blanketRu, /гарант|матрас|одеял|постель|достав|забер|дезинф|безопасн|сохран/i);
const blanketRuNodes = graphNodes(jsonLdBlocks(blanketRu));
const blanketRuService = blanketRuNodes.find(node => node["@type"] === "Service");
assert.equal(blanketRuNodes.filter(node => node["@type"] === "FAQPage").length, 0, "RU blanket must not add FAQ schema");
assert.equal(blanketRuService?.url, "https://go-clean.uz/ru/blanket-cleaning.html");
assert.equal(blanketRuService?.description, "GoClean предлагает стирку пледов в Ташкенте. Услуга включает определение материала, обработку пятен, стирку и сушку.");
assert.ok(sitemap.includes("https://go-clean.uz/ru/blanket-cleaning.html"), "sitemap must include RU blanket");
assert.ok(homeRu.includes('href="ru/blanket-cleaning.html">Стирка пледов</a>'), "RU homepage must link to RU blanket");

const pavingUz = await read("paving-cleaning.html");
const pavingRu = await read("ru/paving-cleaning.html");
assert.match(pavingRu, /<html lang="ru">/);
assert.match(pavingRu, /<base href="\.\.\/">/);
assert.match(pavingRu, /<title>Чистка брусчатки в Ташкенте — GoClean<\/title>/);
assert.match(pavingRu, /<meta name="description" content="Чистка брусчатки в Ташкенте:/);
assert.match(pavingRu, /<link rel="canonical" href="https:\/\/go-clean\.uz\/ru\/paving-cleaning\.html">/);
for (const [hreflang, href] of [["uz", "https://go-clean.uz/paving-cleaning.html"], ["ru", "https://go-clean.uz/ru/paving-cleaning.html"], ["x-default", "https://go-clean.uz/paving-cleaning.html"]]) {
  assert.ok(pavingUz.includes(`<link rel="alternate" hreflang="${hreflang}" href="${href}">`), `UZ paving is missing ${hreflang} hreflang`);
  assert.ok(pavingRu.includes(`<link rel="alternate" hreflang="${hreflang}" href="${href}">`), `RU paving is missing ${hreflang} hreflang`);
}
assert.match(pavingUz, /class="page-language-link" href="ru\/paving-cleaning\.html"/);
assert.match(pavingRu, /data-page-language="ru" data-language-switch="paving-cleaning\.html"/);
assert.match(pavingRu, /<h1>Чистка брусчатки в Ташкенте<\/h1>/);
assert.equal((pavingRu.match(/<details>/g) || []).length, 0, "RU paving must not invent FAQs");
assert.ok((pavingUz.match(/data-service-area-option/g) || []).length >= 2, "UZ paving CTAs must keep optional area");
assert.ok((pavingRu.match(/data-service-area-option/g) || []).length >= 2, "RU paving CTAs must keep optional area");
assert.doesNotMatch(pavingRu, /гарант|фасад|альпинист|безопасн|сертифик|дезинф|срок/i);
const pavingRuNodes = graphNodes(jsonLdBlocks(pavingRu));
const pavingRuService = pavingRuNodes.find(node => node["@type"] === "Service");
assert.equal(pavingRuNodes.filter(node => node["@type"] === "FAQPage").length, 0, "RU paving must not add FAQ schema");
assert.equal(pavingRuService?.url, "https://go-clean.uz/ru/paving-cleaning.html");
assert.equal(pavingRuService?.description, "GoClean очищает брусчатку во дворах и на входных дорожках в Ташкенте. Услуга включает подготовку территории, мойку под высоким давлением, обработку пятен и финальную уборку.");
assert.ok(sitemap.includes("https://go-clean.uz/ru/paving-cleaning.html"), "sitemap must include RU paving");
assert.ok(homeRu.includes('href="ru/paving-cleaning.html">Чистка брусчатки</a>'), "RU homepage must link to RU paving");

const marbleUz = await read("marble-cleaning.html");
const marbleRu = await read("ru/marble-cleaning.html");
assert.match(marbleRu, /<html lang="ru">/);
assert.match(marbleRu, /<base href="\.\.\/">/);
assert.match(marbleRu, /<title>Чистка и полировка мрамора в Ташкенте — GoClean<\/title>/);
assert.match(marbleRu, /<meta name="description" content="Чистка и полировка мрамора в Ташкенте:/);
assert.match(marbleRu, /<link rel="canonical" href="https:\/\/go-clean\.uz\/ru\/marble-cleaning\.html">/);
for (const [hreflang, href] of [["uz", "https://go-clean.uz/marble-cleaning.html"], ["ru", "https://go-clean.uz/ru/marble-cleaning.html"], ["x-default", "https://go-clean.uz/marble-cleaning.html"]]) {
  assert.ok(marbleUz.includes(`<link rel="alternate" hreflang="${hreflang}" href="${href}">`), `UZ marble is missing ${hreflang} hreflang`);
  assert.ok(marbleRu.includes(`<link rel="alternate" hreflang="${hreflang}" href="${href}">`), `RU marble is missing ${hreflang} hreflang`);
}
assert.match(marbleUz, /class="page-language-link" href="ru\/marble-cleaning\.html"/);
assert.match(marbleRu, /data-page-language="ru" data-language-switch="marble-cleaning\.html"/);
assert.match(marbleRu, /<h1>Чистка и полировка мрамора в Ташкенте<\/h1>/);
assert.equal((marbleRu.match(/<details>/g) || []).length, 0, "RU marble must not invent FAQs");
assert.ok((marbleUz.match(/data-service-area-option/g) || []).length >= 2, "UZ marble CTAs must keep optional area");
assert.ok((marbleRu.match(/data-service-area-option/g) || []).length >= 2, "RU marble CTAs must keep optional area");
assert.doesNotMatch(marbleRu, /гарант|дезинф|безопасн|сертифик|срок|восстанов/i);
const marbleRuNodes = graphNodes(jsonLdBlocks(marbleRu));
const marbleRuService = marbleRuNodes.find(node => node["@type"] === "Service");
assert.equal(marbleRuNodes.filter(node => node["@type"] === "FAQPage").length, 0, "RU marble must not add FAQ schema");
assert.equal(marbleRuService?.url, "https://go-clean.uz/ru/marble-cleaning.html");
assert.equal(marbleRuService?.description, "GoClean очищает и полирует мраморные поверхности в Ташкенте. Услуга включает диагностику поверхности, специальные средства, механическую очистку и финальную полировку.");
assert.ok(sitemap.includes("https://go-clean.uz/ru/marble-cleaning.html"), "sitemap must include RU marble");
assert.ok(homeRu.includes('href="ru/marble-cleaning.html">Чистка мрамора</a>'), "RU homepage must link to RU marble");

console.log(`SEO artifact validated for ${publicPages.length} public pages and ${context.window.GOCLEAN_SERVICES.length} services.`);
