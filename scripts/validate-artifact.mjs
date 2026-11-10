import { access, readFile } from "node:fs/promises";

for (const path of [
  "dist/server/index.js",
  "dist/server/wrangler.json",
  "dist/client/index.html",
  "dist/client/shared.js",
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
    ["business", { name: "Test User", phone: "+998900000000", object: "Ofis", area: "100 m²", service: "Muntazam" }],
    ["contact", { name: "Test User", phone: "+998900000000", message: "Savol" }],
    ["meta", { name: "Test User", phone: "+998900000000", service: "General" }],
    ["discount", { name: "Test User", phone: "+998900000000", source: "Popup" }]
  ]) {
    const response = await submit(type, payload);
    if (response.status !== 200) throw new Error(`${type} payload must be accepted`);
  }
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

const source = await readFile("dist/client/shared.js", "utf8");
if (!source.includes("/api/lead")) throw new Error("Lead endpoint is not wired into the client");
if (!source.includes("icon.textContent=error?'!':'✓'")) throw new Error("Lead toast icon must reflect error state");
if (!source.includes("catch{throw new Error(leadErrorText())}")) throw new Error("Network failures must use the localized lead error");
const businessLead = await readFile("dist/client/lead-forms.js", "utf8");
for (const queryValue of ["office", "retail", "warehouse", "regular-office", "general-office"]) {
  if (!businessLead.includes(`'${queryValue}'`)) throw new Error(`Business preselection is missing ${queryValue}`);
}
if (!businessLead.includes("select.dispatchEvent(new Event('change',{bubbles:true}))")) {
  throw new Error("Business preselection must update the visible styled select");
}
const businessPage = await readFile("dist/client/business.html", "utf8");
for (const queryValue of ["office", "retail", "warehouse", "production"]) {
  if (!businessPage.includes(`value="${queryValue}"`)) throw new Error(`Business quick form is missing ${queryValue}`);
}
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

