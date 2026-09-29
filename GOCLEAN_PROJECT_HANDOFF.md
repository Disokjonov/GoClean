# GoClean loyihasi — to‘liq texnik va mahsulot handoff

Yangilangan sana: 2026-09-28  
Holat: production sayti ishlayapti, keyingi bosqich — to‘liq app/backend platformasi

## 1. Asosiy manzillar

- Production sayt: https://go-clean.uz/
- `www` domen: https://www.go-clean.uz/ (asosiy domenga redirect)
- Render subdomain: https://goclean-uz.onrender.com/
- Oldingi Sites preview: https://goclean-uz.bositkhans01.chatgpt.site/
- GitHub repository: https://github.com/Disokjonov/GoClean
- Lokal loyiha papkasi: `/Users/davronbekisokjonov/Documents/Codex/2026-09-25/top-kz-saytini-shunchalik-o-rgan`
- Lead API: `https://goclean-leads.bositkhans01.workers.dev/api/lead`

## 2. Loyiha nimaga asoslangan

Saytning savdo va UX mexanikasi `top.kz` sayti o‘rganilgandan keyin qurilgan. Kod yoki dizayn pikselma-piksel ko‘chirilmagan. Quyidagi mahsulot tamoyillari olingan:

1. B2C va B2B foydalanuvchilar uchun alohida oqim.
2. Hero ichida narx kalkulyatori.
3. Kvartira va hovli uchun bir xil buyurtma oqimi.
4. “Ofis” tanlanganda alohida `/office-cleaning.html` sahifasiga o‘tish.
5. Biznes uchun umumiy `/business.html` sahifasi va ofis uchun alohida sahifa.
6. Uy/biznes kontekstiga qarab o‘zgaradigan mobil burger menyu.
7. B2C’da taxminiy narx, B2B’da konsultatsiya va joyida aniq hisob.
8. Xizmat → tafsilot → hisob/buyurtma → lead oqimi.

Muhim biznes qarori: `top.kz` dagi bizneslar uchun sarf materiallari do‘koni bu loyihadan olib tashlangan. GoClean’da faqat tozalash va unga yaqin xizmatlar qoldirilgan.

Xizmat nomlari va lokal takliflar `go-clean.uz` dagi amaldagi xizmatlarga tayangan holda tuzilgan.

## 3. Hozirgi mahsulot turi

Bu loyiha:

- responsive ko‘p sahifali marketing va sotuv sayti;
- uy va biznes uchun alohida funnel;
- xizmat katalogi;
- narx kalkulyatori;
- 4 bosqichli checkout prototipi;
- Telegram’ga xavfsiz lead yuboradigan tizim;
- o‘zbek/rus tilidagi interfeys.

Bu loyiha hali quyidagilar emas:

- to‘liq CRM;
- buyurtmalar uchun haqiqiy ma’lumotlar bazasi;
- haqiqiy SMS/OTP autentifikatsiya;
- Click/Payme real to‘lov integratsiyasi;
- admin panel;
- xodimlar/dispetcher app’i;
- serverdagi markaziy pricing engine.

## 4. Texnologiyalar

Frontend:

- HTML5
- CSS3
- Vanilla JavaScript (frameworksiz)
- Manrope Google Font
- `localStorage` — til va prototip buyurtmalar tarixi uchun
- `<picture>` + AVIF/WebP/PNG fallback

Build:

- Node.js ESM
- custom `scripts/build.mjs`
- npm scriptlar: `npm run build`, `npm run check`

Hosting:

- Render Static Site — production frontend
- GitHub `main` branch’dan auto-deploy
- `dist/client` publish directory

Lead backend:

- Cloudflare Worker / Fetch API
- Telegram Bot API
- secrets faqat server environment’da

Sayt ataylab frameworksiz yozilgan: hozirgi marketing saytini arzon, tez va statik hostingda ishlatish uchun. Keyingi “app” bosqichida React/Next.js yoki boshqa app frameworkiga ko‘chirish tavsiya qilinadi.

## 5. Papka va fayllar xaritasi

### Asosiy sahifalar

