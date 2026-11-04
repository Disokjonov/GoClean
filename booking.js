const query = new URLSearchParams(location.search);
const serviceSelect = document.querySelector('#serviceSelect');
const areaToggle = document.querySelector('#areaToggle');
const optionalArea = document.querySelector('#optionalArea');
const areaInput = document.querySelector('#serviceArea');
const form = document.querySelector('#checkoutForm');
const successDialog = document.querySelector('#successDialog');

const homePackages = {
  standard: 'Bir martalik tozalash',
  general: 'General tozalash',
  repair: 'Ta’mirdan keyin tozalash'
};

function populateServices() {
  if (query.get('flow') === 'home') {
    Object.entries(homePackages).forEach(([key, name]) => serviceSelect.add(new Option(name, `home-${key}`)));
    const requestedPackage = Object.hasOwn(homePackages, query.get('package')) ? query.get('package') : 'standard';
    serviceSelect.value = `home-${requestedPackage}`;
    return;
  }
  GOCLEAN_SERVICES.forEach(service => serviceSelect.add(new Option(service.name, service.slug)));
  const requested = query.get('service');
  if (requested && GOCLEAN_SERVICES.some(service => service.slug === requested)) {
    serviceSelect.value = requested;
  }
}

function setAreaOpen(open) {
  const russian = window.getGoCleanLanguage?.() === 'ru';
  const toastText = document.querySelector('#toast span');
  if (toastText) toastText.textContent = russian
    ? 'Не удалось отправить заявку. Попробуйте ещё раз или позвоните нам.'
    : 'Arizani yuborib bo‘lmadi. Qayta urinib ko‘ring yoki bizga qo‘ng‘iroq qiling.';
  optionalArea.hidden = !open;
  areaToggle.setAttribute('aria-expanded', String(open));
  areaToggle.classList.toggle('active', open);
  areaToggle.querySelector('span').textContent = open ? '−' : '＋';
  areaToggle.querySelector('b').textContent = russian
    ? (open ? 'Не указывать площадь уборки' : 'Указать площадь уборки')
    : (open ? 'Tozalash maydonini kiritmaslik' : 'Tozalash maydonini kiritish');
  if (!open) areaInput.value = '';
  if (open) setTimeout(() => areaInput.focus(), 0);
}

function validContact() {
  const name = document.querySelector('#customerName');
  const phone = document.querySelector('#customerPhone');
  const digits = phone.value.replace(/\D/g, '');
  const russian = window.getGoCleanLanguage?.() === 'ru';
  name.setCustomValidity(name.value.trim().length >= 2 ? '' : (russian ? 'Введите ваше имя.' : 'Ismingizni kiriting.'));
  phone.setCustomValidity(digits.length >= 9 && digits.length <= 15 ? '' : (russian ? 'Введите корректный номер телефона.' : 'Telefon raqamini to‘g‘ri kiriting.'));
  return form.reportValidity();
}

areaToggle.addEventListener('click', () => setAreaOpen(optionalArea.hidden));
addEventListener('goclean:languagechange', () => setAreaOpen(!optionalArea.hidden));
successDialog.addEventListener('click', event => {
  if (event.target === successDialog) successDialog.close();
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!validContact()) return;
  const selected = GOCLEAN_SERVICES.find(service => service.slug === serviceSelect.value);
  const area = areaInput.value ? `${Math.max(1, Number(areaInput.value))} m²` : '';
  const lead = {
    id: `GC-${Date.now().toString().slice(-6)}`,
    service: selected?.name || serviceSelect.options[serviceSelect.selectedIndex]?.textContent || '',
    area,
    name: document.querySelector('#customerName').value.trim(),
    phone: document.querySelector('#customerPhone').value.trim()
  };
  try {
    await window.GoCleanLeads.send('order', lead, form);
    window.dataLayer?.push({event: 'generate_lead', lead_source: 'short_order_form', service: serviceSelect.value, area_provided: Boolean(area)});
    form.reset();
    setAreaOpen(false);
    successDialog.showModal();
  } catch (error) {
    window.GoCleanLeads.showToast(error.message || window.GoCleanLeads.errorText(), true);
  }
});

populateServices();
window.translateGoCleanPage?.();
setAreaOpen(false);
