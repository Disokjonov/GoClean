const ALLOWED_TYPES = new Set(["callback", "consultation", "business", "contact", "order", "meta", "discount"]);
const attempts = new Map();

const labels = {
  callback: "Yangi qo‘ng‘iroq so‘rovi",
  consultation: "Yangi konsultatsiya so‘rovi",
  business: "Yangi biznes arizasi",
  contact: "Yangi murojaat",
  order: "Yangi xizmat arizasi",
  meta: "Meta Ads orqali yangi ariza",
  discount: "Maxsus chegirma popupidan yangi lead"
};

const fieldLabels = {
  id: "Ariza raqami", name: "Ism", phone: "Telefon", service: "Xizmat",
  object: "Obyekt", area: "Maydon", parameter: "Hisob parametri", bathrooms: "Sanuzel", frequency: "Takrorlanish",
  extras: "Qo‘shimcha xizmatlar", address: "Manzil", comment: "Izoh", date: "Sana",
  time: "Vaqt", total: "Taxminiy narx", payment: "To‘lov", message: "Savol",
  property: "Joy turi", cleaningType: "Tozalash turi", rooms: "Xonalar", page: "Sahifa", source: "Lead manbasi"
};

const allowedFields = {
  callback: ["name", "phone", "property", "cleaningType", "rooms", "bathrooms", "total", "page"],
  consultation: ["name", "phone", "page"],
  business: ["object", "area", "service", "name", "phone", "page"],
  contact: ["name", "phone", "message", "page"],
  order: ["id", "service", "object", "area", "parameter", "bathrooms", "frequency", "extras", "name", "phone", "address", "comment", "date", "time", "total", "payment", "page"],
  meta: ["service", "name", "phone", "page"],
  discount: ["name", "phone", "source", "page"]
};

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extraHeaders }
  });
}