- `index.html` — bosh sahifa, hero, kalkulyator, xizmatlar, konsultatsiya, jarayon, ishonch, FAQ.
- `services.html` — barcha xizmatlar katalogi va filtrlar.
- `service.html` — `?slug=` orqali dinamik xizmat tafsiloti.
- `booking.html` — 4 bosqichli checkout.
- `business.html` — umumiy B2B sahifa.
- `office-cleaning.html` — ofis/ombor/ishlab chiqarish uchun alohida funnel.
- `business-request.html` — biznes konsultatsiya formasi.
- `contact.html` — kontakt va qayta qo‘ng‘iroq formasi.
- `auth.html` — prototip shaxsiy kabinet/OTP sahifasi.
- `legal.html` — maxfiylik va foydalanish shartlari.

### Frontend logikasi

- `styles.css` — barcha sahifalar dizayn tizimi, responsive layout, mobil menyu, kartalar, formalar.
- `app.js` — bosh sahifa kalkulyatori, hero til logikasi, popup va bosh sahifa formasi.
- `shared.js` — global header/footer, burger menyu, global UZ/RU tarjima, lead API client, honeypot, toast.
- `data.js` — xizmatlar katalogi, slug, nom, narx, tavsif, tarkib, kategoriya va booking turi.
- `booking.js` — checkout bosqichlari, narx hisoblash, chegirma, promokod, vaqt va buyurtma yuborish.
- `lead-forms.js` — biznes va kontakt formalarini lead API’ga ulaydi.

### Backend/build

- `worker/index.js` — `/api/lead` endpoint, validatsiya, rate limit, Telegram’ga yuborish va static asset serving.
- `scripts/build.mjs` — source fayllarni `dist/client` ga yig‘adi va Worker artifact yaratadi.
- `scripts/validate-artifact.mjs` — build natijasi va lead endpoint ulanishini tekshiradi.
- `render.yaml` — Render static deploy konfiguratsiyasi va security headerlar.
- `wrangler.jsonc` — Cloudflare Worker nomi va ruxsat etilgan originlar.
- `.env.example` — talab qilinadigan Telegram secret nomlari.
- `.openai/hosting.json` — oldingi Sites hosting project identifikatori.

### Assetlar

- `public/assets/goclean-logo.png` — foydalanuvchi bergan original logo, oq foni shaffof qilingan.
- `public/assets/goclean-hero.avif`
- `public/assets/goclean-hero.webp`
- `public/assets/goclean-hero.png`
- xizmat kartalari uchun boshqa rasmlar build/public ichida ishlatiladi.

### Build natijasi

- `dist/client/*` — Render’da chop etiladigan frontend.
- `dist/server/index.js` — Worker build nusxasi.
- `dist/server/wrangler.json` — Worker artifact konfiguratsiyasi.

`dist` source emas; source fayllar root papkada. O‘zgartirish root fayllarda qilinadi, keyin `npm run build` ishlatiladi.

## 6. Sahifa va foydalanuvchi oqimlari

### Bosh sahifa

Hero ikkita asosiy maqsadni birlashtiradi:

- uy uchun tozalash;
- biznes/tijorat obyektlari uchun tozalash.

Headline: “Uy va biznes uchun professional tozalash”.

Kalkulyatorda uch obyekt bor:

- Kvartira
- Hovli
- Ofis

Kvartira va hovli:

1. foydalanuvchi xona va sanuzel sonini tanlaydi;
2. tozalash turini tanlaydi;
3. narx real vaqtda o‘zgaradi;
4. “Buyurtma berish” booking sahifasiga parametrlar bilan olib o‘tadi;
5. “Raqam qoldirish” popup form ochadi.

Ofis:

- kalkulyator ichida tanlanganda `office-cleaning.html` ga o‘tadi;
- uy checkout’iga tushmaydi;
- sabab: B2B narxi xona formulasi bilan emas, maydon, zonalar, grafik va murakkablik bo‘yicha konsultatsiyada hisoblanadi.

Mobil versiyada “Uyingizni tanlang” sarlavhasi yashirilgan. “Narx kalkulyatori” va “Onlayn” qatori qoladi. Maqsad — kartani yuqoriga ko‘tarish va birinchi ekranda ko‘proq boshqaruv elementini ko‘rsatish.

### Xizmatlar katalogi

`services.html`:

- kategoriyalar bo‘yicha filter;
- xizmatga mos banner rasm;
- qisqa tavsif;
- narx birligi;
- “Batafsil” va “Buyurtma” alohida katta click-target.

`service.html?slug=...`:

- xizmat ma’lumoti `data.js` dan olinadi;
- tarkib, narx, birlik, jarayon va CTA ko‘rsatiladi.

### Booking

`booking.html` 4 bosqichdan iborat:

