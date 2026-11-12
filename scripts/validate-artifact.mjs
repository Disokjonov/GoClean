import { access, readFile } from "node:fs/promises";

for (const path of [
  "dist/server/index.js",
  "dist/server/wrangler.json",
  "dist/client/index.html",
  "dist/client/shared.js",
  "dist/client/ru/office-cleaning.html",
  "dist/.openai/hosting.json",
  "dist/client/public/assets/service-details/general-surfaces.webp",
  "dist/client/public/assets/service-details/general-floors.webp",
  "dist/client/public/assets/service-details/general-kitchen-bath.webp",
  "dist/client/public/assets/service-details/general-doors-lights.webp"
]) await access(path);

const worker = await import(new URL("../dist/server/index.js", import.meta.url));
if (!worker.default || typeof worker.default.fetch !== "function") {
  throw new Error("Worker default fetch handler is missing");
}

for (const [source, destination] of [
  ["/index.html?utm_source=search", "/?utm_source=search"],
  ["/our-services/?utm_source=search", "/services.html?utm_source=search"],
  ["/blog/?utm_source=search", "/blog.html?utm_source=search"],
  ["/about-us/?utm_source=search", "/about.html?utm_source=search"],
  ["/general-cleaning?utm_source=search", "/general-cleaning.html?utm_source=search"],
  ["/privacy?utm_source=search", "/privacy.html?utm_source=search"]
]) {
  const response = await worker.default.fetch(new Request(`https://go-clean.uz${source}`), {});
  if (response.status !== 301) throw new Error(`${source} must return a permanent redirect`);
  if (response.headers.get("location") !== `https://go-clean.uz${destination}`) {
    throw new Error(`${source} redirect destination is incorrect`);
  }
}

const originalFetch = globalThis.fetch;
const telegramMessages = [];
try {
  globalThis.fetch = async (_url, options) => {
    telegramMessages.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };
  const submit = (type, payload, ip = type) => {
    const body = JSON.stringify({ type, language: "uz", page: "/service-lead-test", ...payload });
    return worker.default.fetch(new Request("https://go-clean.uz/api/lead", {
      method: "POST",
      headers: { origin: "https://go-clean.uz", "content-type": "application/json", "content-length": String(body.length), "cf-connecting-ip": `test-${ip}` },
      body
    }), { TELEGRAM_BOT_TOKEN: "mock", TELEGRAM_CHAT_ID: "mock" });
  };
  const shortResponse = await submit("order", { service: "General tozalash", area: "75 m²", name: "Test User", phone: "+998900000000" });
  if (shortResponse.status !== 200) throw new Error("Short order payload must be accepted");
  const legacyResponse = await submit("order", { service: "General tozalash", object: "Kvartira", name: "Test User", phone: "+998900000000", address: "Test manzil", date: "2026-11-10", time: "10:00", payment: "after-service" }, "legacy");
  if (legacyResponse.status !== 200) throw new Error("Legacy order payload must remain accepted during rollout");
  for (const [type, payload] of [
    ["callback", { name: "Test User", phone: "+998900000000", property: "Kvartira" }],
    ["consultation", { name: "Test User", phone: "+998900000000" }],
    ["business", { name: "Test User", phone: "+998900000000" }],
    ["contact", { name: "Test User", phone: "+998900000000", message: "Savol" }],
    ["meta", { name: "Test User", phone: "+998900000000", service: "General" }],
    ["discount", { name: "Test User", phone: "+998900000000", source: "Popup" }]
  ]) {
    const response = await submit(type, payload);
    if (response.status !== 200) throw new Error(`${type} payload must be accepted`);
  }
  const legacyBusinessResponse = await submit("business", { name: "Test User", phone: "+998900000000", object: "Ofis", area: "100 m²", service: "Muntazam" }, "legacy-business");
  if (legacyBusinessResponse.status !== 200) throw new Error("Legacy business payload must remain accepted when the Worker is deployed first");
  const invalidPhone = await submit("contact", { name: "Test User", phone: "901234567", message: "Savol" }, "invalid-phone");
  if (invalidPhone.status !== 422) throw new Error("Phone without +998 must be rejected");
  const invalidName = await submit("contact", { name: "12", phone: "+998900000000", message: "Savol" }, "invalid-name");
  if (invalidName.status !== 422) throw new Error("Name without two letters must be rejected");
} finally {
  globalThis.fetch = originalFetch;
}
if (!telegramMessages[0]?.text.includes("75 m²")) throw new Error("Short payload area is missing from the operator message");
if (!telegramMessages[1]?.text.includes("Test manzil") || !telegramMessages[1]?.text.includes("2026-11-10")) {
  throw new Error("Legacy payload details are missing from the operator message");
}
if (!telegramMessages[4]?.text.includes("Test User") || telegramMessages[4]?.text.includes("Maydon:")) {
  throw new Error("Name-and-phone-only business payload must be accepted without a fabricated area");
}
if (!telegramMessages[8]?.text.includes("Ofis") || !telegramMessages[8]?.text.includes("100 m²") || !telegramMessages[8]?.text.includes("Muntazam")) {
  throw new Error("Legacy business payload details must remain intact");
}