function allowedOrigin(request, env) {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  const requestOrigin = new URL(request.url).origin;
  if (origin === requestOrigin) return origin;
  const configured = String(env.ALLOWED_ORIGINS || "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);
  return configured.includes(origin) ? origin : null;
}

function withCors(response, origin) {
  if (!origin) return response;
  const headers = new Headers(response.headers);
  headers.set("access-control-allow-origin", origin);
  headers.set("vary", "Origin");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function clean(value, max = 240) {
  if (Array.isArray(value)) return value.map(item => clean(item, 80)).filter(Boolean).slice(0, 12).join(", ");
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

function validate(type, input) {
  const data = {};
  for (const key of allowedFields[type]) data[key] = clean(input[key], key === "message" || key === "comment" ? 500 : 240);
  const digits = data.phone.replace(/\D/g, "");
  if (data.name.length < 2 || data.name.length > 80) return { error: "Ismni to‘g‘ri kiriting." };
  if (digits.length < 9 || digits.length > 15) return { error: "Telefon raqamini to‘g‘ri kiriting." };
  if (type === "business" && (!data.object || !data.area || !data.service)) return { error: "Obyekt ma’lumotlarini to‘ldiring." };
  if (type === "meta" && !data.service) return { error: "Kerakli xizmatni tanlang." };
  if (type === "order" && !data.service) return { error: "Kerakli xizmatni tanlang." };
  return { data };
}

function rateLimited(request) {
  const key = request.headers.get("cf-connecting-ip") || "unknown";
  const now = Date.now();
  const recent = (attempts.get(key) || []).filter(time => now - time < 60_000);
  recent.push(now);
  attempts.set(key, recent);
  if (attempts.size > 1000) attempts.clear();
  return recent.length > 5;
}

async function submitLead(request, env) {
  const origin = allowedOrigin(request, env);
  if (!origin) return json({ ok: false, message: "So‘rov manbasi tasdiqlanmadi." }, 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return json({ ok: false, message: "Noto‘g‘ri so‘rov turi." }, 415);
  if (Number(request.headers.get("content-length") || 0) > 12_000) return json({ ok: false, message: "So‘rov juda katta." }, 413);
  if (rateLimited(request)) return json({ ok: false, message: "Juda ko‘p urinish. Bir daqiqadan keyin qayta urinib ko‘ring." }, 429);

  let input;
  try { input = await request.json(); } catch { return json({ ok: false, message: "Ma’lumotlar o‘qilmadi." }, 400); }
  if (!input || typeof input !== "object" || Array.isArray(input)) return json({ ok: false, message: "Noto‘g‘ri ma’lumot." }, 400);
  if (clean(input.website, 100)) return json({ ok: true });

  const type = clean(input.type, 32);
  if (!ALLOWED_TYPES.has(type)) return json({ ok: false, message: "Ariza turi topilmadi." }, 400);
  const result = validate(type, input);
  if (result.error) return json({ ok: false, message: result.error }, 422);
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return json({ ok: false, message: "Qabul xizmati hozircha sozlanmagan. Iltimos, +998 97 707 15 15 raqamiga qo‘ng‘iroq qiling." }, 503);

  const lines = [`🧹 <b>${escapeHtml(labels[type])}</b>`];
  for (const key of allowedFields[type]) {
    const value = result.data[key];
    if (value) lines.push(`<b>${escapeHtml(fieldLabels[key] || key)}:</b> ${escapeHtml(value)}`);
  }
  lines.push(`<b>Til:</b> ${clean(input.language, 8) === "ru" ? "RU" : "UZ"}`);
  lines.push(`<b>Yuborildi:</b> ${new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" })}`);

  const telegramPayload = {
    chat_id: env.TELEGRAM_CHAT_ID,
    text: lines.join("\n"),
    parse_mode: "HTML",
    disable_web_page_preview: true
  };
  if (env.TELEGRAM_MESSAGE_THREAD_ID) telegramPayload.message_thread_id = Number(env.TELEGRAM_MESSAGE_THREAD_ID);

  let telegramResponse;
  try {
    telegramResponse = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(telegramPayload)
    });
  } catch {
    return json({ ok: false, message: "Arizani yuborib bo‘lmadi. Iltimos, qayta urinib ko‘ring." }, 502);
  }
  if (!telegramResponse.ok) return json({ ok: false, message: "Arizani yuborib bo‘lmadi. Iltimos, telefon orqali bog‘laning." }, 502);
  return json({ ok: true });
}

function secureStatic(response) {
  const headers = new Headers(response.headers);
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("x-frame-options", "SAMEORIGIN");
  headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function permanentRedirect(url, pathname) {
  const destination = new URL(url);
  destination.pathname = pathname;
  return Response.redirect(destination, 301);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/index.html") return permanentRedirect(url, "/");
    if (url.pathname === "/our-services/") return permanentRedirect(url, "/services.html");
    if (url.pathname === "/offer") {
      if (!env.ASSETS) return json({ ok: false, message: "Not found" }, 404);
      const assetUrl = new URL(request.url);
      assetUrl.pathname = "/offer.html";
      return secureStatic(await env.ASSETS.fetch(new Request(assetUrl, request)));
    }
    if (url.pathname === "/auth" || url.pathname === "/auth.html") {
      return Response.redirect(new URL("/", url), 302);
    }
    if (url.pathname === "/api/lead") {
      const origin = allowedOrigin(request, env);
      if (request.method === "OPTIONS") {
        if (!origin) return new Response(null, { status: 403 });
        return new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": origin,
            "access-control-allow-methods": "POST, OPTIONS",
            "access-control-allow-headers": "content-type",
            "access-control-max-age": "86400",
            "vary": "Origin"
          }
        });
      }
      if (request.method !== "POST") return withCors(json({ ok: false, message: "Faqat POST so‘rovi qabul qilinadi." }, 405, { allow: "POST" }), origin);
      return withCors(await submitLead(request, env), origin);
    }
    if (!env.ASSETS) return json({ ok: false, message: "Not found" }, 404);
    return secureStatic(await env.ASSETS.fetch(request));
  }
};
