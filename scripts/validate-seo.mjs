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
  "about.html",
  "business.html",
  "office-cleaning.html",
  "ru/index.html",
  "ru/office-cleaning.html",
  "contact.html",
  "privacy.html",
  "terms.html"
];

for (const page of publicPages) {
  const html = await read(page);
  assert.match(html, /<meta\s+name=["']description["']/i, `${page} is missing a description`);
  assert.match(html, /<link\s+rel=["']canonical["']/i, `${page} is missing a canonical`);
  assert.match(html, /shared\.js\?v=24/, `${page} must load the current shared navigation asset`);
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
assert.match(sitemap, /https:\/\/go-clean\.uz\/privacy\.html/);
assert.match(sitemap, /https:\/\/go-clean\.uz\/terms\.html/);
assert.doesNotMatch(sitemap, /legal\.html\?doc=/);
assert.match(sitemap, /https:\/\/go-clean\.uz\/ru\//);
assert.match(sitemap, /https:\/\/go-clean\.uz\/ru\/office-cleaning\.html/);

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

console.log(`SEO artifact validated for ${publicPages.length} public pages and ${context.window.GOCLEAN_SERVICES.length} services.`);
