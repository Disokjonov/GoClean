import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import vm from "node:vm";
import { serviceContent } from "./service-content.mjs";

const root = process.cwd();
const output = resolve(root, "dist");
const sharedAssetVersion = "26";
if (output !== `${root}/dist`) throw new Error("Unexpected output path");

await rm(output, { recursive: true, force: true });
await mkdir(resolve(output, "client"), { recursive: true });
await mkdir(resolve(output, "server"), { recursive: true });
await mkdir(resolve(output, ".openai"), { recursive: true });

const entries = await readdir(root, { withFileTypes: true });
const excludedClientFiles = new Set(["auth.html", "booking.html", "booking.js", "preparation-guide-ru.html"]);
for (const entry of entries) {
  if (entry.isFile() && !excludedClientFiles.has(entry.name) && /\.(html|css|js|txt|xml|svg)$/.test(entry.name)) {
    const sourcePath = resolve(root, entry.name);
    const outputPath = resolve(output, "client", entry.name);
    if (entry.name.endsWith(".html")) {
      const html = await readFile(sourcePath, "utf8");
      await writeFile(outputPath, html.replace(/shared\.js\?v=\d+/g, `shared.js?v=${sharedAssetVersion}`));
    } else {
      await cp(sourcePath, outputPath);
    }
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

const russianHomeStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": organizationId,
      name: "GoClean",
      url: "https://go-clean.uz/",
      telephone: "+998 97 707 15 15",
      email: "hello@goclean.uz",
      areaServed: { "@type": "City", name: "Toshkent" }
    },
    {
      "@type": "WebPage",
      "@id": "https://go-clean.uz/ru/#webpage",
      url: "https://go-clean.uz/ru/",
      name: "Клининг в Ташкенте для дома и бизнеса — GoClean",
      inLanguage: "ru",
      about: { "@id": organizationId }
    }
  ]
};

const appSource = await readFile(resolve(root, "app.js"), "utf8");
const homeTranslationBase = appSource.match(/const ru=(\{[\s\S]*?\});\s*Object\.assign\(ru,/);
const homeTranslationExtra = appSource.match(/Object\.assign\(ru,(\{[\s\S]*?\})\);\s*const directTextNode/);
if (!homeTranslationBase || !homeTranslationExtra) throw new Error("Homepage Russian translation catalog could not be parsed");
const homeRussianTranslations = Object.assign(
  vm.runInNewContext(`(${homeTranslationBase[1]})`),
  vm.runInNewContext(`(${homeTranslationExtra[1]})`)
);

const replaceFirstTextSegment = (inner, translation) => {
  const parts = inner.split(/(<[^>]+>)/g);
  const index = parts.findIndex(part => !part.startsWith("<") && part.trim());
  if (index === -1) return inner;
  parts[index] = parts[index].replace(parts[index].trim(), translation);
  return parts.join("");
};

const translateHomepageSource = html => html.replace(
  /<([a-z][a-z0-9-]*)([^>]*\sdata-i18n="([^"]+)"[^>]*)>([\s\S]*?)<\/\1>/gi,
  (whole, tag, attributes, key, inner) => {
    const translation = homeRussianTranslations[key];
    return translation ? `<${tag}${attributes}>${replaceFirstTextSegment(inner, translation)}</${tag}>` : whole;
  }
);

const officeStructuredData = (lang = "uz") => {
  const russian = lang === "ru";
  const url = russian ? "https://go-clean.uz/ru/office-cleaning.html" : "https://go-clean.uz/office-cleaning.html";
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        "@id": `${url}#service`,
        name: russian ? "Уборка офисов" : "Ofis tozalash",
        serviceType: russian ? "Уборка офисов" : "Ofis tozalash",
        description: russian
          ? "Регулярная, генеральная или послеремонтная уборка офисов в Ташкенте. Детали услуги и стоимость согласуются с оператором."
          : "Toshkentda ofislarni muntazam, general yoki ta’mirdan keyin tozalash. Xizmat tafsilotlari va narx operator bilan kelishiladi.",
        url,
        areaServed: { "@type": "City", name: russian ? "Ташкент" : "Toshkent" },
        provider: { "@id": organizationId }
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: russian ? "Главная" : "Bosh sahifa", item: russian ? "https://go-clean.uz/ru/" : "https://go-clean.uz/" },
          { "@type": "ListItem", position: 2, name: russian ? "Для бизнеса" : "Biznes uchun", item: "https://go-clean.uz/business.html" },
          { "@type": "ListItem", position: 3, name: russian ? "Уборка офисов" : "Ofis tozalash", item: url }
        ]
      }
    ]
  };
};

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

function russianAfterRenovationStructuredData(service, metadata) {
  const url = "https://go-clean.uz/ru/after-renovation-cleaning.html";
  const content = serviceContent[service.slug].ru;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        "@id": `${url}#service`,
        name: "Уборка после ремонта",
        serviceType: "Уборка после ремонта",
        description: content.intro,
        url,
        areaServed: { "@type": "City", name: "Ташкент" },
        provider: { "@id": organizationId }
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Главная", item: "https://go-clean.uz/ru/" },
          { "@type": "ListItem", position: 2, name: "Услуги", item: "https://go-clean.uz/services.html" },
          { "@type": "ListItem", position: 3, name: "Уборка после ремонта", item: url }
        ]
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        mainEntity: content.faqs.map(([name, text]) => ({
          "@type": "Question",
          name,
          acceptedAnswer: { "@type": "Answer", text }
        }))
      }
    ]
  };
}

function russianFurnitureStructuredData(service) {
  const url = "https://go-clean.uz/ru/furniture-cleaning.html";
  const content = serviceContent[service.slug].ru;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        "@id": `${url}#service`,
        name: "Химчистка мебели",
        serviceType: "Химчистка мебели",
        description: content.intro,
        url,
        areaServed: { "@type": "City", name: "Ташкент" },
        provider: { "@id": organizationId }
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Главная", item: "https://go-clean.uz/ru/" },
          { "@type": "ListItem", position: 2, name: "Услуги", item: "https://go-clean.uz/services.html" },
          { "@type": "ListItem", position: 3, name: "Химчистка мебели", item: url }
        ]
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        mainEntity: content.faqs.map(([name, text]) => ({
          "@type": "Question",
          name,
          acceptedAnswer: { "@type": "Answer", text }
        }))
      }
    ]
  };
}

function russianCarpetStructuredData() {
  const url = "https://go-clean.uz/ru/carpet-cleaning.html";
  const description = "GoClean выполняет чистку ковров и ковровых покрытий в Ташкенте. Услуга включает удаление пыли, обработку пятен, глубокую стирку и сушку.";
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        "@id": `${url}#service`,
        name: "Чистка ковров",
        serviceType: "Чистка ковров",
        description,
        url,
        areaServed: { "@type": "City", name: "Ташкент" },
        provider: { "@id": organizationId }
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Главная", item: "https://go-clean.uz/ru/" },
          { "@type": "ListItem", position: 2, name: "Услуги", item: "https://go-clean.uz/services.html" },
          { "@type": "ListItem", position: 3, name: "Чистка ковров", item: url }
        ]
      }
    ]
  };
}