1. xizmat, obyekt, maydon, sanuzel va qo‘shimcha xizmatlar;
2. ism, telefon, manzil, izoh;
3. sana va vaqt;
4. to‘lov usuli va tasdiqlash.

To‘lov variantlari hozir UI/prototip:

- naqd yoki karta;
- Click;
- Payme.

Real payment gateway ulanmagan.

Asosiy aksiyasi: yangi mijozning birinchi buyurtmasiga 15% chegirma. Chegirma checkout hisobiga avtomatik qo‘llanadi; eski haftalik/oylik obuna chegirmalari olib tashlangan.

Buyurtma muvaffaqiyatli yuborilganda:

- Telegram’ga lead yuboriladi;
- buyurtma lokal `gocleanOrders` ga yoziladi;
- `GC-xxxxxx` formatida lokal order ID yaratiladi.

### Biznes sahifasi

`business.html` umumiy korporativ taklif:

- ofis;
- do‘kon/showroom;
- ombor/ishlab chiqarish;
- fasad/vitrina;
- pol/marmar;
- dezinfeksiya.

Asosiy va’da: xodim, grafik, inventar, kimyo va sifat nazoratini bitta hamkor boshqaradi.

Hero’dagi form `business-request.html` ga parametrlar bilan olib boradi.

### Ofis sahifasi

`office-cleaning.html` `/business` dan farqli, aniq ofis funnelidir:

- muntazam tozalash;
- general tozalash;
- ombor va sex;
- ta’mirdan keyin;
- oyna va vitrina;
- dezinfeksiya.

Narxning 3 yo‘li:

- saytdagi ariza;
- telefon;
- Telegram.

### Kontakt va konsultatsiya

Formalar:

- calculator callback;
- bosh sahifa konsultatsiyasi;
- biznes arizasi;
- kontakt savoli;
- to‘liq buyurtma.

Hammasi bitta lead API orqali Telegram’ga ketadi.

### Auth/profil

`auth.html` faqat prototip:

- telefon kiritish;
- test kodi `1234`;
- lokal buyurtmalar tarixini ko‘rsatish.

Bu production authentication emas. Keyingi app’da SMS provider va server session/JWT bilan almashtirish kerak.

## 7. Xizmatlar katalogi

`data.js` da hozir quyidagi xizmatlar bor:

1. General tozalash
2. Mebel kimyoviy tozalash
3. Marmar tozalash
4. Gilam yuvish
5. Bruschatka tozalash
6. Oyna yuvish
7. Parda yuvish
8. Fasad yuvish
9. Pled yuvish
10. Ta’mirdan keyin tozalash
11. Favqulodda holatdan keyin
12. Hidlarni yo‘qotish
13. Mog‘orni yo‘qotish
14. Dezinfeksiya

Har bir service obyektida:

- `slug`
- `image`
- `icon`
- `name`
- `price`
- `unit`
- `category`
- `summary`
- `description`
- `includes[]`
- `bookingType`

bor.

## 8. Narx hisoblash

### Hero kalkulyatori

`app.js` dagi formula:

- Kvartira: base 99 000, har xona 60 000, har sanuzel 30 000.
- Hovli: base 149 000, har xona 72 000, har sanuzel 35 000.
- Ofis: kodda qiymat mavjud, lekin UI ofis sahifasiga redirect qiladi.

Tozalash koeffitsiyenti:

- bir martalik/standart: `1`
- general: `1.8`
- ta’mirdan keyin: `2.65`

### Booking kalkulyatori

`booking.js` da alohida prototip formula bor:

- general base: 500 000;
- kimyoviy: 100 000;
- oyna: 14 000/m² dan;
- maxsus: 15 000/m² dan;
- fasad: 18 000/m²;
- ta’mirdan keyin: 16 000/m²;
- favqulodda: 22 000/m²;
- hid: 12 000/m²;
- mog‘or: 25 000/m²;
- dezinfeksiya: 10 000/m².

Xizmat katalogidagi tasdiqlangan diapazonlar:

- marmar: 15 000–20 000 so‘m/m²;
- gilam: 15 000–30 000 so‘m/m²;
- bruschatka: 15 000 so‘mdan/m²;
- oyna: 14 000–16 000 so‘m/m²;
- parda: 25 000–30 000 so‘m/metr;
- pled: 100 000–150 000 so‘m/dona.

Birinchi buyurtma chegirmasi: 15%.

