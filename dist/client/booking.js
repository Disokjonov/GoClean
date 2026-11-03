const booking={step:1,frequency:'once',time:''};
const qs=new URLSearchParams(location.search),preselect=qs.get('service'),homeFlow=qs.get('flow')==='home';
const serviceSelect=document.querySelector('#serviceSelect');
const objectSelect=document.querySelector('#objectType');
const parameterHost=document.querySelector('#serviceParameters');
const extrasSection=document.querySelector('#extrasSection');

const objectNames={apartment:'Kvartira',cottage:'Kottej',office:'Ofis',store:'Do‘kon',mall:'Savdo markazi',production:'Ishlab chiqarish',warehouse:'Ombor',building:'Ko‘p qavatli uy',other:'Boshqa'};
const homePrices={apartment:{base:99000,room:60000,bath:30000},cottage:{base:149000,room:72000,bath:35000},office:{base:199000,room:45000,bath:40000}};
const homePackages={
  'home-standard':{name:'Bir martalik tozalash',price:'2 soatdan',kind:'rooms',object:true,extras:true,label:'Xonalar soni',unit:'xona',value:2,min:1,multiplier:1,hours:2},
  'home-general':{name:'General tozalash',price:'4 soatdan',kind:'rooms',object:true,extras:true,label:'Xonalar soni',unit:'xona',value:2,min:1,multiplier:1.8,hours:4},
  'home-repair':{name:'Ta’mirdan keyin tozalash',price:'6 soatdan',kind:'rooms',object:true,extras:false,label:'Xonalar soni',unit:'xona',value:2,min:1,multiplier:2.65,hours:6}
};
const profiles={
  'general-cleaning':{kind:'home',object:true,extras:true,label:'Maydon (m²)',unit:'m²',value:50,min:10,rate:6000,base:500000},
  'furniture-cleaning':{kind:'quantity',label:'O‘rindiqlar soni',unit:'o‘rindiq',value:1,min:1,rate:100000,hint:'Divan o‘rindiqlari, kreslo va yumshoq stullarni jami kiriting.'},
  'marble-cleaning':{kind:'area',label:'Marmar maydoni (m²)',unit:'m²',value:10,min:1,rate:15000,hint:'Dastlabki hisob 15 000 so‘mlik minimal tarif bo‘yicha.'},
  'carpet-cleaning':{kind:'area',label:'Gilam maydoni (m²)',unit:'m²',value:10,min:1,rate:15000,hint:'Gilamning eni va bo‘yini ko‘paytirib taxminiy maydonni kiriting.'},
  'paving-cleaning':{kind:'area',label:'Bruschatka maydoni (m²)',unit:'m²',value:20,min:1,rate:15000,hint:'Yuviladigan umumiy maydonni kiriting.'},
  'window-cleaning':{kind:'area',label:'Oynalar maydoni (m²)',unit:'m²',value:10,min:1,rate:14000,hint:'Barcha oynalarning taxminiy umumiy maydonini kiriting.'},
  'curtain-cleaning':{kind:'length',label:'Parda eni (metr)',unit:'metr',value:4,min:1,rate:25000,hint:'Barcha pardalarning umumiy enini kiriting.'},
  'facade-cleaning':{kind:'area',label:'Fasad maydoni (m²)',unit:'m²',value:30,min:1,rate:18000,hint:'Balandlik va kirlanish darajasi yakuniy narxga ta’sir qiladi.'},
  'blanket-cleaning':{kind:'quantity',label:'Pled soni',unit:'dona',value:1,min:1,rate:100000,hint:'Yuviladigan pledlar sonini kiriting.'},
  'after-renovation':{kind:'consultation',object:true,label:'Taxminiy maydon (m²)',unit:'m²',value:50,min:1},
  'emergency-cleaning':{kind:'consultation',object:true,label:'Taxminiy maydon (m²)',unit:'m²',value:50,min:1},
  'odor-removal':{kind:'consultation',object:true,label:'Ta’sirlangan maydon (m²)',unit:'m²',value:20,min:1},
  'mold-removal':{kind:'consultation',object:true,label:'Ta’sirlangan maydon (m²)',unit:'m²',value:10,min:1},
  'disinfection':{kind:'consultation',object:true,label:'Taxminiy maydon (m²)',unit:'m²',value:50,min:1}
};