function renderEnrichedServiceContent(service) {
  const content = serviceContent[service.slug];
  if (!content) return "";
  const renderLinks = (links, lang) => links
    ? `<nav class="service-related" aria-label="${lang === "ru" ? "Связанные услуги" : "Tegishli xizmatlar"}"><b>${lang === "ru" ? "Связанные услуги" : "Tegishli sahifalar:"}</b>${links.map(([href, label]) => `<a href="${href}">${escapeHtml(label)}</a>`).join("")}</nav>`
    : "";
  const renderLanguage = (lang, copy, hidden = false) => {
    const sections = (copy.sections || []).map(([heading, text]) => `<div class="service-scope-note"><h2>${escapeHtml(heading)}</h2><p>${escapeHtml(text)}</p></div>`).join("");
    return `<div data-content-lang="${lang}"${hidden ? " hidden" : ""}><p class="service-content-intro">${escapeHtml(copy.intro)}</p><div class="service-price-explainer"><h2>${lang === "ru" ? "Как определяется стоимость?" : "Narx qanday aniqlanadi?"}</h2><p>${escapeHtml(copy.price)}</p></div>${sections}<h2>${lang === "ru" ? "Частые вопросы" : "Ko‘p so‘raladigan savollar"}</h2><div class="service-faq">${copy.faqs.map(([question, answer]) => `<details><summary>${escapeHtml(question)}</summary><p>${escapeHtml(answer)}</p></details>`).join("")}</div>${renderLinks(content.localizedLinks?.[lang], lang)}</div>`;
  };
  const sharedLinks = renderLinks(content.links, "uz");
  return `<section class="section service-seo-content"><div class="container"><div class="service-content-card">${renderLanguage("uz", content.uz)}${renderLanguage("ru", content.ru, true)}${sharedLinks}</div></div></section>`;
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
  const localizedTitles = metadata.ruTitle ? { uz: title, ru: metadata.ruTitle } : null;
  const contentLanguageScript = enrichedContent
    ? `<script>(function(){const titles=${JSON.stringify(localizedTitles)};const sync=lang=>{document.querySelectorAll("[data-content-lang]").forEach(el=>el.hidden=el.dataset.contentLang!==lang);if(titles?.[lang])document.title=titles[lang]};sync(window.getGoCleanLanguage?.()||"uz");addEventListener("goclean:languagechange",event=>sync(event.detail.lang))})()</script>`
    : "";
  const alternates = metadata.ruFile ? `<link rel="alternate" hreflang="uz" href="https://go-clean.uz/${metadata.file}"><link rel="alternate" hreflang="ru" href="https://go-clean.uz/${metadata.ruFile}"><link rel="alternate" hreflang="x-default" href="https://go-clean.uz/${metadata.file}">` : "";
  const languageLink = metadata.ruFile ? `<a class="page-language-link" href="${metadata.ruFile}" hreflang="ru" lang="ru">Русский</a>` : "";
  const bodyAttributes = metadata.ruFile ? ` data-page-language="uz" data-language-switch="${metadata.ruFile}"` : "";
  const areaOption = metadata.optionalArea ? " data-service-area-option" : "";
  return `<!doctype html><html lang="uz"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title>${alternates}<script type="application/ld+json">${structuredData}</script><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet"><link rel="stylesheet" href="styles.css?v=19"></head><body${bodyAttributes}><div data-site-header></div><main><section class="service-detail-hero"><div class="container detail-grid"><div><div class="breadcrumbs"><a href="index.html">Bosh sahifa</a><span>→</span><a href="services.html">Xizmatlar</a><span>→</span><b>${escapeHtml(service.name)}</b>${languageLink}</div><h1>${escapeHtml(service.name)}</h1><p>${escapeHtml(service.description)}</p><div class="detail-price"><strong>${escapeHtml(service.price)}</strong><span>${escapeHtml(service.unit)}</span></div><div class="detail-actions"><button class="primary-button" type="button" data-service-lead="${escapeHtml(service.name)}"${areaOption}>Raqam qoldirish →</button><a class="outline-button" href="tel:+998977071515">Qo‘ng‘iroq qilish</a></div></div><div class="service-art"><img class="service-art-icon" src="public/assets/icons-3d/${encodeURIComponent(service.slug)}.webp" alt="" aria-hidden="true"><b>${escapeHtml(artTitle)}</b><small>${escapeHtml(artText)}</small></div></div></section><section class="detail-content"><div class="container detail-columns"><div><h2>Nimalar bajariladi?</h2><div class="included-grid${visualClass}">${included}</div></div><aside class="sticky-order"><h3>Operator bilan gaplashmoqchimisiz?</h3><p>Ism va raqamingizni qoldiring. Xizmat tarkibi, manzil, vaqt va to‘lovni telefonda kelishasiz.</p><button class="primary-button full" type="button" data-service-lead="${escapeHtml(service.name)}"${areaOption}>Raqam qoldirish</button><a class="text-link" href="contact.html">Savolim bor →</a></aside></div></section>${enrichedContent}<section class="section process compact"><div class="container"><div class="section-heading centered"><h2>Qanday ishlaydi?</h2></div><div class="steps"><article><span>1</span><div class="step-icon"><img src="public/assets/icons-3d/process-configure.webp" alt="" aria-hidden="true"></div><h3>Xizmatni tanlang</h3><p>Kerakli xizmatni tanlab, qisqa arizaga o‘ting.</p></article><article><span>2</span><div class="step-icon"><img src="public/assets/icons-3d/process-consultation.webp" alt="" aria-hidden="true"></div><h3>Raqamingizni qoldiring</h3><p>Faqat ism va telefon raqamingiz yetarli.</p></article><article><span>3</span><div class="step-icon"><img src="public/assets/icons-3d/process-quote-plan.webp" alt="" aria-hidden="true"></div><h3>Operator bilan kelishing</h3><p>Manzil, vaqt, xizmat tarkibi va narxni telefonda aniqlashtiring.</p></article></div></div></section></main><div data-site-footer></div><script src="shared.js?v=${sharedAssetVersion}"></script>${contentLanguageScript}</body></html>`;
}