Muhim: bu formulalar biznes tomonidan tasdiqlangan production pricing emas. App qurishda narx qoidalarini frontenddan chiqarib, backend pricing engine va admin panelga o‘tkazish kerak.

## 9. Ikki tilli tizim

Til kaliti: `localStorage.gocleanLang`.

Qoidalar:

- foydalanuvchi bir marta RU yoki UZ tanlasa, boshqa sahifalarda ham shu til saqlanadi;
- global matnlar `shared.js` lug‘ati orqali tarjima qilinadi;
- bosh sahifadagi `data-i18n` elementlari `app.js` orqali tarjima qilinadi;
- dynamically rendered katalog matnlari MutationObserver orqali tarjima qilinadi;
- narx valyutasi UZ’da `so‘m`, RU’da `сум`;
- tarjima source’i o‘zbekcha, ruscha mapping JavaScript lug‘atda.

Kesh muammosini oldini olish uchun HTML’da versiyalar ishlatiladi:

- `styles.css?v=6`
- `shared.js?v=6`
- `app.js?v=5`

Keyingi app’da lug‘atlarni JSON/i18n kutubxonasiga ajratish kerak. UI matnlarini DOM text replacement bilan emas, aniq translation key orqali render qilish tavsiya etiladi.

## 10. Lead va Telegram oqimi

Frontend `window.GoCleanLeads.send(type, data, form)` chaqiradi.

Production endpoint:

`https://goclean-leads.bositkhans01.workers.dev/api/lead`

Qo‘llanadigan lead turlari:

- `callback`
- `consultation`
- `business`
- `contact`
- `order`

Telegram’ga yuboriladigan maydonlar lead turiga qarab whitelist qilingan.

Telegram environment secretlari:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `TELEGRAM_MESSAGE_THREAD_ID` — optional

Bot token frontendga yozilmagan va brauzerga berilmaydi.

### Xavfsizlik

Worker quyidagilarni qiladi:

- origin whitelist;
- faqat JSON;
- faqat POST;
- 12 KB request limit;
- IP bo‘yicha 1 daqiqada 5 ta urinish;
- honeypot `website` maydoni;
- input length limit va control-character tozalash;
- Telegram HTML escape;
- ruxsat etilgan maydonlar whitelist;
- bot token yo‘q bo‘lsa xato va telefon fallback;
- `nosniff`, referrer, frame va permissions security headerlar.

Ruxsat etilgan production originlar:

- `https://goclean-uz.onrender.com`
- `https://go-clean.uz`
- `https://www.go-clean.uz`

Rate limit hozir Worker memory Map’ida. Kengaytirilgan production’da Cloudflare KV/Durable Object yoki alohida rate-limit service ishlatish kerak.

## 11. Hosting va deploy

### GitHub

Repository: `Disokjonov/GoClean`  
Asosiy branch: `main`

### Render

`render.yaml`:

- service: `goclean-uz`
- runtime: static
- autoDeploy: true
- build: `npm run build`
- publish: `./dist/client`

Har `git push origin main` dan keyin Render avtomatik build/deploy qiladi.

### Domen

- `go-clean.uz` Render static site’ga ulangan.
- `www.go-clean.uz` asosiy domenga redirect.
- SSL sertifikat Render tomonidan chiqarilgan.
- Avvalgi WordPress DNS’dan uzilib Render’ga yo‘naltirilgan.
- Email/MX bu loyiha uchun ishlatilmaydi.

### Eski Sites hosting

Loyihada `.openai/hosting.json` va `sites` git remote qolgan. Bu oldingi ChatGPT Sites preview/deploy uchun. Production manba hozir GitHub + Render.

## 12. Dizayn tizimi va UX qarorlari

Brend:

- asosiy to‘q yashil: `#0b6b62` atrofida;
- ikkilamchi yashil: `#13998a`;
- to‘q matn: `#102a2b`;
- coral CTA: `#ff765f`;
- mint fonlar;
- logo original yashil-ko‘k rangda.

Tipografika:

- Manrope;
- yirik, zich headline;
- uzun ruscha matnlar uchun alohida responsive o‘lchamlar;
- mobile va desktopda headline/kalkulyator overlap qilmasligi uchun max-width va grid chegaralari.

Kartalar:

- foydalanuvchi ko‘p scroll qilmasligi uchun ixchamlashtirilgan;
- xizmat kartalaridagi rasm card banneri sifatida;
- mobil versiyada to‘liq original rasm yuklanmaydi: AVIF/WebP va card o‘lchamiga mos asset ishlatiladi;
- action matni kichik text-link emas, bosiladigan katta tugma sifatida.

