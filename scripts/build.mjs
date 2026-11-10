import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import vm from "node:vm";
import { serviceContent } from "./service-content.mjs";

const root = process.cwd();
const output = resolve(root, "dist");
if (output !== `${root}/dist`) throw new Error("Unexpected output path");

await rm(output, { recursive: true, force: true });
await mkdir(resolve(output, "client"), { recursive: true });
await mkdir(resolve(output, "server"), { recursive: true });
await mkdir(resolve(output, ".openai"), { recursive: true });

const entries = await readdir(root, { withFileTypes: true });
const excludedClientFiles = new Set(["auth.html", "booking.html", "booking.js"]);
for (const entry of entries) {
  if (entry.isFile() && !excludedClientFiles.has(entry.name) && /\.(html|css|js|txt|xml|svg)$/.test(entry.name)) {
    await cp(resolve(root, entry.name), resolve(output, "client", entry.name));
  }
}
await cp(resolve(root, "public"), resolve(output, "client", "public"), { recursive: true });

const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
})[character]);

const dataContext = { window: {} };
vm.runInNewContext(await readFile(resolve(root, "data.js"), "utf8"), dataContext);

const organizationId = "https://go-clean.uz/#organization";
const jsonLd = value => JSON.stringify(value).replace(/</g, "\\u003c");

function serviceStructuredData(service, metadata) {
  const url = `https://go-clean.uz/${metadata.file}`;
  const content = serviceContent[service.slug];
  const graph = [
    {
      "@type": "Service",
      "@id": `${url}#service`,
      name: service.name,
      serviceType: service.name,
      description: content?.uz.intro || service.description,
      url,
      areaServed: { "@type": "City", name: "Toshkent" },
      provider: { "@id": organizationId }
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${url}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Bosh sahifa", item: "https://go-clean.uz/" },
        { "@type": "ListItem", position: 2, name: "Xizmatlar", item: "https://go-clean.uz/services.html" },
        { "@type": "ListItem", position: 3, name: service.name, item: url }
      ]
    }
  ];
  if (content) graph.push({
    "@type": "FAQPage",
    "@id": `${url}#faq`,
    mainEntity: content.uz.faqs.map(([name, text]) => ({
      "@type": "Question",
      name,
      acceptedAnswer: { "@type": "Answer", text }
    }))
  });
  return {
    "@context": "https://schema.org",
    "@graph": graph
  };
}

function renderEnrichedServiceContent(service) {
  const content = serviceContent[service.slug];
  if (!content) return "";
  const renderLanguage = (lang, copy, hidden = false) => `<div data-content-lang="${lang}"${hidden ? " hidden" : ""}><p class="service-content-intro">${escapeHtml(copy.intro)}</p><div class="service-price-explainer"><h2>${lang === "ru" ? "Как определяется стоимость?" : "Narx qanday aniqlanadi?"}</h2><p>${escapeHtml(copy.price)}</p></div><h2>${lang === "ru" ? "Частые вопросы" : "Ko‘p so‘raladigan savollar"}</h2><div class="service-faq">${copy.faqs.map(([question, answer]) => `<details><summary>${escapeHtml(question)}</summary><p>${escapeHtml(answer)}</p></details>`).join("")}</div></div>`;
  const links = content.links.map(([href, label]) => `<a href="${href}">${escapeHtml(label)}</a>`).join("");
  return `<section class="section service-seo-content"><div class="container"><div class="service-content-card">${renderLanguage("uz", content.uz)}${renderLanguage("ru", content.ru, true)}<nav class="service-related" aria-label="Tegishli xizmatlar"><b>Tegishli sahifalar:</b>${links}</nav></div></div></section>`;
}

