(function () {
  const canonical = href => {
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.append(link);
    }
    link.href = href;
  };
  const meta = (name, content) => {
    let tag = document.querySelector(`meta[name="${name}"]`);
    if (!tag) {
      tag = document.createElement('meta');
      tag.name = name;
      document.head.append(tag);
    }
    tag.content = content;
  };

  const base = 'https://go-clean.uz';
  const params = new URLSearchParams(location.search);

  if (location.pathname.endsWith('/service.html')) {
    const slug = params.get('slug');
    const service = window.GOCLEAN_SERVICES?.find(item => item.slug === slug);
    if (service) {
      const canonicalPages = {
        'general-cleaning': 'general-cleaning.html',
        'furniture-cleaning': 'furniture-cleaning.html',
        'after-renovation': 'after-renovation-cleaning.html',
        'window-cleaning': 'window-cleaning.html',
        'carpet-cleaning': 'carpet-cleaning.html',
        disinfection: 'disinfection.html'
      };
      canonical(canonicalPages[service.slug]
        ? `${base}/${canonicalPages[service.slug]}`
        : `${base}/service.html?slug=${encodeURIComponent(service.slug)}`);
      meta('description', `${service.name} — ${service.description} ${service.price}, ${service.unit}.`);
    } else {
      canonical(`${base}/services.html`);
      meta('robots', 'noindex,follow');
    }
  }

  if (location.pathname.endsWith('/legal.html')) {
    const privacy = params.get('doc') === 'privacy';
    const doc = privacy ? 'privacy' : 'terms';
    canonical(`${base}/legal.html?doc=${doc}`);
    meta(
      'description',
      privacy
        ? 'GoClean foydalanuvchi ma’lumotlarini qayta ishlash va ulardan foydalanish maqsadlari haqida.'
        : 'GoClean xizmatlari, dastlabki narx, buyurtmani tasdiqlash va bekor qilish shartlari.'
    );
  }
})();
