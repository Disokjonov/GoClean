import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import vm from "node:vm";

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

function renderServicePage(service) {
  const included = service.includes
    .map((item, index) => service.includePhotos?.[index]
      ? `<article><img src="public/assets/service-details/${encodeURIComponent(service.includePhotos[index])}" alt="${escapeHtml(item)}" width="960" height="540" loading="lazy" decoding="async"><div><span>0${index + 1}</span><b>${escapeHtml(item)}</b></div></article>`
      : `<div><span>0${index + 1}</span><b>${escapeHtml(item)}</b></div>`)
    .join("");
  const visualClass = service.includePhotos?.length ? " visual-included-grid" : "";
  return `<!doctype html><html lang="uz"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(service.name)} Toshkentda — Goclean.uz</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet"><link rel="stylesheet" href="styles.css?v=19"></head><body><div data-site-header></div><main><section class="service-detail-hero"><div class="container detail-grid"><div><div class="breadcrumbs"><a href="index.html">Bosh sahifa</a><span>→</span><a href="services.html">Xizmatlar</a><span>→</span><b>${escapeHtml(service.name)}</b></div><h1>${escapeHtml(service.name)}</h1><p>${escapeHtml(service.description)}</p><div class="detail-price"><strong>${escapeHtml(service.price)}</strong><span>${escapeHtml(service.unit)}</span></div><div class="detail-actions"><button class="primary-button" type="button" data-service-lead="${escapeHtml(service.name)}">Raqam qoldirish →</button><a class="outline-button" href="tel:+998977071515">Qo‘ng‘iroq qilish</a></div></div><div class="service-art"><img class="service-art-icon" src="public/assets/icons-3d/${encodeURIComponent(service.slug)}.webp" alt="" aria-hidden="true"><b>Sifat kafolati</b><small>Natija yoqmasa, bepul qayta tozalaymiz</small></div></div></section><section class="detail-content"><div class="container detail-columns"><div><h2>Nimalar bajariladi?</h2><div class="included-grid${visualClass}">${included}</div></div><aside class="sticky-order"><h3>Operator bilan gaplashmoqchimisiz?</h3><p>Ism va raqamingizni qoldiring. Xizmat tarkibi, manzil, vaqt va to‘lovni telefonda kelishasiz.</p><button class="primary-button full" type="button" data-service-lead="${escapeHtml(service.name)}">Raqam qoldirish</button><a class="text-link" href="contact.html">Savolim bor →</a></aside></div></section><section class="section process compact"><div class="container"><div class="section-heading centered"><h2>Qanday ishlaydi?</h2></div><div class="steps"><article><span>1</span><div class="step-icon"><img src="public/assets/icons-3d/process-configure.webp" alt="" aria-hidden="true"></div><h3>Xizmatni tanlang</h3><p>Kerakli xizmatni tanlab, qisqa arizaga o‘ting.</p></article><article><span>2</span><div class="step-icon"><img src="public/assets/icons-3d/process-consultation.webp" alt="" aria-hidden="true"></div><h3>Raqamingizni qoldiring</h3><p>Faqat ism va telefon raqamingiz yetarli.</p></article><article><span>3</span><div class="step-icon"><img src="public/assets/icons-3d/process-quote-plan.webp" alt="" aria-hidden="true"></div><h3>Operator bilan kelishing</h3><p>Manzil, vaqt, xizmat tarkibi va narxni telefonda aniqlashtiring.</p></article></div></div></section></main><div data-site-footer></div><script src="shared.js?v=18"></script></body></html>`;
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
  }
};

for (const [slug, metadata] of Object.entries(canonicalServicePages)) {
  const service = dataContext.window.GOCLEAN_SERVICES.find(item => item.slug === slug);
  if (!service) throw new Error(`${slug} service data is missing`);
  await writeFile(resolve(output, "client", metadata.file), renderServicePage(service));
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
    tags.push('<script src="seo-runtime.js?v=2" defer></script>');
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