Formalar:

- popup tashqarisiga bosilganda yopiladi;
- “Qo‘ng‘iroqni so‘rash” o‘rniga “Raqam qoldirish”;
- konsultatsiya maqsadi: mutaxassis joyiga boradi, maydon/murakkablikni baholaydi, nimalar kerakligini va aniq narxni aytadi;
- “ko‘rik” so‘zi ishlatilmaydi.

Mobil:

- burger menyu uy/biznes tablariga ega;
- tab o‘zgarsa ichki link va pastki CTA ham o‘zgaradi;
- mobil ekranda o‘ng pastda ixcham Telegram va telefon floating tugmalari;
- kalkulyator sarlavhasi ixcham;
- barcha `select` maydonlari bir xil, sodda va o‘qilishi qulay GoClean uslubidagi bottom-sheet/dialog orqali ochiladi; qidiruv va icon yo‘q, shuning uchun mobil klaviatura avtomatik chiqmaydi;
- kabinet funksiyasi saqlangan prototip bo‘lsa-da, hozircha sayt navigatsiyasi va buyurtma tasdiqlash oynasidan uning barcha kirish tugmalari yashirilgan;
- kartalar va jarayon bloklari scrollni kamaytirish uchun zich.

## 13. Logo va tasvirlar

Logo foydalanuvchi bergan PNG’dan olingan. Oq fon olib tashlanib shaffof PNG qilingan. Header va footerda shu fayl ishlatiladi.

Hero rasm tozalash xodimini ko‘rsatadi va uch formatda berilgan:

- AVIF — birinchi tanlov;
- WebP — fallback;
- PNG — eski brauzer fallback.

Maqsad: mobil trafikda rasm og‘irligini kamaytirish va tez yuklanish.

## 14. Build va tekshiruv

Ishlash tartibi:

```bash
npm run build
npm run check
```

`build`:

- eski `dist` ni tozalaydi;
- HTML/CSS/JS ni `dist/client` ga ko‘chiradi;
- public assetlarni ko‘chiradi;
- Worker artifact yaratadi.

`check`:

- kerakli dist fayllarni tekshiradi;
- Worker default `fetch` handler mavjudligini tekshiradi;
- frontend lead endpointga ulanganini tekshiradi.

Lokal preview:

```bash
npm run build
python3 -m http.server 4176 -d dist/client
```

Keyin: `http://127.0.0.1:4176/index.html`

## 15. Muhim cheklovlar va qarzlar

1. `auth.html` test/prototip; kod `1234`.
2. Buyurtmalar bazada emas, faqat localStorage’da.
3. Click/Payme real integratsiya qilinmagan.
4. Narxlar ikki frontend faylga qotirilgan va bir-biridan farq qilishi mumkin.
5. CRM/amoCRM hali lead pipeline’ga ulanmagan.
6. Analytics, Meta Pixel, GA4, GTM va call tracking productionda hali aniq sozlanmagan.
7. Admin panel yo‘q.
8. Xodim schedule/availability yo‘q.
9. Service zone va manzil geolokatsiyasi yo‘q.
10. SEO uchun framework-level metadata va sitemap kengaytirilishi kerak.
11. Tarjima lug‘ati katta `shared.js` ichida; app’da modular i18n kerak.
12. Telegram Worker rate limit persistent emas.
13. Business form’dagi eski inline localStorage submit handler `lead-forms.js` tomonidan override qilinadi; app refactorida inline scriptlar olib tashlanishi kerak.
14. Render static sayt backend vazifasini bajarmaydi; lead backend alohida Cloudflare Worker’da.

## 16. Keyingi app uchun tavsiya etiladigan arxitektura

Tavsiya:

- Frontend: Next.js + TypeScript.
- UI: mavjud GoClean dizayn tokenlarini ko‘chirish.
- API: Next.js server/API yoki alohida NestJS/Fastify.
- Database: PostgreSQL.
- ORM: Prisma yoki Drizzle.
- Auth: telefon OTP + secure session.
- Storage: S3/R2 — xizmat rasmlari, oldin/keyin fotolari.
- Queue: notification va Telegram/CRM uchun background jobs.
- Admin: xizmatlar, narx qoidalari, buyurtmalar, xodimlar, zonalar, promokodlar.
- CRM: amoCRM webhook/API.
- Payment: Click va Payme merchant API.
- Maps: Yandex/Google/2GIS yoki mahalliy mos servis.
- Analytics: GA4/GTM, Meta Pixel, Yandex Metrika va server-side conversion events.