function renderRussianAfterRenovationPage(service, metadata) {
  const content = serviceContent[service.slug].ru;
  const url = "https://go-clean.uz/ru/after-renovation-cleaning.html";
  const included = ["Строительная пыль", "Следы краски и клея", "Окна и рамы", "Глубокая очистка пола"]
    .map((item, index) => `<div><span>0${index + 1}</span><b>${item}</b></div>`).join("");
  const sections = content.sections.map(([heading, text]) => `<div class="service-scope-note"><h2>${escapeHtml(heading)}</h2><p>${escapeHtml(text)}</p></div>`).join("");
  const faqs = content.faqs.map(([question, answer]) => `<details><summary>${escapeHtml(question)}</summary><p>${escapeHtml(answer)}</p></details>`).join("");
  const links = serviceContent[service.slug].localizedLinks.ru.map(([href, label]) => `<a href="${href}">${escapeHtml(label)}</a>`).join("");
  const structuredData = jsonLd(russianAfterRenovationStructuredData(service, metadata));
  return `<!doctype html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="../"><title>Уборка после ремонта в Ташкенте — GoClean</title><meta name="description" content="Уборка после ремонта в Ташкенте: строительная пыль, следы краски и клея, окна, рамы и глубокая очистка пола. Оставьте имя и телефон."><link rel="canonical" href="${url}"><link rel="alternate" hreflang="uz" href="https://go-clean.uz/${metadata.file}"><link rel="alternate" hreflang="ru" href="${url}"><link rel="alternate" hreflang="x-default" href="https://go-clean.uz/${metadata.file}"><script type="application/ld+json">${structuredData}</script><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet"><link rel="stylesheet" href="styles.css?v=19"></head><body data-page-language="ru" data-language-switch="after-renovation-cleaning.html"><div data-site-header></div><main><section class="service-detail-hero"><div class="container detail-grid"><div><div class="breadcrumbs"><a href="ru/">Главная</a><span>→</span><a href="services.html">Услуги</a><span>→</span><b>Уборка после ремонта</b><a class="page-language-link" href="after-renovation-cleaning.html" hreflang="uz" lang="uz">O‘zbekcha</a></div><h1>Уборка после ремонта в Ташкенте</h1><p>${escapeHtml(content.intro)}</p><div class="detail-price"><strong>По индивидуальному расчёту</strong><span>за объект</span></div><div class="detail-actions"><button class="primary-button" type="button" data-service-lead="Уборка после ремонта" data-service-area-option>Оставить номер →</button><a class="outline-button" href="tel:+998977071515">Позвонить</a></div></div><div class="service-art"><img class="service-art-icon" src="public/assets/icons-3d/after-renovation.webp" alt="" aria-hidden="true"><b>Об услуге</b><small>Уборка строительной пыли и обработка сложных следов</small></div></div></section><section class="detail-content"><div class="container detail-columns"><div><h2>Что входит в услугу?</h2><div class="included-grid">${included}</div></div><aside class="sticky-order"><h3>Хотите обсудить услугу с оператором?</h3><p>Оставьте имя и номер телефона. Состав услуги, адрес, время и оплату вы согласуете с оператором.</p><button class="primary-button full" type="button" data-service-lead="Уборка после ремонта" data-service-area-option>Оставить номер</button><a class="text-link" href="contact.html">Есть вопрос →</a></aside></div></section><section class="section service-seo-content"><div class="container"><div class="service-content-card"><p class="service-content-intro">${escapeHtml(content.intro)}</p><div class="service-price-explainer"><h2>Как определяется стоимость?</h2><p>${escapeHtml(content.price)}</p></div>${sections}<h2>Частые вопросы</h2><div class="service-faq">${faqs}</div><nav class="service-related" aria-label="Связанные услуги"><b>Связанные услуги</b>${links}</nav></div></div></section><section class="section process compact"><div class="container"><div class="section-heading centered"><h2>Как это работает?</h2></div><div class="steps"><article><span>1</span><div class="step-icon"><img src="public/assets/icons-3d/process-configure.webp" alt="" aria-hidden="true" loading="lazy" decoding="async"></div><h3>Выберите услугу</h3><p>Перейдите к короткой заявке.</p></article><article><span>2</span><div class="step-icon"><img src="public/assets/icons-3d/process-consultation.webp" alt="" aria-hidden="true" loading="lazy" decoding="async"></div><h3>Оставьте номер</h3><p>Достаточно имени и номера телефона.</p></article><article><span>3</span><div class="step-icon"><img src="public/assets/icons-3d/process-quote-plan.webp" alt="" aria-hidden="true" loading="lazy" decoding="async"></div><h3>Согласуйте детали</h3><p>Оператор согласует адрес, время, состав услуги и стоимость.</p></article></div></div></section></main><div data-site-footer></div><script src="shared.js?v=${sharedAssetVersion}"></script></body></html>`;
}

function renderRussianFurniturePage(service, metadata) {
  const content = serviceContent[service.slug].ru;
  const url = "https://go-clean.uz/ru/furniture-cleaning.html";
  const included = ["Диагностика ткани", "Обработка пятен", "Глубокая экстракционная очистка", "Рекомендации по сушке"]
    .map((item, index) => `<div><span>0${index + 1}</span><b>${item}</b></div>`).join("");
  const faqs = content.faqs.map(([question, answer]) => `<details><summary>${escapeHtml(question)}</summary><p>${escapeHtml(answer)}</p></details>`).join("");
  const structuredData = jsonLd(russianFurnitureStructuredData(service));
  return `<!doctype html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="../"><title>Химчистка мебели в Ташкенте — GoClean</title><meta name="description" content="Химчистка диванов, кресел и мягкой мебели в Ташкенте: диагностика ткани, обработка пятен, экстракционная очистка и рекомендации по сушке."><link rel="canonical" href="${url}"><link rel="alternate" hreflang="uz" href="https://go-clean.uz/${metadata.file}"><link rel="alternate" hreflang="ru" href="${url}"><link rel="alternate" hreflang="x-default" href="https://go-clean.uz/${metadata.file}"><script type="application/ld+json">${structuredData}</script><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet"><link rel="stylesheet" href="styles.css?v=19"></head><body data-page-language="ru" data-language-switch="furniture-cleaning.html"><div data-site-header></div><main><section class="service-detail-hero"><div class="container detail-grid"><div><div class="breadcrumbs"><a href="ru/">Главная</a><span>→</span><a href="services.html">Услуги</a><span>→</span><b>Химчистка мебели</b><a class="page-language-link" href="furniture-cleaning.html" hreflang="uz" lang="uz">O‘zbekcha</a></div><h1>Химчистка мебели в Ташкенте</h1><p>${escapeHtml(content.intro)}</p><div class="detail-price"><strong>от 100 000 сум</strong><span>за одно посадочное место</span></div><div class="detail-actions"><button class="primary-button" type="button" data-service-lead="Химчистка мебели">Оставить номер →</button><a class="outline-button" href="tel:+998977071515">Позвонить</a></div></div><div class="service-art"><img class="service-art-icon" src="public/assets/icons-3d/furniture-cleaning.webp" alt="" aria-hidden="true"><b>Об услуге</b><small>Диагностика ткани и экстракционная очистка</small></div></div></section><section class="detail-content"><div class="container detail-columns"><div><h2>Что входит в услугу?</h2><div class="included-grid">${included}</div></div><aside class="sticky-order"><h3>Хотите обсудить услугу с оператором?</h3><p>Оставьте имя и номер телефона. Тип мебели, количество мест, материал и стоимость вы согласуете с оператором.</p><button class="primary-button full" type="button" data-service-lead="Химчистка мебели">Оставить номер</button><a class="text-link" href="contact.html">Есть вопрос →</a></aside></div></section><section class="section service-seo-content"><div class="container"><div class="service-content-card"><p class="service-content-intro">${escapeHtml(content.intro)}</p><div class="service-price-explainer"><h2>Как определяется стоимость?</h2><p>${escapeHtml(content.price)}</p></div><h2>Частые вопросы</h2><div class="service-faq">${faqs}</div></div></div></section><section class="section process compact"><div class="container"><div class="section-heading centered"><h2>Как это работает?</h2></div><div class="steps"><article><span>1</span><div class="step-icon"><img src="public/assets/icons-3d/process-configure.webp" alt="" aria-hidden="true" loading="lazy" decoding="async"></div><h3>Выберите услугу</h3><p>Перейдите к короткой заявке.</p></article><article><span>2</span><div class="step-icon"><img src="public/assets/icons-3d/process-consultation.webp" alt="" aria-hidden="true" loading="lazy" decoding="async"></div><h3>Оставьте номер</h3><p>Достаточно имени и номера телефона.</p></article><article><span>3</span><div class="step-icon"><img src="public/assets/icons-3d/process-quote-plan.webp" alt="" aria-hidden="true" loading="lazy" decoding="async"></div><h3>Согласуйте детали</h3><p>Оператор уточнит задачу и стоимость.</p></article></div></div></section></main><div data-site-footer></div><script src="shared.js?v=${sharedAssetVersion}"></script></body></html>`;
}

