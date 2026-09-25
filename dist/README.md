# Goclean.uz — website prototype

Goclean.uz uchun responsive, ishlaydigan landing-page prototipi.

## Ishga tushirish

```bash
python3 -m http.server 4173
```

Brauzerda `http://127.0.0.1:4173` manzilini oching.

## Tayyor funksiyalar

- Desktop va mobil responsive dizayn
- Go-clean.uz xizmatlari asosidagi alohida katalog
- Har bir xizmat uchun alohida batafsil sahifa
- Obyekt, maydon, xizmat, chastota va qo‘shimchalar bo‘yicha dinamik narx
- 4 bosqichli checkout: xizmat → kontakt/manzil → sana/vaqt → to‘lov
- Buyurtma raqami va lokal buyurtmalar tarixi
- Telefon/OTP ko‘rinishidagi shaxsiy kabinet
- B2B uchun alohida landing va alohida lead formasi
- Kontakt va qayta qo‘ng‘iroq sahifasi
- O‘zbek/rus til almashtirgichi
- Mobil menyu va sticky buyurtma paneli
- Xizmat paketlari, obuna, ishonch, jarayon va FAQ bloklari

## Fayllar

- `index.html` — sahifa strukturasi va kontent
- `styles.css` — dizayn tizimi va responsive holatlar
- `app.js` — bosh sahifa kalkulyatori, til va mobil menyu
- `data.js` — xizmatlar katalogi va narx birliklari
- `booking.js` — checkout, hisob-kitob va buyurtma saqlash
- `services.html`, `service.html` — katalog va xizmat tafsiloti
- `business.html`, `business-request.html` — B2B oqimi
- `booking.html`, `auth.html`, `contact.html` — sotuv va servis oqimlari
- `public/assets/goclean-hero.png` — Goclean uchun yaratilgan original hero tasviri

## Keyingi bosqich

Prototipni production tizimga aylantirishda backend API, CRM, haqiqiy narx qoidalari, to‘lov integratsiyalari, admin panel va buyurtmalar bazasi ulanadi.
