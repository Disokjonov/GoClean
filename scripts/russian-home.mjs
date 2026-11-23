const hero = `
  <section class="ru-home-hero">
    <div class="container ru-home-grid">
      <div>
        <h1>Клининг в Ташкенте для дома и бизнеса</h1>
        <p class="ru-home-intro">Генеральная уборка квартир и домов, уборка офисов и после ремонта. Состав работ и цену согласуем заранее.</p>
        <p class="ru-home-guarantee"><span aria-hidden="true">✓</span> Если результат генеральной уборки не устроит, уберём повторно бесплатно.</p>
      </div>
      <section class="ru-home-quote" id="application" aria-labelledby="quote-title">
        <h2 id="quote-title">Узнать стоимость уборки</h2>
        <p>Оставьте имя и телефон. Оператор перезвонит и уточнит детали.</p>
        <form id="homeLeadForm" novalidate>
          <label>Ваше имя<input name="name" autocomplete="name" placeholder="Имя" required></label>
          <label>Номер телефона<span class="phone-input"><b>+998</b><input name="phone" type="tel" inputmode="numeric" autocomplete="tel-national" maxlength="12" placeholder="90 123 45 67" required></span></label>
          <p class="form-inline-error" role="alert" hidden></p>
          <button class="primary-button full" type="submit">Получить расчёт</button>
          <p class="ru-home-privacy"><a href="#privacy">Политика конфиденциальности</a></p>
          <p class="ru-home-success" role="status" hidden></p>
        </form>
      </section>
    </div>
  </section>`;

const drawer = `
  <aside class="mobile-drawer" id="mobileDrawer" aria-hidden="true" aria-label="Меню">
    <div class="drawer-top"><a href="tel:+998977071515">+998 97 707 15 15</a><button class="drawer-close" type="button" aria-label="Закрыть меню">×</button></div>
    <nav class="drawer-links" aria-label="Основная навигация">
      <a href="#home-services">Услуги для дома</a>
      <a href="/ru/office-cleaning.html">Уборка офисов</a>
      <a href="#calculator-section">Подобрать уборку</a>
      <a href="#how">Как это работает</a>
      <a href="#contacts">Контакты</a>
    </nav>
    <a class="drawer-cta" href="#application">Узнать стоимость уборки</a>
  </aside>
  <button class="drawer-backdrop" type="button" aria-label="Закрыть меню"></button>`;

const legal = `
  <section class="container ru-home-legal" aria-label="Правовая информация">
    <details id="privacy">
      <summary>Политика конфиденциальности</summary>
      <p>Имя, телефон и сведения об объекте передаются менеджерам GoClean через защищённый сервер для обработки заявки, согласования деталей услуги и контроля качества.</p>
      <p>На сайте используется Google Analytics для статистики посещений и взаимодействий. Google обрабатывает эти данные согласно своей политике. Вы можете ограничить файлы cookie в настройках браузера.</p>
    </details>
    <details id="terms">
      <summary>Условия использования</summary>
      <p>Заявка на сайте не подтверждает заказ. Состав услуги, адрес, время, оплата и окончательная стоимость согласуются с оператором. Условия отмены и переноса согласуются при подтверждении заказа.</p>
    </details>
  </section>`;

const russianLinks = new Map([
  ["services.html", "/ru/services.html"],
  ["business.html", "/ru/office-cleaning.html"],
  ["blog.html", "/ru/cleaning-preparation-guide.html"],
  ["contact.html", "#contacts"],
  ["privacy.html", "#privacy"],
  ["terms.html", "#terms"],
  ["/ru/#top", "#top"],
  ["/ru/#how", "#how"],
  ["disinfection.html", "#application"]
]);

export function prepareRussianHome(html) {
  const calculator = html.match(/<form class="calculator-card" id="calculator">[\s\S]*?<\/form>/)?.[0];
  if (!calculator) throw new Error("Russian homepage calculator is missing");

  return html
    .replace('<base href="../" />', '<link rel="stylesheet" href="/ru-home.css?v=1" />')
    .replace(/\s*<link rel="alternate" hreflang="[^"]+"[^>]+>/g, "")
    .replace('<body data-page-language="ru" data-language-switch="../">', '<body data-page-language="ru" data-ru-home>')
    .replace(/<a class="lang" id="langToggle"[^>]*>[\s\S]*?<\/a>/, "")
    .replaceAll(/<img class="brand-logo" src="public\/assets\/goclean-logo\.webp"[^>]*\/>/g, '<span class="ru-home-wordmark">Go<span>Clean</span></span>')
    .replace('aria-controls="mainNav"', 'aria-controls="mobileDrawer"')
    .replace('aria-label="Menyuni ochish"', 'aria-label="Открыть меню"')
    .replace('<div class="nav-actions">', '<div class="nav-actions"><a class="ru-home-phone" href="tel:+998977071515">+998 97 707 15 15</a>')
    .replace("</header>", `</header>${drawer}`)
    .replace(/<section class="hero">[\s\S]*?<\/section>/, `${hero}
      <section class="container ru-home-calculator" id="calculator-section" aria-label="Подобрать уборку">
        <div><h2>Выберите параметры уборки</h2><p>Укажите тип объекта, число комнат и вид уборки. Оператор уточнит стоимость с учётом вашей задачи.</p></div>
        ${calculator
          .replace('<span data-i18n="estimate">Примерная стоимость</span>', '<span>Стоимость уборки</span>')
          .replace('<strong id="totalPrice">219 000 сум</strong>', '<strong id="totalPrice">Уточнит оператор</strong>')}
      </section>`)
    .replace(/<strong><small data-i18n="from">от<\/small> (?:500|100) 000 сум<\/strong>/g, '<strong>По расчёту</strong>')
    .replace('<strong>MAXSUS</strong>', '<strong>СКИДКА</strong>')
    .replace('<footer>', `${legal}<footer id="contacts">`)
    .replace(/<div class="floating-contact-actions"[^>]*>[\s\S]*?<\/div>/, "")
    .replaceAll(/href="([^"]+)"/g, (attribute, href) => {
      const russianHref = russianLinks.get(href);
      if (russianHref) return `href="${russianHref}"`;
      if (/^(?:ru\/|styles\.css|favicon\.svg)/.test(href)) return `href="/${href}"`;
      if (/^(?:furniture|window|carpet|after-renovation|general|facade|marble)-cleaning\.html$/.test(href)) return `href="/ru/${href}"`;
      return attribute;
    })
    .replaceAll(/(src|srcset)="((?:public\/|shared\.js|app\.js|seo-runtime\.js)[^"]*)"/g, '$1="/$2"')
    .replace(/src="\/app\.js(?:\?[^"]*)?"/, 'src="/app.js?v=ru-home-1"')
    .replaceAll(/[ \t]+$/gm, "");
}