function renderRussianCarpetPage() {
  const url = "https://go-clean.uz/ru/carpet-cleaning.html";
  const intro = "GoClean выполняет чистку ковров и ковровых покрытий в Ташкенте. Услуга включает удаление пыли, обработку пятен, глубокую стирку и сушку.";
  const included = ["Удаление пыли", "Обработка пятен", "Глубокая стирка", "Сушка"]
    .map((item, index) => `<div><span>0${index + 1}</span><b>${item}</b></div>`).join("");
  const structuredData = jsonLd(russianCarpetStructuredData());
  return `<!doctype html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="../"><title>Чистка ковров в Ташкенте — GoClean</title><meta name="description" content="Чистка ковров и ковровых покрытий в Ташкенте: удаление пыли, обработка пятен, глубокая стирка и сушка."><link rel="canonical" href="${url}"><link rel="alternate" hreflang="uz" href="https://go-clean.uz/carpet-cleaning.html"><link rel="alternate" hreflang="ru" href="${url}"><link rel="alternate" hreflang="x-default" href="https://go-clean.uz/carpet-cleaning.html"><script type="application/ld+json">${structuredData}</script><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet"><link rel="stylesheet" href="styles.css?v=19"></head><body data-page-language="ru" data-language-switch="carpet-cleaning.html"><div data-site-header></div><main><section class="service-detail-hero"><div class="container detail-grid"><div><div class="breadcrumbs"><a href="ru/">Главная</a><span>→</span><a href="services.html">Услуги</a><span>→</span><b>Чистка ковров</b><a class="page-language-link" href="carpet-cleaning.html" hreflang="uz" lang="uz">O‘zbekcha</a></div><h1>Чистка ковров в Ташкенте</h1><p>${intro}</p><div class="detail-price"><strong>15 000–30 000 сум</strong><span>1 м²</span></div><div class="detail-actions"><button class="primary-button" type="button" data-service-lead="Чистка ковров" data-service-area-option>Оставить номер →</button><a class="outline-button" href="tel:+998977071515">Позвонить</a></div></div><div class="service-art"><img class="service-art-icon" src="public/assets/icons-3d/carpet-cleaning.webp" alt="" aria-hidden="true"><b>Об услуге</b><small>Удаление пыли и глубокая стирка</small></div></div></section><section class="detail-content"><div class="container detail-columns"><div><h2>Что входит в услугу?</h2><div class="included-grid">${included}</div></div><aside class="sticky-order"><h3>Хотите обсудить услугу с оператором?</h3><p>Оставьте имя и номер телефона. Площадь, адрес, время, состав услуги и стоимость вы согласуете с оператором.</p><button class="primary-button full" type="button" data-service-lead="Чистка ковров" data-service-area-option>Оставить номер</button><a class="text-link" href="contact.html">Есть вопрос →</a></aside></div></section><section class="section process compact"><div class="container"><div class="section-heading centered"><h2>Как это работает?</h2></div><div class="steps"><article><span>1</span><div class="step-icon"><img src="public/assets/icons-3d/process-configure.webp" alt="" aria-hidden="true" loading="lazy" decoding="async"></div><h3>Выберите услугу</h3><p>Перейдите к короткой заявке.</p></article><article><span>2</span><div class="step-icon"><img src="public/assets/icons-3d/process-consultation.webp" alt="" aria-hidden="true" loading="lazy" decoding="async"></div><h3>Оставьте номер</h3><p>Достаточно имени и номера телефона.</p></article><article><span>3</span><div class="step-icon"><img src="public/assets/icons-3d/process-quote-plan.webp" alt="" aria-hidden="true" loading="lazy" decoding="async"></div><h3>Согласуйте детали</h3><p>Оператор согласует площадь, адрес, время, состав услуги и стоимость.</p></article></div></div></section></main><div data-site-footer></div><script src="shared.js?v=${sharedAssetVersion}"></script></body></html>`;
}