function renderServicePage(service, metadata = {}) {
  const included = service.includes
    .map((item, index) => service.includePhotos?.[index]
      ? `<article><img src="public/assets/service-details/${encodeURIComponent(service.includePhotos[index])}" alt="${escapeHtml(item)}" width="960" height="540" loading="lazy" decoding="async"><div><span>0${index + 1}</span><b>${escapeHtml(item)}</b></div></article>`
      : `<div><span>0${index + 1}</span><b>${escapeHtml(item)}</b></div>`)
    .join("");
  const visualClass = service.includePhotos?.length ? " visual-included-grid" : "";
  const title = metadata.title || `${service.name} Toshkentda — Goclean.uz`;
  const artTitle = metadata.artTitle || "Sifat kafolati";
  const artText = metadata.artText || "Natija yoqmasa, bepul qayta tozalaymiz";
  const structuredData = jsonLd(serviceStructuredData(service, metadata));
  const enrichedContent = renderEnrichedServiceContent(service);
  const contentLanguageScript = enrichedContent
    ? `<script>(function(){const sync=lang=>document.querySelectorAll("[data-content-lang]").forEach(el=>el.hidden=el.dataset.contentLang!==lang);sync(window.getGoCleanLanguage?.()||"uz");addEventListener("goclean:languagechange",event=>sync(event.detail.lang))})()</script>`
    : "";
  return `<!doctype html><html lang="uz"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><script type="application/ld+json">${structuredData}</script><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet"><link rel="stylesheet" href="styles.css?v=19"></head><body><div data-site-header></div><main><section class="service-detail-hero"><div class="container detail-grid"><div><div class="breadcrumbs"><a href="index.html">Bosh sahifa</a><span>→</span><a href="services.html">Xizmatlar</a><span>→</span><b>${escapeHtml(service.name)}</b></div><h1>${escapeHtml(service.name)}</h1><p>${escapeHtml(service.description)}</p><div class="detail-price"><strong>${escapeHtml(service.price)}</strong><span>${escapeHtml(service.unit)}</span></div><div class="detail-actions"><button class="primary-button" type="button" data-service-lead="${escapeHtml(service.name)}">Raqam qoldirish →</button><a class="outline-button" href="tel:+998977071515">Qo‘ng‘iroq qilish</a></div></div><div class="service-art"><img class="service-art-icon" src="public/assets/icons-3d/${encodeURIComponent(service.slug)}.webp" alt="" aria-hidden="true"><b>${escapeHtml(artTitle)}</b><small>${escapeHtml(artText)}</small></div></div></section><section class="detail-content"><div class="container detail-columns"><div><h2>Nimalar bajariladi?</h2><div class="included-grid${visualClass}">${included}</div></div><aside class="sticky-order"><h3>Operator bilan gaplashmoqchimisiz?</h3><p>Ism va raqamingizni qoldiring. Xizmat tarkibi, manzil, vaqt va to‘lovni telefonda kelishasiz.</p><button class="primary-button full" type="button" data-service-lead="${escapeHtml(service.name)}">Raqam qoldirish</button><a class="text-link" href="contact.html">Savolim bor →</a></aside></div></section>${enrichedContent}<section class="section process compact"><div class="container"><div class="section-heading centered"><h2>Qanday ishlaydi?</h2></div><div class="steps"><article><span>1</span><div class="step-icon"><img src="public/assets/icons-3d/process-configure.webp" alt="" aria-hidden="true"></div><h3>Xizmatni tanlang</h3><p>Kerakli xizmatni tanlab, qisqa arizaga o‘ting.</p></article><article><span>2</span><div class="step-icon"><img src="public/assets/icons-3d/process-consultation.webp" alt="" aria-hidden="true"></div><h3>Raqamingizni qoldiring</h3><p>Faqat ism va telefon raqamingiz yetarli.</p></article><article><span>3</span><div class="step-icon"><img src="public/assets/icons-3d/process-quote-plan.webp" alt="" aria-hidden="true"></div><h3>Operator bilan kelishing</h3><p>Manzil, vaqt, xizmat tarkibi va narxni telefonda aniqlashtiring.</p></article></div></div></section></main><div data-site-footer></div><script src="shared.js?v=21"></script>${contentLanguageScript}</body></html>`;
}

