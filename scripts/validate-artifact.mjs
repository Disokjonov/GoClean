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
  ["/our-services/?utm_source=search", "/services.html?utm_source=search"]
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
  const submit = payload => {
    const body = JSON.stringify({ type: "order", language: "uz", page: "/service-lead-test", ...payload });
    return worker.default.fetch(new Request("https://go-clean.uz/api/lead", {
      method: "POST",
      headers: { origin: "https://go-clean.uz", "content-type": "application/json", "content-length": String(body.length) },
      body
    }), { TELEGRAM_BOT_TOKEN: "mock", TELEGRAM_CHAT_ID: "mock" });
  };
  const shortResponse = await submit({ service: "General tozalash", area: "75 m²", name: "Test User", phone: "+998900000000" });
  if (shortResponse.status !== 200) throw new Error("Short order payload must be accepted");
  const legacyResponse = await submit({ service: "General tozalash", object: "Kvartira", name: "Test User", phone: "+998900000000", address: "Test manzil", date: "2026-11-10", time: "10:00", payment: "after-service" });
  if (legacyResponse.status !== 200) throw new Error("Legacy order payload must remain accepted during rollout");
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
const renderBlueprint = await readFile("render.yaml", "utf8");
for (const authPath of ["/auth", "/auth.html"]) {
  if (!renderBlueprint.includes(`source: ${authPath}`)) throw new Error(`Render redirect is missing ${authPath}`);
}
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
console.log("Goclean artifact is valid.");