### Tavsiya etiladigan domain modellari

- User / Customer
- Address
- ServiceCategory
- Service
- ServicePackage
- IncludedTask
- AddOn
- PricingRule
- City / ServiceZone
- Order
- OrderItem
- Appointment / TimeSlot
- Recurrence
- Cleaner / Employee
- Verification
- Assignment
- Payment
- PromoCode
- Review
- QualityIssue
- B2BLead
- Company
- Contract
- Document
- LeadEvent / CRMEvent

### Pricing engine

Yagona server pricing engine quyidagilarni qabul qilishi kerak:

- city/zone;
- object type;
- service/package;
- rooms/bathrooms yoki area;
- floor/material;
- frequency;
- date/time coefficient;
- add-ons;
- promo;
- minimum order.

Frontend faqat server qaytargan quote’ni ko‘rsatadi. Admin pricing rule’larni boshqaradi.

## 17. Keyingi chatga beriladigan tayyor kontekst

Quyidagi matnni yangi chatga yuborish mumkin:

> Bizda GoClean uchun ishlaydigan ko‘p sahifali production sayt bor. Repository: https://github.com/Disokjonov/GoClean, live: https://go-clean.uz/. Hozirgi sayt vanilla HTML/CSS/JS, Render Static Site’da host qilingan. Telegram leadlari alohida Cloudflare Worker orqali xavfsiz yuboriladi. Saytda B2C kalkulyator, xizmat katalogi, detail pages, 4 bosqichli checkout prototipi, B2B landing, alohida office-cleaning funnel, konsultatsiya/contact formalar, UZ/RU til persistence va responsive dizayn bor. `GOCLEAN_PROJECT_HANDOFF.md` hujjatini to‘liq o‘qi. Keyingi vazifa: mavjud dizayn va biznes oqimlarini saqlagan holda Next.js + TypeScript + PostgreSQL asosida to‘liq app arxitekturasini qurish. Pricing frontendda hardcode bo‘lmasin; admin boshqaradigan server pricing engine bo‘lsin. Real OTP, Click/Payme, amoCRM, buyurtmalar bazasi, schedule, admin panel va analytics qo‘shilsin. B2C va B2B funnel alohida qolishi, ofis kalkulyator tanlovi office sahifasiga o‘tishi, tanlangan til barcha sahifalarda saqlanishi kerak. Ishni boshlashdan oldin mavjud repo va handoff’dagi cheklovlarni audit qil.

## 18. Asosiy qarorlarning sababi

- **Statik Render hosting:** marketing sayt uchun arzon va tez; server kerak bo‘lmagan sahifalar CDN’dan beriladi.
- **Lead uchun alohida Worker:** Telegram tokenni frontendga bermaslik va formalarni xavfsiz qabul qilish.
- **B2C/B2B ajratilishi:** uy narxi tez hisoblanadi, biznes obyektiga esa individual konsultatsiya kerak.
- **Ofis alohida page:** u umumiy `/business` landingidan farqli, aniq xizmat funnelidir.
- **UZ/RU persistence:** foydalanuvchi har sahifada tilni qayta tanlamasligi uchun.
- **AVIF/WebP:** mobil tezlik va trafikni kamaytirish.
- **Ixcham kartalar:** uzun scroll va foydalanuvchi charchashini kamaytirish.
- **Katta card CTA:** “Batafsil/Taklif olish” matni ko‘rinib turib, click qilish qiyin bo‘lmasligi uchun.
- **Joyida konsultatsiya:** biznes va murakkab obyektlarda maydon, ish hajmi va murakkabliksiz aniq narx berib bo‘lmaydi.
- **Professional xodimlar:** “ijrochi” so‘zidan ko‘ra GoClean jamoasi va nazorat tizimini yaxshiroq ifodalaydi.
- **6 yil tajriba:** biznes bergan amaldagi ma’lumotga moslashtirilgan.

## 19. Git holati

Handoff yozilgan paytda:

- branch: `main`
- production remote: `origin`
- Sites remote: `sites`
- oxirgi asosiy UI/i18n commit: `a597ba3 Fix bilingual UI and responsive hero layout`
- source worktree handoffdan oldin clean edi.