const canonicalServicePages = {
  "general-cleaning": {
    file: "general-cleaning.html",
    ruTitle: "Генеральная уборка в Ташкенте | GoClean",
    description: "Toshkentda kvartira, hovli va ofis uchun general tozalash. Ochiq yuzalar, pol, plintus, oshxona, sanuzel, eshik va yoritgichlar batafsil tozalanadi."
  },
  "furniture-cleaning": {
    file: "furniture-cleaning.html",
    ruFile: "ru/furniture-cleaning.html",
    optionalArea: true,
    description: "Toshkentda divan, kreslo va yumshoq mebel kimyoviy tozalash. Dog‘, chang va yoqimsiz hidlarni professional ekstraktor yordamida chiqaramiz."
  },
  "after-renovation": {
    file: "after-renovation-cleaning.html",
    ruFile: "ru/after-renovation-cleaning.html",
    optionalArea: true,
    description: "Toshkentda ta’mirdan keyin tozalash. Qurilish changi, bo‘yoq va yelim izlarini professional uskuna hamda maxsus kimyo bilan tozalaymiz."
  },
  "window-cleaning": {
    file: "window-cleaning.html",
    description: "Toshkentda oyna yuvish xizmati. Ichki va tashqi oynalar, romlar hamda tokchalarni professional vositalar bilan iz qoldirmay yuvamiz."
  },
  "carpet-cleaning": {
    file: "carpet-cleaning.html",
    ruFile: "ru/carpet-cleaning.html",
    optionalArea: true,
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

const renderArticleLeadForm = language => {
  const russian = language === "ru";
  const copy = russian ? {
    title: "Нужна уборка? Оставьте заявку",
    intro: "Оставьте имя и телефон. Оператор свяжется с вами, чтобы согласовать состав работ, адрес, время и стоимость.",
    areaOpen: "Указать площадь уборки",
    areaClose: "Не указывать площадь уборки",
    optional: "Необязательно",
    area: "Площадь уборки (м²)",
    areaPlaceholder: "Например, 50",
    name: "Ваше имя",
    namePlaceholder: "Ваше имя",
    phone: "Номер телефона",
    submit: "Оставить номер",
    note: "Отправка заявки не подтверждает заказ. Детали согласуются с оператором.",
    success: "Заявка принята. Оператор свяжется с вами для согласования деталей."
  } : {
    title: "Tozalash kerakmi? Ariza qoldiring",
    intro: "Ism va telefon raqamingizni qoldiring. Operator xizmat tarkibi, manzil, vaqt va narxni siz bilan kelishadi.",
    areaOpen: "Tozalash maydonini kiritish",
    areaClose: "Tozalash maydonini kiritmaslik",
    optional: "Ixtiyoriy",
    area: "Tozalash maydoni (m²)",
    areaPlaceholder: "Masalan, 50",
    name: "Ismingiz",
    namePlaceholder: "Ismingiz",
    phone: "Telefon raqam",
    submit: "Raqam qoldirish",
    note: "Ariza yuborilishi buyurtma tasdiqlanganini anglatmaydi. Tafsilotlar operator bilan kelishiladi.",
    success: "Ariza qabul qilindi. Operator tafsilotlarni kelishish uchun siz bilan bog‘lanadi."
  };
  return `<section class="article-enquiry" aria-labelledby="articleEnquiryTitle"><div class="article-enquiry-copy"><span class="kicker">${russian ? "Заявка" : "Ariza"}</span><h2 id="articleEnquiryTitle">${copy.title}</h2><p>${copy.intro}</p></div><form class="article-lead-form" data-article-lead data-service-name="General tozalash" data-area-open-label="${copy.areaOpen}" data-area-close-label="${copy.areaClose}" novalidate><button class="optional-area-toggle" type="button" data-article-area-toggle aria-expanded="false"><span>＋</span><b>${copy.areaOpen}</b><small>${copy.optional}</small></button><div class="optional-area" data-article-area-field hidden><label><span>${copy.area}</span><input name="area" type="number" min="1" inputmode="numeric" placeholder="${copy.areaPlaceholder}"></label></div><div class="article-lead-fields"><label><span>${copy.name}</span><input name="name" autocomplete="name" required placeholder="${copy.namePlaceholder}"></label><label><span>${copy.phone}</span><span class="phone-input"><b>+998</b><input name="phone" type="tel" inputmode="numeric" autocomplete="tel-national" maxlength="12" required placeholder="90 123 45 67"></span></label></div><p class="form-inline-error" role="alert" hidden></p><p class="article-form-success" role="status" data-article-success hidden>${copy.success}</p><button class="primary-button" type="submit">${copy.submit}</button><small>${copy.note}</small></form></section>`;
};

function renderCatalogCard(service) {
  const metadata = canonicalServicePages[service.slug];
  const href = metadata?.file || `service.html?slug=${encodeURIComponent(service.slug)}`;
  const base = service.image.replace(/\.[^.]+$/, "");
  return `<article class="catalog-card" data-service="${escapeHtml(service.slug)}"><a class="catalog-image" href="${href}"><picture><source media="(max-width:560px)" srcset="public/assets/services/${base}-mobile.avif" type="image/avif"><source srcset="public/assets/services/${base}.avif" type="image/avif"><img src="public/assets/services/${escapeHtml(service.image)}" alt="${escapeHtml(service.name)}" loading="lazy" decoding="async" width="1200" height="800"></picture></a><div class="catalog-card-body"><h3><a href="${href}">${escapeHtml(service.name)}</a></h3><p>${escapeHtml(service.summary)}</p><div class="catalog-price"><strong>${escapeHtml(service.price)}</strong><small>${escapeHtml(service.unit)}</small></div><div class="catalog-actions"><a class="detail-cta" href="${href}">Batafsil</a><button class="mini-order" type="button" data-service-lead="${escapeHtml(service.name)}">Raqam qoldirish</button></div></div></article>`;
}

const deferBelowFoldProcessImages = html => html.replace(
  /(<img src="public\/assets\/icons-3d\/process-[^"]+" alt="" aria-hidden="true")>/g,
  '$1 loading="lazy" decoding="async">'
);

for (const [slug, metadata] of Object.entries(canonicalServicePages)) {
  const service = dataContext.window.GOCLEAN_SERVICES.find(item => item.slug === slug);
  if (!service) throw new Error(`${slug} service data is missing`);
  await writeFile(resolve(output, "client", metadata.file), deferBelowFoldProcessImages(renderServicePage(service, metadata)));
}

const afterRenovationService = dataContext.window.GOCLEAN_SERVICES.find(item => item.slug === "after-renovation");
await mkdir(resolve(output, "client", "ru"), { recursive: true });
await writeFile(resolve(output, "client", "ru", "after-renovation-cleaning.html"), renderRussianAfterRenovationPage(afterRenovationService, canonicalServicePages["after-renovation"]));
const furnitureService = dataContext.window.GOCLEAN_SERVICES.find(item => item.slug === "furniture-cleaning");
await writeFile(
  resolve(output, "client", "ru", "furniture-cleaning.html"),
  renderRussianFurniturePage(furnitureService, canonicalServicePages["furniture-cleaning"])
    .replaceAll('data-service-lead="Химчистка мебели"', 'data-service-lead="Химчистка мебели" data-service-area-option')
);
await writeFile(resolve(output, "client", "ru", "carpet-cleaning.html"), renderRussianCarpetPage());

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
  "cleaning-preparation-guide.html": {
    canonical: "https://go-clean.uz/cleaning-preparation-guide.html",
    description: "Shaxsiy buyumlar, kerakli joylarga kirish va ishlar ro‘yxati: mutaxassis kelishidan oldingi amaliy tayyorgarlik qo‘llanmasi."
  },
  "about.html": {
    canonical: "https://go-clean.uz/about.html",
    description: "Goclean jamoasi, professional tozalash standartlari va Toshkentdagi uy hamda biznes xizmatlari haqida."
  },
  "business.html": { canonical: "https://go-clean.uz/business.html" },
  "office-cleaning.html": {
    canonical: "https://go-clean.uz/office-cleaning.html",
    structuredData: officeStructuredData("uz")
  },
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
    .replace('<div data-site-footer></div>', `<div data-site-footer>${sourceFooter}</div>`)
    .replace('<div data-article-lead-form></div>', renderArticleLeadForm("uz"));
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
  if (metadata.structuredData && !html.includes('office-cleaning.html#service')) {
    tags.push(`<script type="application/ld+json">${jsonLd(metadata.structuredData)}</script>`);
  }
  if (metadata.runtime && !html.includes("seo-runtime.js")) {
    tags.push('<script src="seo-runtime.js?v=3" defer></script>');
  }
  if (tags.length) html = html.replace("</head>", `${tags.join("")}<\/head>`);
  await writeFile(path, html);
}

const officeRussianTranslations = {
  "Toshkentda ofis, ombor va ishlab chiqarish joylarini professional tozalash. Goclean.uz bilan individual hisob oling.": "Уборка офисов, складов и производственных помещений в Ташкенте. Оставьте номер, чтобы согласовать детали с Goclean.uz.",
  "Ofis tozalash Toshkentda — Goclean.uz": "Уборка офисов в Ташкенте — Goclean.uz",
  "Toshkent bo‘ylab har kuni 08:00–21:00": "По Ташкенту ежедневно 08:00–21:00",
  "Xizmatlar": "Услуги", "Ofis tozalash": "Уборка офисов", "Biznes uchun": "Для бизнеса", "Tavsiyalar": "Рекомендации", "Kontaktlar": "Контакты",
  "Maxsus chegirmani olish": "Получить специальную скидку", "Bosh sahifa": "Главная", "Ofis • Ombor • Ishlab chiqarish": "Офис • Склад • Производство",
  "Ofisingiz har kuni ishga tayyor bo‘lsin": "Пусть ваш офис каждый день будет готов к работе",
  "Muntazam, general yoki ta’mirdan keyingi tozalash. Xodimlar, vositalar, grafik va sifat nazorati — bitta xizmatda.": "Регулярная, генеральная или послеремонтная уборка. Состав работ, график и стоимость согласуются с оператором.",
  "✓ Ish vaqtingizga mos grafik": "✓ График согласуется с вами", "✓ Shaxsiy menejer": "✓ Связь с менеджером", "✓ Hujjatlar bilan": "✓ Условия согласуются",
  "Raqam qoldirish →": "Оставить номер →", "☎ Qo‘ng‘iroq qilish": "☎ Позвонить", "Sifat nazorati": "Контроль качества", "Har bir smena bo‘yicha": "По согласованным условиям",
  "Ofis uchun xizmatlar": "Услуги для офиса", "Kerakli formatni tanlang": "Выберите подходящий формат",
  "Narx maydon, davriylik, zonalar va ish vaqtiga qarab konsultatsiyadan keyin aniq hisoblanadi.": "Стоимость рассчитывается после консультации с учётом площади, периодичности, зон и времени работ.",
  "Muntazam": "Регулярная", "Kundalik tozalash": "Ежедневная уборка", "Ish joylari, umumiy zonalar, oshxona va sanuzellar.": "Рабочие места, общие зоны, кухня и санузлы.",
  "Kundalik ofis tozalash": "Регулярная уборка офиса", "Ofisni general tozalash": "Генеральная уборка офиса", "Ombor va sex tozalash": "Уборка склада и цеха",
  "Chuqur": "Глубокая", "General tozalash": "Генеральная уборка", "Barcha ochiq va qiyin yetiladigan yuzalarni to‘liq tozalash.": "Очистка открытых и труднодоступных поверхностей.",
  "Katta maydon": "Большая площадь", "Ombor va sex": "Склад и цех", "Ishlab chiqarish zonalari, texnik pol va katta maydonlar.": "Производственные зоны, технические полы и большие площади.",
  "Maxsus": "Специальная", "Ta’mirdan keyin": "После ремонта", "Qurilish changi, bo‘yoq va yelim izlarini bartaraf etish.": "Удаление строительной пыли, следов краски и клея.",
  "Yorqinlik": "Блеск", "Oyna va vitrina": "Окна и витрины", "Ichki-tashqi oynalar, romlar va shisha to‘siqlar.": "Внутренние и наружные окна, рамы и стеклянные перегородки.",
  "Sanitariya": "Санитария", "Dezinfeksiya": "Дезинфекция", "Ofis va umumiy zonalarga professional ishlov berish.": "Обработка офисов и общих зон.", "Batafsil →": "Подробнее →",
  "Biznes afzalliklari": "Для бизнеса", "Tozalikni boshqarish uchun alohida xodim shart emas": "Согласуйте подходящий формат уборки",
  "Goclean jamoa, inventar, kimyo, smena va sifat nazoratini o‘z zimmasiga oladi.": "Команда, инвентарь, средства, график и контроль обсуждаются до начала работ.",
  "Menejer bilan gaplashish →": "Поговорить с менеджером →", "O‘qitilgan xodimlar": "Команда для объекта", "Tanlov, tekshiruv va obyekt bo‘yicha brifing.": "Состав команды и требования к объекту обсуждаются заранее.",
  "Doimiy nazorat": "Контроль работ", "Chek-list va menejer orqali sifat monitoringi.": "Порядок контроля согласуется с менеджером.", "Inventar va kimyo": "Инвентарь и средства", "Professional vositalarni o‘zimiz ta’minlaymiz.": "Необходимые средства и инвентарь согласуются до работ.",
  "Yopuvchi hujjatlar": "Документы", "Shartnoma, hisob va barcha zarur hujjatlar.": "Необходимые документы уточняются при согласовании.",
  "Qulay usulni tanlang": "Выберите удобный способ", "Hisob olishning 3 yo‘li": "3 способа уточнить стоимость", "Saytda ariza": "Заявка на сайте",
  "Ism va telefonni qoldiring. Maydonni xohlasangiz qo‘shing.": "Оставьте имя и телефон. Площадь можно указать по желанию.", "Ariza qoldirish →": "Оставить заявку →",
  "Telefon orqali": "По телефону", "Tez maslahat va savollarga javob.": "Обсудите задачу и задайте вопросы.", "Telegram orqali": "Через Telegram", "Vazifani yozing yoki rasmlarni yuboring.": "Опишите задачу или отправьте фотографии.",
  "Qanday boshlaymiz?": "Как начать?", "Oddiy va tushunarli jarayon": "Простой и понятный процесс", "Ariza": "Заявка",
  "Faqat ism va telefon raqamingizni qoldirasiz. Maydonni xohlasangiz qo‘shishingiz mumkin.": "Оставьте только имя и номер телефона. Площадь можно добавить по желанию.",
  "Konsultatsiya va hisob": "Консультация и расчёт", "Operator obyekt, xizmat tarkibi, manzil, vaqt va narxni siz bilan kelishadi.": "Оператор согласует с вами объект, состав услуги, адрес, время и стоимость.",
  "Shartnoma va start": "Согласование и начало", "Kelishuvdan keyin ish tartibi tasdiqlanadi.": "После согласования подтверждается порядок работ.",
  "Ko‘p so‘raladigan savollar": "Частые вопросы", "Javob topilmasa, menejerimiz sizga bepul maslahat beradi.": "Если ответа нет, уточните вопрос у менеджера.",
  "Narx qanday hisoblanadi?": "Как рассчитывается стоимость?", "Maydon, zonalar, davriylik, ish vaqti va kerakli xodimlar soniga qarab konsultatsiyadan keyin aniq smeta beriladi.": "Стоимость зависит от площади, зон, периодичности, времени работ и необходимого состава команды.",
  "Ish vaqtidan keyin tozalash mumkinmi?": "Можно ли убирать после рабочего времени?", "Ha. Ertalab, kechqurun yoki tungi grafikni obyektingiz ish tartibiga moslaymiz.": "Подходящее время уборки уточняется с оператором с учётом режима работы объекта.",
  "Vositalarni kim olib keladi?": "Кто привозит средства?", "Kelishuvga ko‘ra barcha professional kimyo, inventar va texnikani Goclean ta’minlaydi.": "Средства, инвентарь и оборудование определяются при согласовании услуги.",
  "Yopuvchi hujjatlar beriladimi?": "Предоставляются ли документы?", "Ha, korporativ mijozlar uchun shartnoma, hisob va zarur yopuvchi hujjatlar taqdim etiladi.": "Перечень необходимых документов уточняется с оператором.",
  "Konsultatsiya": "Консультация", "Operator bilan xizmat tafsilotlarini kelishing": "Согласуйте детали услуги с оператором",
  "Uy va biznes uchun professional tozalash xizmati.": "Профессиональная уборка для дома и бизнеса.", "Barcha xizmatlar": "Все услуги", "Mebel tozalash": "Чистка мебели", "Oyna yuvish": "Мойка окон",
  "Kompaniya": "Компания", "Biz haqimizda": "О нас", "Bog‘lanish": "Связаться", "Toshkent, O‘zbekiston": "Ташкент, Узбекистан", "Maxfiylik siyosati": "Политика конфиденциальности", "Foydalanish shartlari": "Условия использования"
};

let russianOffice = await readFile(resolve(output, "client", "office-cleaning.html"), "utf8");
for (const [uz, ru] of Object.entries(officeRussianTranslations).sort(([a], [b]) => b.length - a.length)) russianOffice = russianOffice.split(uz).join(ru);
russianOffice = russianOffice
  .replace('<html lang="uz">', '<html lang="ru">')
  .replace('<meta name="viewport" content="width=device-width,initial-scale=1">', '<meta name="viewport" content="width=device-width,initial-scale=1"><base href="../">')
  .replace('<body data-page-language="uz" data-language-switch="ru/office-cleaning.html">', '<body data-page-language="ru" data-language-switch="office-cleaning.html">')
  .replace('<link rel="canonical" href="https://go-clean.uz/office-cleaning.html">', '<link rel="canonical" href="https://go-clean.uz/ru/office-cleaning.html">')
  .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, `<script type="application/ld+json">${jsonLd(officeStructuredData("ru"))}</script>`)
  .replace('<a class="page-language-link" href="ru/office-cleaning.html" hreflang="ru" lang="ru">Русский</a>', '<a class="page-language-link" href="office-cleaning.html" hreflang="uz" lang="uz">O‘zbekcha</a>')
  .replaceAll('href="index.html"', 'href="ru/"')
  .replaceAll('href="index.html?offer=first-order"', 'href="ru/?offer=first-order"')
  .replace('<a href="office-cleaning.html">Уборка офисов</a>', '<a href="ru/office-cleaning.html">Уборка офисов</a>');