if(homeFlow){
  [...objectSelect.options].forEach(option=>{if(!['apartment','cottage'].includes(option.value))option.remove()});
  Object.entries(homePackages).forEach(([value,service])=>serviceSelect.add(new Option(`${service.name} — ${service.price}`,value)));
  const requestedPackage=['standard','general','repair'].includes(qs.get('package'))?qs.get('package'):'standard';
  serviceSelect.value=`home-${requestedPackage}`;
}else{
  GOCLEAN_SERVICES.forEach(service=>serviceSelect.add(new Option(`${service.name} — ${service.price}`,service.slug)));
  if(preselect&&GOCLEAN_SERVICES.some(service=>service.slug===preselect))serviceSelect.value=preselect;
}
if(qs.get('object'))objectSelect.value=qs.get('object');

const money=value=>new Intl.NumberFormat('uz-UZ').format(Math.round(value/1000)*1000)+' so‘m';
const currentService=()=>homePackages[serviceSelect.value]||findService(serviceSelect.value);
const currentProfile=()=>homePackages[serviceSelect.value]||profiles[serviceSelect.value]||profiles['general-cleaning'];
const translate=()=>window.translateGoCleanPage?.();

function renderServiceParameters(){
  const profile=currentProfile();
  document.querySelector('#objectTypeField').hidden=!profile.object;
  extrasSection.hidden=!profile.extras;
  if(!profile.extras)document.querySelectorAll('[data-extra]').forEach(input=>input.checked=false);
  const initialValue=profile.kind==='home'?(+qs.get('area')||profile.value):profile.kind==='rooms'?(+qs.get('rooms')||profile.value):profile.value;
  if(profile.kind==='home'||profile.kind==='rooms'){
    parameterHost.innerHTML=`<div class="form-row service-parameter-grid"><label>${profile.label}<input id="serviceQuantity" type="number" min="${profile.min}" value="${initialValue}"></label><label>Sanuzel soni<input id="bathrooms" type="number" min="0" value="${+qs.get('baths')||1}"></label></div>`;
  }else{
    const note=profile.kind==='consultation'?'Bu xizmat uchun saytda sun’iy narx chiqarmaymiz. Mutaxassis holatni baholab, aniq narxni aytadi.':profile.hint;
    parameterHost.innerHTML=`<div class="service-parameter-block"><label>${profile.label}<input id="serviceQuantity" type="number" min="${profile.min}" value="${initialValue}"></label><p>${note}</p></div>`;
  }
  parameterHost.querySelectorAll('input').forEach(input=>input.addEventListener('input',calc));
  translate();
  calc();
}

function parameterData(){
  const profile=currentProfile();
  const quantity=Math.max(profile.min||1,+document.querySelector('#serviceQuantity')?.value||profile.value||1);
  const bathrooms=profile.kind==='home'||profile.kind==='rooms'?Math.max(0,+document.querySelector('#bathrooms')?.value||0):null;
  let unit=profile.unit;
  if(window.getGoCleanLanguage?.()==='ru'){
    if(unit==='o‘rindiq')unit=quantity===1?'посадочное место':quantity>1&&quantity<5?'посадочных места':'посадочных мест';
    else if(unit==='metr')unit=quantity===1?'метр':quantity>1&&quantity<5?'метра':'метров';
    else if(unit==='dona')unit='шт.';
    else if(unit==='xona')unit=quantity===1?'комната':quantity>1&&quantity<5?'комнаты':'комнат';
  }
  return{profile,quantity,bathrooms,summary:`${quantity} ${unit}`};
}

function setSummaryRow(id,visible,label,value){
  const row=document.querySelector(`#${id}Row`);row.hidden=!visible;
  if(!visible)return;
  const labelNode=document.querySelector(`#${id}Label`),valueNode=document.querySelector(`#${id}`);
  if(labelNode)labelNode.textContent=label;
  if(valueNode)valueNode.textContent=value;
}