const source = await readFile("dist/client/shared.js", "utf8");
if (!source.includes("/api/lead")) throw new Error("Lead endpoint is not wired into the client");
if (!source.includes("icon.textContent=error?'!':'✓'")) throw new Error("Lead toast icon must reflect error state");
if (!source.includes("catch{throw new Error(leadErrorText())}")) throw new Error("Network failures must use the localized lead error");
const businessLead = await readFile("dist/client/lead-forms.js", "utf8");
for (const queryValue of ["office", "retail", "warehouse", "regular-office", "general-office"]) {
  if (!new RegExp(`(?:['"]${queryValue}['"]|\\b${queryValue}:)`).test(businessLead)) throw new Error(`Business preselection is missing ${queryValue}`);
}
if (businessLead.includes("if(!data.area") || businessLead.includes("if(!data.object") || businessLead.includes("if(!data.service")) throw new Error("Business form must not require area, object, or service");
if (!businessLead.includes("if(data.area&&Number(data.area)>0)payload.area")) throw new Error("Business form must send area only when entered");
if (!businessLead.includes("setAreaOpen(false)")) throw new Error("Business optional area must reset after submission");
const businessRequestPage = await readFile("dist/client/business-request.html", "utf8");
for (const field of ["object", "service"]) if (!businessRequestPage.includes(`type="hidden" name="${field}"`)) throw new Error(`Business query context is missing hidden ${field}`);
if (!businessRequestPage.includes("data-area-toggle") || !businessRequestPage.includes("data-area-field hidden")) throw new Error("Business area must be hidden behind an optional toggle");
if (/\b(required)[^>]*name="(?:object|area|service)"|name="(?:object|area|service)"[^>]*\brequired\b/.test(businessRequestPage)) throw new Error("Business area/object/service must not be required");
for (const requiredField of ["name", "phone"]) if (!new RegExp(`(?:required[^>]*name="${requiredField}"|name="${requiredField}"[^>]*required)`).test(businessRequestPage)) throw new Error(`Business ${requiredField} must remain required`);
const businessPage = await readFile("dist/client/business.html", "utf8");
if (/<(?:input|select)[^>]*name="(?:type|area|object|service)"/.test(businessPage)) throw new Error("Business hero must not ask for object, service, or area before the short request");
if (!businessPage.includes('data-service-lead="Biznes tozalash" data-service-area-option')) throw new Error("Business hero must open the short lead flow with optional area");
if (businessPage.includes("Maydon va grafikni qoldiring")) throw new Error("Business hero contains stale mandatory-area copy");
for (const formPage of ["index.html", "business-request.html", "contact.html", "offer.html"]) {
  const html = await readFile(`dist/client/${formPage}`, "utf8");
  if (!html.includes('class="phone-input"')) throw new Error(`${formPage} must use the +998 phone field`);
  if (!html.includes('class="form-inline-error"')) throw new Error(`${formPage} must contain an inline form error`);
}
for (const formPage of ["business-request.html", "contact.html"]) {
  const html = await readFile(`dist/client/${formPage}`, "utf8");
  if (html.includes("localStorage.setItem('goclean")) throw new Error(`${formPage} still contains a false-success fallback`);
}
const renderBlueprint = await readFile("render.yaml", "utf8");
for (const authPath of ["/auth", "/auth.html"]) {
  if (!renderBlueprint.includes(`source: ${authPath}`)) throw new Error(`Render redirect is missing ${authPath}`);
}
for (const [source, destination] of [
  ["/index.html", "/"], ["/blog/", "/blog.html"], ["/about-us/", "/about.html"],
  ["/services", "/services.html"], ["/general-cleaning", "/general-cleaning.html"],
  ["/privacy", "/privacy.html"], ["/terms", "/terms.html"]
]) {
  const route = `source: ${source}\n        destination: ${destination}`;
  if (!renderBlueprint.includes(route)) throw new Error(`Render redirect is missing ${source} -> ${destination}`);
}
if (renderBlueprint.includes("source: /author/bbois1")) throw new Error("Non-equivalent author URL must not redirect to the home page");
for (const hiddenPath of ["/booking", "/booking.html"]) {
  const response = await worker.default.fetch(new Request(`https://go-clean.uz${hiddenPath}`), {});
  if (response.status !== 302 || response.headers.get("location") !== "https://go-clean.uz/") {
    throw new Error(`${hiddenPath} must redirect customers to the home page`);
  }
}
for (const hiddenFile of ["dist/client/booking.html", "dist/client/booking.js"]) {
  try {
    await access(hiddenFile);
    throw new Error(`${hiddenFile} must not be included in the production artifact`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
const general = await readFile("dist/client/general-cleaning.html", "utf8");
if ((general.match(/public\/assets\/service-details\//g) || []).length !== 4) {
  throw new Error("General cleaning detail page must contain four visual service cards");
}
for (const page of ["general-cleaning.html", "furniture-cleaning.html"]) {
  const html = await readFile(`dist/client/${page}`, "utf8");
  const processImages = [...html.matchAll(/<img src="public\/assets\/icons-3d\/process-[^"]+"[^>]*>/g)].map(match => match[0]);
  if (processImages.length !== 3 || processImages.some(image => !image.includes('loading="lazy"') || !image.includes('decoding="async"'))) {
    throw new Error(`${page} process images must defer loading and decoding`);
  }
}
const optimizedShared = await readFile("dist/client/shared.js", "utf8");
if (!optimizedShared.includes('aria-hidden="true" loading="lazy" decoding="async"')) throw new Error("Mobile drawer images must use native lazy loading");
const optimizedOffice = await readFile("dist/client/office-cleaning.html", "utf8");
const optimizedOfficeImages = [...optimizedOffice.matchAll(/<img (?:class="process-icon-3d" )?src="public\/assets\/icons-3d\/(?:standard-cleaning|general-cleaning|warehouse-cleaning|after-renovation|window-cleaning|disinfection|process-[^"]+)\.webp"[^>]*>/g)].map(match => match[0]);
if (optimizedOfficeImages.length !== 9) throw new Error("Office optimization must cover six service icons and three process icons");
for (const image of optimizedOfficeImages) {
  if (!image.includes('loading="lazy"') || !image.includes('decoding="async"')) throw new Error("Office below-fold icons must defer loading and decoding");
}
const optimizedHome = await readFile("dist/client/index.html", "utf8");
const optimizedHomeImages = [...optimizedHome.matchAll(/<img[^>]+(?:process-|general-cleaning|furniture-cleaning|after-renovation|gocoin)[^>]*>/g)].map(match => match[0]);
if (optimizedHomeImages.length !== 7) throw new Error("Homepage optimization must cover service, process, and offer icons");
for (const image of optimizedHomeImages) {
  if (!image.includes('loading="lazy"') || !image.includes('decoding="async"')) throw new Error("Homepage below-fold icons must defer loading and decoding");
}
const catalog = await readFile("dist/client/services.html", "utf8");
const sourceCatalog = catalog.slice(0, catalog.indexOf('<script src="data.js'));
if ((sourceCatalog.match(/<article class="catalog-card"/g) || []).length !== 14) {
  throw new Error("Services source HTML must contain exactly 14 catalog cards");
}
for (const file of ["privacy.html", "terms.html"]) {
  const html = await readFile(`dist/client/${file}`, "utf8");
  if (!html.includes(`<link rel="canonical" href="https://go-clean.uz/${file}">`)) throw new Error(`${file} canonical is missing`);
  if (!/<h1>[^<]+<\/h1>/.test(html)) throw new Error(`${file} source H1 is missing`);
}
const serviceShell = await readFile("dist/client/service.html", "utf8");
if (serviceShell.includes("const s = findService(slug)")) throw new Error("Unknown service slug must not fall back to General cleaning");
if (!serviceShell.includes("Xizmat topilmadi")) throw new Error("Unknown service slug must show a not-found state");
console.log("Goclean artifact is valid.");