await mkdir(resolve(output, "client", "ru"), { recursive: true });
await writeFile(resolve(output, "client", "ru", "office-cleaning.html"), russianOffice);

let russianPreparationGuide = await readFile(resolve(root, "preparation-guide-ru.html"), "utf8");
russianPreparationGuide = russianPreparationGuide
  .replace(/shared\.js\?v=\d+/g, `shared.js?v=${sharedAssetVersion}`)
  .replace('<div data-article-lead-form></div>', renderArticleLeadForm("ru"));
await writeFile(resolve(output, "client", "ru", "cleaning-preparation-guide.html"), russianPreparationGuide);

const homeRussianDirectTranslations = {
  "Toshkent bo‘ylab har kuni 08:00–21:00": "По Ташкенту ежедневно",
  "Goclean bosh sahifa": "Главная GoClean",
  "Asosiy navigatsiya": "Основная навигация",
  "Mato diagnostikasi": "Определение типа ткани",
  "Dog‘larga ishlov": "Обработка пятен",
  "Chuqur ekstraksiya": "Глубокая экстракционная чистка",
  "Quritish bo‘yicha tavsiya": "Рекомендации по сушке",
  "Oyna yuvish": "Мойка окон",
  "Marmar tozalash": "Очистка мрамора",
  "Gilam yuvish": "Чистка ковров",
  "Barcha xizmatlar": "Все услуги",
  "Yangi mijozlar uchun": "Для новых клиентов",
  "Toshkent, O‘zbekiston": "Ташкент, Узбекистан",
  "Maxfiylik siyosati": "Политика конфиденциальности",
  "Foydalanish shartlari": "Условия использования",
  "Telegram orqali yozish": "Написать в Telegram",
  "Qo‘ng‘iroq qilish": "Позвонить",
  "Tezkor aloqa": "Быстрая связь",
  "Yopish": "Закрыть",
  "Masalan, Aziz": "Например, Азиз",
  "Ismingiz": "Ваше имя"
};