function calc(){
  const service=currentService(),{profile,quantity,bathrooms,summary}=parameterData();
  let total=null;
  if(profile.kind==='home')total=profile.base+Math.max(0,quantity-50)*profile.rate+Math.max(0,bathrooms-1)*50000;
  else if(profile.kind==='rooms'){
    const price=homePrices[objectSelect.value]||homePrices.apartment;
    total=(price.base+quantity*price.room+bathrooms*price.bath)*profile.multiplier;
  }
  else if(profile.kind!=='consultation')total=profile.rate*quantity;
  document.querySelectorAll('[data-extra]:checked').forEach(input=>{if(total!==null)total+=+input.dataset.extra});
  document.querySelector('#summaryService').textContent=service.name;
  setSummaryRow('summaryObject',!!profile.object,'Obyekt',objectNames[objectSelect.value]);
  setSummaryRow('summaryPrimary',true,profile.label,summary);
  setSummaryRow('summarySecondary',profile.kind==='home'||profile.kind==='rooms','Sanuzel',String(bathrooms));
  const durationRow=document.querySelector('#summaryDurationRow'),workersRow=document.querySelector('#summaryWorkersRow');
  const homeKind=profile.kind==='home'||profile.kind==='rooms';
  durationRow.hidden=!homeKind;workersRow.hidden=!homeKind;
  if(homeKind){
    const duration=profile.kind==='rooms'?Math.max(profile.hours,Math.ceil((quantity+bathrooms)/2)*profile.multiplier):Math.max(2,Math.ceil(quantity/20)+Math.max(0,bathrooms-1));
    document.querySelector('#summaryDuration').textContent='~'+Math.ceil(duration)+' soat';
    document.querySelector('#summaryWorkers').textContent=(profile.kind==='rooms'?(quantity+bathrooms>5?2:1):(quantity>100?3:quantity>55?2:1))+' kishi';
  }
  document.querySelector('#summaryTotalLabel').textContent=total===null?'Aniq narx':'Taxminiy jami';
  document.querySelector('#summaryTotal').textContent=total===null?'Konsultatsiyadan so‘ng':money(total);
  document.querySelector('#summaryNote').textContent=total===null?'Aniq narx mutaxassis baholashidan keyin tasdiqlanadi.':'Bu dastlabki hisob. Yakuniy narx material, holat va vazifa tasdiqlangandan keyin aniqlashtiriladi.';
  const extras=[...document.querySelectorAll('[data-extra]:checked')].map(input=>`<span>+ ${input.parentElement.querySelector('b').textContent}</span>`);
  document.querySelector('#summaryExtras').innerHTML=extras.join('');
  translate();
  return total;
}

function showStep(step){
  booking.step=step;
  document.querySelectorAll('.checkout-step').forEach(section=>section.classList.toggle('active',+section.dataset.step===step));
  document.querySelectorAll('[data-pill]').forEach(pill=>pill.classList.toggle('active',+pill.dataset.pill<=step));
  scrollTo({top:0,behavior:'smooth'});
}

document.querySelectorAll('.next-step').forEach(button=>button.onclick=()=>{
  if(+button.dataset.next===3){
    const required=['customerName','customerPhone','address'];
    if(required.some(id=>!document.querySelector('#'+id).value.trim())){alert('Kontakt va manzil maydonlarini to‘ldiring');return}
  }
  if(+button.dataset.next===4&&(!document.querySelector('#date').value||!booking.time)){alert('Sana va vaqtni tanlang');return}
  showStep(+button.dataset.next);
});
document.querySelectorAll('.back-step').forEach(button=>button.onclick=()=>showStep(+button.dataset.back));
document.querySelectorAll('[data-time]').forEach(button=>button.onclick=()=>{document.querySelectorAll('[data-time]').forEach(item=>item.classList.remove('active'));button.classList.add('active');booking.time=button.dataset.time});
objectSelect.addEventListener('input',calc);
serviceSelect.addEventListener('input',renderServiceParameters);
document.querySelectorAll('[data-extra]').forEach(input=>input.addEventListener('change',calc));
addEventListener('goclean:languagechange',()=>setTimeout(calc,0));

document.querySelector('#checkoutForm').onsubmit=async event=>{
  event.preventDefault();
  const form=event.currentTarget,{profile,bathrooms,summary}=parameterData(),calculatedTotal=calc();
  const order={
    id:'GC-'+Date.now().toString().slice(-6),
    service:currentService().name,
    object:profile.object?objectNames[objectSelect.value]:'—',
    area:summary,
    parameter:summary,
    bathrooms:bathrooms===null?'—':String(bathrooms),
    frequency:booking.frequency,
    extras:[...document.querySelectorAll('[data-extra]:checked')].map(input=>input.parentElement.querySelector('b').textContent),
    name:document.querySelector('#customerName').value,
    phone:document.querySelector('#customerPhone').value,
    address:document.querySelector('#address').value,
    comment:document.querySelector('#comment').value,
    date:document.querySelector('#date').value,
    time:booking.time,
    total:calculatedTotal,
    payment:new FormData(form).get('payment')
  };
  try{
    const totalText=order.total===null?'Konsultatsiyadan so‘ng':money(order.total);
    await window.GoCleanLeads.send('order',{...order,total:totalText},form);
    const orders=JSON.parse(localStorage.getItem('gocleanOrders')||'[]');orders.push(order);localStorage.setItem('gocleanOrders',JSON.stringify(orders));
    document.querySelector('#orderNumber').textContent=`Buyurtma raqami: ${order.id}`;
    document.querySelector('#successDialog').showModal();
  }catch(error){alert(error.message||window.GoCleanLeads.errorText())}
};

document.querySelector('#date').min=new Date().toISOString().split('T')[0];
objectSelect.dispatchEvent(new Event('change',{bubbles:true}));
renderServiceParameters();