const canonicalServicePages = {
  "general-cleaning": {
    file: "general-cleaning.html",
    description: "Toshkentda kvartira, hovli va ofis uchun general tozalash. Ochiq yuzalar, pol, plintus, oshxona, sanuzel, eshik va yoritgichlar batafsil tozalanadi."
  },
  "furniture-cleaning": {
    file: "furniture-cleaning.html",
    description: "Toshkentda divan, kreslo va yumshoq mebel kimyoviy tozalash. Dog‘, chang va yoqimsiz hidlarni professional ekstraktor yordamida chiqaramiz."
  },
  "after-renovation": {
    file: "after-renovation-cleaning.html",
    description: "Toshkentda ta’mirdan keyin tozalash. Qurilish changi, bo‘yoq va yelim izlarini professional uskuna hamda maxsus kimyo bilan tozalaymiz."
  },
  "window-cleaning": {
    file: "window-cleaning.html",
    description: "Toshkentda oyna yuvish xizmati. Ichki va tashqi oynalar, romlar hamda tokchalarni professional vositalar bilan iz qoldirmay yuvamiz."
  },
  "carpet-cleaning": {
    file: "carpet-cleaning.html",
    description: "Toshkentda gilam yuvish xizmati. Chang, dog‘ va hidlarni gilam turiga mos texnologiya bilan chuqur tozalaymiz va quritamiz."
  },
  disinfection: {
    file: "disinfection.html",
    description: "Toshkentda uy va biznes obyektlari uchun dezinfeksiya. Maydon va foydalanish turiga mos vositalar bilan professional antibakterial ishlov beramiz."
  },
  "marble-cleaning": {
    file: "marble-cleaning.html",
    title: "Marmar tozalash va jilolash Toshkentda — Goclean.uz",
    description: "Toshkentda marmar tozalash va jilolash. Tosh yuzasiga mos kimyo va uskunalar bilan kir, dog‘ hamda xiralikni yo‘qotamiz."
  },
  "paving-cleaning": {
    file: "paving-cleaning.html",
    title: "Bruschatka yuvish Toshkentda — Goclean.uz",
    description: "Toshkentda bruschatka yuvish. Hovli va kirish yo‘laklaridagi chang, loy hamda chuqur singgan kirlarni yuqori bosimli uskuna bilan tozalaymiz."
  },
  "curtain-cleaning": {
    file: "curtain-cleaning.html",
    title: "Parda yuvish Toshkentda — Goclean.uz",
    description: "Toshkentda parda yuvish. Mato turini aniqlab, mos rejimda yuvamiz, quritamiz va kelishuv asosida qayta osamiz."
  },
  "facade-cleaning": {
    file: "facade-cleaning.html",
    title: "Fasad yuvish Toshkentda — Goclean.uz",
    description: "Toshkentda bino fasadi va vitrinalarni yuvish. Balandlik hamda yuza turiga qarab mos uskuna va mutaxassislarni tanlaymiz."
  },
  "blanket-cleaning": {
    file: "blanket-cleaning.html",
    title: "Pled yuvish Toshkentda — Goclean.uz",
    description: "Toshkentda pled va qalin tekstil yuvish. Materialiga mos yuvish hamda quritish rejimini tanlab, dog‘larga alohida ishlov beramiz."
  },
  "emergency-cleaning": {
    file: "emergency-cleaning.html",
    title: "Favqulodda holatdan keyin tozalash Toshkentda — Goclean.uz",
    description: "Toshkentda suv bosishi, yong‘in va boshqa hodisalardan keyin tozalash. Holatni baholab, obyekt uchun tozalash rejasini tuzamiz."
  },
  "odor-removal": {
    file: "odor-removal.html",
    title: "Yoqimsiz hidlarni yo‘qotish Toshkentda — Goclean.uz",
    description: "Toshkentda yoqimsiz hidlarni yo‘qotish. Hidni maskalamasdan, manbasini aniqlab, yuzalarni tozalash va neytrallash ishlarini bajaramiz."
  },
  "mold-removal": {
    file: "mold-removal.html",
    title: "Mog‘orni yo‘qotish Toshkentda — Goclean.uz",
    description: "Toshkentda mog‘orni yo‘qotish. Zararlangan maydonni aniqlab, himoya choralariga rioya qilgan holda tozalash va antibakterial ishlov beramiz."
  }
};

for (const slug of ["marble-cleaning", "paving-cleaning", "curtain-cleaning", "facade-cleaning", "blanket-cleaning", "emergency-cleaning", "odor-removal", "mold-removal"]) {
  canonicalServicePages[slug].artTitle = "Xizmat haqida";
  canonicalServicePages[slug].artText = dataContext.window.GOCLEAN_SERVICES.find(item => item.slug === slug)?.summary || "Tafsilotlarni operator bilan kelishasiz";
}

