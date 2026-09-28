const ALLOWED_TYPES = new Set(["callback", "consultation", "business", "contact", "order"]);
const attempts = new Map();

const labels = {
  callback: "Yangi qo‘ng‘iroq so‘rovi",
  consultation: "Yangi konsultatsiya so‘rovi",
  business: "Yangi biznes arizasi",
  contact: "Yangi murojaat",
  order: "Yangi buyurtma"
};

const fieldLabels = {
  id: "Buyurtma raqami", name: "Ism", phone: "Telefon", service: "Xizmat",
  object: "Obyekt", area: "Maydon", bathrooms: "Sanuzel", frequency: "Takrorlanish",
  extras: "Qo‘shimcha xizmatlar", address: "Manzil", comment: "Izoh", date: "Sana",
  time: "Vaqt", total: "Taxminiy narx", payment: "To‘lov", message: "Savol",
  property: "Joy turi", cleaningType: "Tozalash turi", rooms: "Xonalar", page: "Sahifa"
};

const allowedFields = {
  callback: ["name", "phone", "property", "cleaningType", "rooms", "bathrooms", "total", "page"],
  consultation: ["name", "phone", "page"],
  business: ["object", "area", "service", "name", "phone", "page"],
  contact: ["name", "phone", "message", "page"],
  order: ["id", "service", "object", "area", "bathrooms", "frequency", "extras", "name", "phone", "address", "comment", "date", "time", "total", "payment", "page"]
};

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extraHeaders }
  });
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
  if (type === "order" && (!data.service || !data.object || !data.address || !data.date || !data.time)) return { error: "Buyurtma ma’lumotlarini to‘liq kiriting." };
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
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");
  if (!origin || origin !== requestUrl.origin) return json({ ok: false, message: "So‘rov manbasi tasdiqlanmadi." }, 403);
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/lead") {
      if (request.method !== "POST") return json({ ok: false, message: "Faqat POST so‘rovi qabul qilinadi." }, 405, { allow: "POST" });
      return submitLead(request, env);
    }
    if (!env.ASSETS) return new Response("Static assets binding is missing", { status: 500 });
    return secureStatic(await env.ASSETS.fetch(request));
  }
};

