import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const output = resolve(root, "dist");
if (output !== `${root}/dist`) throw new Error("Unexpected output path");

await rm(output, { recursive: true, force: true });
await mkdir(resolve(output, "client"), { recursive: true });
await mkdir(resolve(output, "server"), { recursive: true });
await mkdir(resolve(output, ".openai"), { recursive: true });

const entries = await readdir(root, { withFileTypes: true });
const excludedClientFiles = new Set(["auth.html"]);
for (const entry of entries) {
  if (entry.isFile() && !excludedClientFiles.has(entry.name) && /\.(html|css|js|txt|xml|svg)$/.test(entry.name)) {
    await cp(resolve(root, entry.name), resolve(output, "client", entry.name));
  }
}
await cp(resolve(root, "public"), resolve(output, "client", "public"), { recursive: true });

const seoPages = {
  "index.html": { canonical: "https://go-clean.uz/" },
  "services.html": {
    canonical: "https://go-clean.uz/services.html",
    description: "Toshkentda uy, ofis va maxsus obyektlar uchun GoClean tozalash xizmatlari katalogi. Xizmat tarkibi va dastlabki narxlarni ko‘ring."
  },
  "business.html": { canonical: "https://go-clean.uz/business.html" },
  "office-cleaning.html": { canonical: "https://go-clean.uz/office-cleaning.html" },
  "contact.html": {
    canonical: "https://go-clean.uz/contact.html",
    description: "GoClean bilan buyurtma, xizmat tarkibi yoki korporativ hamkorlik bo‘yicha bog‘laning. Toshkentdagi aloqa ma’lumotlari."
  },
  "booking.html": {
    canonical: "https://go-clean.uz/booking.html",
    robots: "noindex,follow",
    description: "GoClean tozalash xizmatini tanlang, obyekt ma’lumotlari va qulay vaqtni kiriting."
  },
  "business-request.html": {
    canonical: "https://go-clean.uz/business-request.html",
    robots: "noindex,follow",
    description: "GoClean biznes tozalash xizmati uchun obyekt ma’lumotlarini qoldirib, bepul konsultatsiya so‘rang."
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
    tags.push('<script src="seo-runtime.js?v=1" defer></script>');
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