const sourceHeader = `<div class="announcement"><span>Toshkent bo‘ylab har kuni 08:00–21:00</span><a href="tel:+998977071515">+998 97 707 15 15</a></div><header class="site-header"><div class="nav-wrap container"><a class="brand" href="index.html" aria-label="Goclean bosh sahifa"><img class="brand-logo" src="public/assets/goclean-logo.webp" alt="GoClean" width="200" height="86"></a><nav id="mainNav" class="main-nav"><a href="services.html">Xizmatlar</a><a href="office-cleaning.html">Ofis tozalash</a><a href="business.html">Biznes uchun</a><a href="blog.html">Tavsiyalar</a><a href="contact.html">Kontaktlar</a></nav><div class="nav-actions"><button class="lang" id="globalLangToggle" type="button" aria-label="Tilni almashtirish">RU</button><a class="outline-button desktop-cta" href="index.html?offer=first-order">Maxsus chegirmani olish</a><button class="menu-button" id="menuButton" type="button" aria-expanded="false" aria-controls="mobileDrawer" aria-label="Menyuni ochish"><span></span><span></span><span></span></button></div></div></header>`;
const sourceFooter = `<footer><div class="container footer-grid"><div><a class="brand footer-brand" href="index.html"><img class="brand-logo" src="public/assets/goclean-logo.webp" alt="GoClean" width="200" height="86"></a><p>Uy va biznes uchun professional tozalash xizmati.</p></div><div><b>Xizmatlar</b><a href="services.html">Barcha xizmatlar</a><a href="general-cleaning.html">General tozalash</a><a href="furniture-cleaning.html">Mebel tozalash</a><a href="window-cleaning.html">Oyna yuvish</a></div><div><b>Kompaniya</b><a href="about.html">Biz haqimizda</a><a href="business.html">Biznes uchun</a><a href="blog.html">Tavsiyalar</a><a href="contact.html">Kontaktlar</a></div><div><b>Bog‘lanish</b><a href="tel:+998977071515">+998 97 707 15 15</a><a href="https://t.me/gocleanuz">Telegram</a><a href="mailto:hello@goclean.uz">hello@goclean.uz</a><span>Toshkent, O‘zbekiston</span></div></div><div class="container footer-bottom"><span>© 2026 Goclean.uz</span><div><a href="privacy.html">Maxfiylik siyosati</a><a href="terms.html">Foydalanish shartlari</a></div></div></footer>`;

function renderCatalogCard(service) {
  const metadata = canonicalServicePages[service.slug];
  const href = metadata?.file || `service.html?slug=${encodeURIComponent(service.slug)}`;
  const base = service.image.replace(/\.[^.]+$/, "");
  return `<article class="catalog-card" data-service="${escapeHtml(service.slug)}"><a class="catalog-image" href="${href}"><picture><source media="(max-width:560px)" srcset="public/assets/services/${base}-mobile.avif" type="image/avif"><source srcset="public/assets/services/${base}.avif" type="image/avif"><img src="public/assets/services/${escapeHtml(service.image)}" alt="${escapeHtml(service.name)}" loading="lazy" decoding="async" width="1200" height="800"></picture></a><div class="catalog-card-body"><h3><a href="${href}">${escapeHtml(service.name)}</a></h3><p>${escapeHtml(service.summary)}</p><div class="catalog-price"><strong>${escapeHtml(service.price)}</strong><small>${escapeHtml(service.unit)}</small></div><div class="catalog-actions"><a class="detail-cta" href="${href}">Batafsil</a><button class="mini-order" type="button" data-service-lead="${escapeHtml(service.name)}">Raqam qoldirish</button></div></div></article>`;
}

for (const [slug, metadata] of Object.entries(canonicalServicePages)) {
  const service = dataContext.window.GOCLEAN_SERVICES.find(item => item.slug === slug);
  if (!service) throw new Error(`${slug} service data is missing`);
  await writeFile(resolve(output, "client", metadata.file), renderServicePage(service, metadata));
}

