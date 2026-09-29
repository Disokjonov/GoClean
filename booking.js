const storedOrders=(()=>{try{return JSON.parse(localStorage.getItem('gocleanOrders')||'[]')}catch{return[]}})();
const booking={step:1,frequency:'once',time:'',firstOrderDiscount:storedOrders.length===0};
const qs=new URLSearchParams(location.search),preselect=qs.get('service');
const serviceSelect=document.querySelector('#serviceSelect');
GOCLEAN_SERVICES.forEach(s=>serviceSelect.add(new Option(`${s.name} — ${s.price}`,s.slug)));
if(preselect&&GOCLEAN_SERVICES.some(s=>s.slug===preselect))serviceSelect.value=preselect;
function initServicePicker(){
  serviceSelect.hidden=true;serviceSelect.tabIndex=-1;serviceSelect.setAttribute('aria-hidden','true');serviceSelect.classList.add('native-service-select');
  const trigger=document.createElement('button');
  trigger.type='button';trigger.id='servicePickerButton';trigger.className='service-picker-trigger';trigger.setAttribute('aria-haspopup','dialog');
  serviceSelect.insertAdjacentElement('afterend',trigger);
  const dialog=document.createElement('dialog');dialog.id='servicePickerDialog';dialog.className='service-picker-dialog';
  dialog.innerHTML=`<div class="service-picker-head"><div><span class="kicker">GoClean xizmatlari</span><h2>Xizmatni tanlang</h2><p>Narx xizmat hajmi va holatiga qarab aniqlanadi.</p></div><button class="service-picker-close" type="button" aria-label="Yopish">×</button></div><label class="service-picker-search"><span>⌕</span><input type="search" placeholder="Xizmatni qidiring" autocomplete="off"></label><div class="service-picker-list"></div>`;
  document.body.append(dialog);
  const list=dialog.querySelector('.service-picker-list'),search=dialog.querySelector('input');
  const updateTrigger=()=>{const service=findService(serviceSelect.value);trigger.innerHTML=`<span class="service-picker-icon">${service.icon}</span><span class="service-picker-current"><b>${service.name}</b><small>${service.price} · ${service.unit}</small></span><span class="service-picker-chevron">⌄</span>`;window.translateGoCleanPage?.()};
  const renderOptions=()=>{list.innerHTML=GOCLEAN_SERVICES.map(service=>`<button type="button" class="service-picker-option${service.slug===serviceSelect.value?' selected':''}" data-service-slug="${service.slug}"><span class="service-picker-icon">${service.icon}</span><span><b>${service.name}</b><small>${service.price} · ${service.unit}</small></span><i aria-hidden="true">✓</i></button>`).join('');window.translateGoCleanPage?.()};
  const filterOptions=()=>{const query=search.value.trim().toLocaleLowerCase();list.querySelectorAll('.service-picker-option').forEach(option=>option.hidden=query&&!option.textContent.toLocaleLowerCase().includes(query))};
  trigger.addEventListener('click',()=>{renderOptions();search.value='';dialog.showModal();requestAnimationFrame(()=>search.focus())});
  dialog.querySelector('.service-picker-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
  list.addEventListener('click',event=>{const option=event.target.closest('[data-service-slug]');if(!option)return;serviceSelect.value=option.dataset.serviceSlug;serviceSelect.dispatchEvent(new Event('input',{bubbles:true}));updateTrigger();dialog.close();trigger.focus()});
  search.addEventListener('input',filterOptions);
  addEventListener('goclean:languagechange',()=>setTimeout(()=>{updateTrigger();renderOptions()},0));
  updateTrigger();renderOptions();
}
initServicePicker();
if(qs.get('object'))document.querySelector('#objectType').value=qs.get('object');
if(qs.get('baths'))document.querySelector('#bathrooms').value=qs.get('baths');
const objectNames={apartment:'Kvartira',cottage:'Kottej',office:'Ofis',store:'Do‘kon',mall:'Savdo markazi',production:'Ishlab chiqarish',warehouse:'Ombor',building:'Ko‘p qavatli uy',other:'Boshqa'};
const basePrice={general:500000,dry:100000,windows:14000,special:15000,facade:18000,repair:16000,emergency:22000,odor:12000,mold:25000,disinfection:10000};
const serviceRates={'marble-cleaning':15000,'carpet-cleaning':15000,'paving-cleaning':15000,'window-cleaning':14000,'curtain-cleaning':25000,'blanket-cleaning':100000};
const money=n=>new Intl.NumberFormat('uz-UZ').format(Math.round(n/1000)*1000)+' so‘m';
function calc(){const service=findService(serviceSelect.value),area=Math.max(1,+document.querySelector('#area').value||1);let total=serviceRates[service.slug]?serviceRates[service.slug]*area:basePrice[service.bookingType]||20000;if(!serviceRates[service.slug]&&['windows','special','facade','repair','emergency','odor','mold','disinfection'].includes(service.bookingType))total*=area;else if(service.bookingType==='general')total+=Math.max(0,area-50)*6000;document.querySelectorAll('[data-extra]:checked').forEach(x=>total+=+x.dataset.extra);if(booking.firstOrderDiscount)total*=.85;document.querySelector('#summaryService').textContent=service.name;document.querySelector('#summaryObject').textContent=objectNames[document.querySelector('#objectType').value];document.querySelector('#summaryArea').textContent=area+' m²';document.querySelector('#summaryDuration').textContent='~'+Math.max(2,Math.ceil(area/20))+' soat';document.querySelector('#summaryWorkers').textContent=(area>100?3:area>55?2:1)+' kishi';document.querySelector('#summaryTotal').textContent=money(total);const extras=[...document.querySelectorAll('[data-extra]:checked')].map(x=>`<span>+ ${x.parentElement.querySelector('b').textContent}</span>`);if(booking.firstOrderDiscount)extras.push('<span class="summary-discount">− 15% birinchi buyurtma chegirmasi</span>');document.querySelector('#summaryExtras').innerHTML=extras.join('');return total}
function showStep(n){booking.step=n;document.querySelectorAll('.checkout-step').forEach(x=>x.classList.toggle('active',+x.dataset.step===n));document.querySelectorAll('[data-pill]').forEach(x=>x.classList.toggle('active',+x.dataset.pill<=n));scrollTo({top:0,behavior:'smooth'})}
document.querySelectorAll('.next-step').forEach(b=>b.onclick=()=>{if(+b.dataset.next===3){const req=['customerName','customerPhone','address'];if(req.some(id=>!document.querySelector('#'+id).value.trim())){alert('Kontakt va manzil maydonlarini to‘ldiring');return}}if(+b.dataset.next===4&&(!document.querySelector('#date').value||!booking.time)){alert('Sana va vaqtni tanlang');return}showStep(+b.dataset.next)});
document.querySelectorAll('.back-step').forEach(b=>b.onclick=()=>showStep(+b.dataset.back));
document.querySelectorAll('[data-time]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-time]').forEach(x=>x.classList.remove('active'));b.classList.add('active');booking.time=b.dataset.time});
['objectType','serviceSelect','area','bathrooms'].forEach(id=>document.querySelector('#'+id).addEventListener('input',calc));document.querySelectorAll('[data-extra]').forEach(x=>x.onchange=calc);
document.querySelector('#checkoutForm').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,order={id:'GC-'+Date.now().toString().slice(-6),service:serviceSelect.options[serviceSelect.selectedIndex]?.text||serviceSelect.value,object:objectNames[document.querySelector('#objectType').value],area:document.querySelector('#area').value+' m²',bathrooms:document.querySelector('#bathrooms').value,frequency:booking.frequency,extras:[...document.querySelectorAll('[data-extra]:checked')].map(x=>x.parentElement.querySelector('b').textContent),name:document.querySelector('#customerName').value,phone:document.querySelector('#customerPhone').value,address:document.querySelector('#address').value,comment:document.querySelector('#comment').value,date:document.querySelector('#date').value,time:booking.time,total:calc(),payment:new FormData(form).get('payment')};try{await window.GoCleanLeads.send('order',{...order,total:money(order.total)},form);const orders=JSON.parse(localStorage.getItem('gocleanOrders')||'[]');orders.push(order);localStorage.setItem('gocleanOrders',JSON.stringify(orders));document.querySelector('#orderNumber').textContent=`Buyurtma raqami: ${order.id}`;document.querySelector('#successDialog').showModal()}catch(error){alert(error.message||window.GoCleanLeads.errorText())}};
if(!booking.firstOrderDiscount)document.querySelectorAll('.checkout-discount').forEach(element=>element.hidden=true);
document.querySelector('#date').min=new Date().toISOString().split('T')[0];calc();