let russianHome = translateHomepageSource(await readFile(resolve(output, "client", "index.html"), "utf8"));
for (const [uz, ru] of Object.entries(homeRussianDirectTranslations).sort(([a], [b]) => b.length - a.length)) russianHome = russianHome.split(uz).join(ru);
const russianSeoIntro = `<section class="section service-seo-content"><div class="container"><div class="service-content-card"><h2>Услуги клининга в Ташкенте</h2><p class="service-content-intro">GoClean оказывает услуги уборки для квартир, домов, офисов и коммерческих объектов в Ташкенте. Оставьте имя и телефон — оператор уточнит задачу, состав работ, адрес, удобное время и стоимость.</p><nav class="service-related" aria-label="Популярные услуги"><b>Популярные услуги:</b><a href="general-cleaning.html">Генеральная уборка</a><a href="ru/furniture-cleaning.html">Химчистка мебели</a><a href="ru/carpet-cleaning.html">Чистка ковров</a><a href="ru/after-renovation-cleaning.html">Уборка после ремонта</a><a href="ru/office-cleaning.html">Уборка офисов</a></nav></div></div></section>`;
const russianFactsStrip = `<section class="trust-strip"><div class="container trust-items"><div><strong>GoClean</strong><span>бренд</span></div><div><strong>Ташкент</strong><span>зона обслуживания</span></div><div><strong>+998 97 707 15 15</strong><span>телефон</span></div><div><strong>hello@goclean.uz</strong><span>электронная почта</span></div></div></section>`;
const russianConsultation = `<section class="section business consultation" id="business"><div class="container business-panel"><div class="business-copy"><h2>Уточните состав работ и стоимость с оператором</h2><p>Оставьте имя и телефон. Оператор свяжется с вами и согласует услугу, адрес, удобное время и стоимость.</p><div class="business-benefits"><div><span>✓</span><b>Имя и телефон</b></div><div><span>✓</span><b>Детали по телефону</b></div></div></div><form class="business-form compact-form" id="businessForm" novalidate><h3>Оставить заявку на клининг</h3><p>Для заявки достаточно имени и номера телефона.</p><label><span data-i18n="name">Ваше имя</span><input name="name" required placeholder="Например, Азиз" /></label><label><span data-i18n="phone">Номер телефона</span><span class="phone-input"><b>+998</b><input name="phone" required type="tel" inputmode="numeric" autocomplete="tel-national" maxlength="12" placeholder="90 123 45 67" /></span></label><p class="form-inline-error" role="alert" hidden></p><button class="primary-button full coral" type="submit" data-i18n="consultationButton">Получить консультацию</button></form></div></section>`;
const russianFactsSection = `<section class="section trust" id="trust"><div class="container trust-grid"><div class="trust-copy"><span class="kicker">Кратко о GoClean</span><h2>Клининг для дома и бизнеса в Ташкенте</h2><p>GoClean работает в Ташкенте. Уточнить подходящую услугу можно по телефону, электронной почте или через короткую заявку на сайте.</p><a href="contact.html" class="text-link">Контакты →</a></div><div class="trust-cards"><article><span>⌖</span><div><b>Зона обслуживания</b><small>Ташкент</small></div></article><article><span>☎</span><div><b>Телефон</b><small>+998 97 707 15 15</small></div></article><article><span>@</span><div><b>Электронная почта</b><small>hello@goclean.uz</small></div></article></div></div></section>`;
const russianFaq = `<section class="section faq" id="faq"><div class="container faq-grid"><div><span class="kicker">FAQ</span><h2>Частые вопросы о клининге</h2><p>Оператор поможет уточнить детали услуги по телефону.</p></div><div class="accordion"><details open><summary>Как узнать состав работ и стоимость?<span>+</span></summary><p>Оставьте имя и телефон. Оператор уточнит объект, задачу и согласует состав услуги и стоимость.</p></details><details><summary>Когда согласовываются адрес и время?<span>+</span></summary><p>Адрес и удобное время согласуются во время звонка оператора.</p></details><details><summary>Нужно ли знать площадь объекта?<span>+</span></summary><p>Нет. Заявку можно оставить без площади и уточнить её позже с оператором.</p></details><details><summary>Нужно ли платить на сайте?<span>+</span></summary><p>Нет. Способ и условия оплаты согласуются с оператором.</p></details></div></div></section>`;
russianHome = russianHome
  .replace('<html lang="uz">', '<html lang="ru">')
  .replace('<meta name="viewport" content="width=device-width, initial-scale=1.0" />', '<meta name="viewport" content="width=device-width, initial-scale=1.0" /><base href="../" />')
  .replace(/<meta name="description" content="[^"]+" \/>/, '<meta name="description" content="Клининг в Ташкенте для квартир, домов, офисов и коммерческих объектов. Оставьте имя и телефон — оператор уточнит детали и стоимость." />')
  .replace('<link rel="canonical" href="https://go-clean.uz/" />', '<link rel="canonical" href="https://go-clean.uz/ru/" />')
  .replace('<title>Goclean.uz — toza uy, xotirjam kun</title>', '<title>Клининг в Ташкенте для дома и бизнеса — GoClean</title>')
  .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, `<script type="application/ld+json">${jsonLd(russianHomeStructuredData)}</script>`)
  .replace('<body data-page-language="uz">', '<body data-page-language="ru" data-language-switch="../">')
  .replace('<a class="lang" id="langToggle" href="ru/" hreflang="ru" lang="ru" aria-label="Русская версия">RU</a>', '<a class="lang" id="langToggle" href="/" hreflang="uz" lang="uz" aria-label="O‘zbekcha versiya">UZ</a>')
  .replace('<h1 data-i18n="heroTitle">Профессиональная уборка для дома и бизнеса</h1>', '<h1 data-i18n="heroTitle">Клининг в Ташкенте для дома и бизнеса</h1>')
  .replace('<p data-i18n="heroText">Убираем квартиры, дома, офисы и коммерческие объекты силами профессиональных сотрудников. Рассчитайте стоимость или получите бесплатную консультацию.</p>', '<p data-i18n="heroText">Уборка квартир, домов, офисов и коммерческих объектов. Оставьте номер — оператор уточнит детали услуги и стоимость.</p>')
  .replace(/<div class="hero-points">[\s\S]*?<\/div>/, '<div class="hero-points"><span><b>✓</b> Уборка для дома и бизнеса</span><span><b>✓</b> Детали согласуются с оператором</span></div>')
  .replace(/<div class="hero-proof">\s*<div class="avatar-stack"[\s\S]*?<\/div>\s*<div>[\s\S]*?<\/div>\s*<\/div>/, '<div class="hero-proof"><div class="avatar-stack" aria-hidden="true"><i>G</i><i>C</i></div><div><strong>GoClean</strong><small>Клининг в Ташкенте</small></div></div>')
  .replace(/<div class="floating-card verified">[\s\S]*?<\/div><\/div>/, '<div class="floating-card verified"><span>⌖</span><div><b>Ташкент</b><small>Зона обслуживания</small></div></div>')
  .replace(/<div class="floating-card guarantee">[\s\S]*?<\/div><\/div>/, '<div class="floating-card guarantee"><span>☎</span><div><b>Имя и телефон</b><small>Достаточно для заявки</small></div></div>')
  .replace(/<section class="trust-strip">[\s\S]*?<\/section>/, `${russianFactsStrip}${russianSeoIntro}`)
  .replace(/<section class="section business consultation" id="business">[\s\S]*?<\/section>/, russianConsultation)
  .replace(/<section class="section trust" id="trust">[\s\S]*?<\/section>/, russianFactsSection)
  .replace(/<section class="section faq" id="faq">[\s\S]*?<\/section>/, russianFaq)
  .replace('<p data-i18n="servicesText">В каждом пакете — профессиональные средства, инвентарь и контроль качества.</p>', '<p data-i18n="servicesText">Выберите подходящую услугу и уточните детали с оператором.</p>')
  .replace('aria-label="Obyekt turi"', 'aria-label="Тип объекта"')
  .replaceAll('so‘m', 'сум')
  .replace('<strong id="totalPrice">219 000 so‘m</strong>', '<strong id="totalPrice">219 000 сум</strong>')
  .replace('<span id="orderLabel">Aniq hisob-kitob uchun raqamingizni qoldiring</span>', '<span id="orderLabel">Оставьте номер для точного расчёта</span>')
  .replace('<p data-i18n="repairDesc">Полностью устраняем строительную пыль и сложные следы.</p>', '<p data-i18n="repairDesc">Уборка строительной пыли и обработка сложных следов.</p>')
  .replace('href="carpet-cleaning.html">Чистка ковров', 'href="ru/carpet-cleaning.html">Чистка ковров')
  .replace('<a href="business.html" data-i18n="navBusiness">Для бизнеса</a>', '<a href="ru/office-cleaning.html" data-i18n="navBusiness">Уборка офисов</a>')
  .replaceAll('href="#top"', 'href="/ru/#top"')
  .replaceAll('href="#how"', 'href="/ru/#how"')
  .replace('<button type="button" data-property="office">', '<button type="button" data-property="office" data-russian-office-link="ru/office-cleaning.html">');
await writeFile(resolve(output, "client", "ru", "index.html"), russianHome);
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