const seoPages = {
  "index.html": { canonical: "https://go-clean.uz/" },
  "general-cleaning.html": {
    canonical: "https://go-clean.uz/general-cleaning.html",
    description: canonicalServicePages["general-cleaning"].description
  },
  ...Object.fromEntries(Object.entries(canonicalServicePages)
    .filter(([slug]) => slug !== "general-cleaning")
    .map(([, metadata]) => [metadata.file, {
      canonical: `https://go-clean.uz/${metadata.file}`,
      description: metadata.description
    }])),
  "services.html": {
    canonical: "https://go-clean.uz/services.html",
    description: "Toshkentda uy, ofis va maxsus obyektlar uchun GoClean tozalash xizmatlari katalogi. Xizmat tarkibi va dastlabki narxlarni ko‘ring."
  },
  "blog.html": {
    canonical: "https://go-clean.uz/blog.html",
    description: "Uy va biznes obyektlarida tozalikni saqlash bo‘yicha Goclean tavsiyalari va amaliy qo‘llanmalar."
  },
  "about.html": {
    canonical: "https://go-clean.uz/about.html",
    description: "Goclean jamoasi, professional tozalash standartlari va Toshkentdagi uy hamda biznes xizmatlari haqida."
  },
  "business.html": { canonical: "https://go-clean.uz/business.html" },
  "office-cleaning.html": { canonical: "https://go-clean.uz/office-cleaning.html" },
  "contact.html": {
    canonical: "https://go-clean.uz/contact.html",
    description: "GoClean bilan buyurtma, xizmat tarkibi yoki korporativ hamkorlik bo‘yicha bog‘laning. Toshkentdagi aloqa ma’lumotlari."
  },
  "privacy.html": { canonical: "https://go-clean.uz/privacy.html" },
  "terms.html": { canonical: "https://go-clean.uz/terms.html" },
  "business-request.html": {
    canonical: "https://go-clean.uz/business-request.html",
    robots: "noindex,follow",
    description: "GoClean biznes tozalash xizmati uchun obyekt ma’lumotlarini qoldirib, bepul konsultatsiya so‘rang."
  },
  "offer.html": {
    canonical: "https://go-clean.uz/offer",
    robots: "noindex,follow",
    description: "GoClean xizmatiga birinchi buyurtma uchun maxsus chegirmani band qiling."
  },
  "service.html": { runtime: true },
  "legal.html": { runtime: true }
};

for (const [file, metadata] of Object.entries(seoPages)) {
  const path = resolve(output, "client", file);
  let html = await readFile(path, "utf8");
  html = html
    .replace('<div data-site-header></div>', `<div data-site-header>${sourceHeader}</div>`)
    .replace('<div data-site-footer></div>', `<div data-site-footer>${sourceFooter}</div>`);
  if (file === "services.html") {
    const cards = dataContext.window.GOCLEAN_SERVICES.map(renderCatalogCard).join("");
    html = html.replace('<div class="catalog-grid" id="catalogGrid"></div>', `<div class="catalog-grid" id="catalogGrid">${cards}</div>`);
  }
  const tags = [];
  if (!/<link\s+rel=["']icon["']/i.test(html)) {
    tags.push('<link rel="icon" href="favicon.svg" type="image/svg+xml">');
  }
  if (metadata.description && !/<meta\s+name=["']description["']/i.test(html)) {
    tags.push(`<meta name="description" content="${metadata.description}">`);
  }
  if (metadata.robots && !/<meta\s+name=["']robots["']/i.test(html)) {
    tags.push(`<meta name="robots" content="${metadata.robots}">`);
  }
  if (metadata.canonical && !/<link\s+rel=["']canonical["']/i.test(html)) {
    tags.push(`<link rel="canonical" href="${metadata.canonical}">`);
  }
  if (metadata.runtime && !html.includes("seo-runtime.js")) {
    tags.push('<script src="seo-runtime.js?v=3" defer></script>');
  }
  if (tags.length) html = html.replace("</head>", `${tags.join("")}<\/head>`);
  await writeFile(path, html);
}
await cp(resolve(root, "worker", "index.js"), resolve(output, "server", "index.js"));
await cp(resolve(root, ".openai", "hosting.json"), resolve(output, ".openai", "hosting.json"));

const wrangler = {
  name: "goclean-uz",
  compatibility_date: "2026-09-01",
  compatibility_flags: ["nodejs_compat"],
  main: "index.js",
  no_bundle: true,
  rules: [{ type: "ESModule", globs: ["**/*.js", "**/*.mjs"] }],
  assets: { directory: "../client" },
  observability: { enabled: true }
};
await writeFile(resolve(output, "server", "wrangler.json"), JSON.stringify(wrangler));

const manifest = JSON.parse(await readFile(resolve(output, ".openai", "hosting.json"), "utf8"));
if (manifest.static) throw new Error("Worker build cannot use static.directory");
console.log("Goclean Worker artifact built.");

