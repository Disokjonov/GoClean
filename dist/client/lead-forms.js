(function(){
  const lang=()=>window.getGoCleanLanguage?.()||'uz';
  const message=(uz,ru)=>lang()==='ru'?ru:uz;
  const formError=(field,text)=>{const error=new Error(text);error.field=field;return error};
  const businessForm=document.querySelector('#businessLead');
  if(businessForm){
    const params=new URLSearchParams(location.search);
    const type=params.get('type');
    const service=params.get('service');
    const objectLabels={office:['Ofis','Офис'],retail:['Do‘kon','Магазин'],mall:['Savdo markazi','Торговый центр'],production:['Ishlab chiqarish','Производство'],warehouse:['Ombor','Склад'],apartment:['Ko‘p qavatli uy','Многоквартирный дом'],other:['Boshqa','Другое']};
    const serviceLabels={'regular-office':['Muntazam ofis tozalash','Регулярная уборка офиса'],'general-office':['Ofisni general tozalash','Генеральная уборка офиса'],warehouse:['Ombor va sex tozalash','Уборка склада и цеха'],'after-renovation':['Ta’mirdan keyin tozalash','Уборка после ремонта'],'facade-cleaning':['Fasad va oyna yuvish','Мойка фасада и окон'],disinfection:['Dezinfeksiya','Дезинфекция'],other:['Biznes tozalash','Уборка для бизнеса']};
    const localized=(entry)=>entry?.[lang()==='ru'?1:0]||'';
    const objectEntry=objectLabels[type];
    const serviceEntry=serviceLabels[service];
    businessForm.elements.object.value=localized(objectEntry);
    businessForm.elements.service.value=localized(serviceEntry);
    const context=businessForm.querySelector('[data-business-context]');
    const syncContext=()=>{const values=[localized(objectEntry),localized(serviceEntry)].filter(Boolean);context.hidden=!values.length;context.textContent=values.length?(lang()==='ru'?`Вы выбрали: ${values.join(' · ')}`:`Tanlangan: ${values.join(' · ')}`):'';businessForm.elements.object.value=localized(objectEntry);businessForm.elements.service.value=localized(serviceEntry)};
    syncContext();addEventListener('goclean:languagechange',syncContext);
    const areaToggle=businessForm.querySelector('[data-area-toggle]'),areaField=businessForm.querySelector('[data-area-field]');
    const setAreaOpen=open=>{areaField.hidden=!open;areaToggle.classList.toggle('active',open);areaToggle.setAttribute('aria-expanded',String(open));areaToggle.querySelector('span').textContent=open?'−':'＋';areaToggle.querySelector('b').textContent=open?message('Tozalash maydonini kiritmaslik','Не указывать площадь уборки'):message('Tozalash maydonini kiritish','Указать площадь уборки');if(!open)businessForm.elements.area.value=''};
    areaToggle.addEventListener('click',()=>setAreaOpen(areaField.hidden));
    if(params.get('area')&&Number(params.get('area'))>0){setAreaOpen(true);businessForm.elements.area.value=params.get('area')}
    businessForm.onsubmit=async event=>{
      event.preventDefault();const form=event.currentTarget,data=Object.fromEntries(new FormData(form));
      window.GoCleanLeads.clearFormError(form);
      try{
        const payload={name:data.name,phone:data.phone};
        if(data.object)payload.object=data.object;
        if(data.service)payload.service=data.service;
        if(data.area&&Number(data.area)>0)payload.area=`${Number(data.area)} m²`;
        await window.GoCleanLeads.send('business',payload,form);form.reset();setAreaOpen(false);syncContext();window.GoCleanLeads.showToast(lang()==='ru'?'Заявка принята. Менеджер скоро свяжется с вами.':'Arizangiz qabul qilindi. Menejer tez orada bog‘lanadi.');setTimeout(()=>location.href='business.html',2200)
      }catch(error){window.GoCleanLeads.showFormError(form,error)}
    };
  }

  const callbackForm=document.querySelector('#callbackForm');
  if(callbackForm){
    callbackForm.onsubmit=async event=>{
      event.preventDefault();const form=event.currentTarget,data=Object.fromEntries(new FormData(form));
      window.GoCleanLeads.clearFormError(form);
      try{await window.GoCleanLeads.send('contact',{name:data.name,phone:data.phone,message:data.message},form);form.reset();window.GoCleanLeads.showToast(lang()==='ru'?'Обращение принято. Мы скоро свяжемся с вами.':'Murojaatingiz qabul qilindi. Tez orada bog‘lanamiz.')}catch(error){window.GoCleanLeads.showFormError(form,error)}
    };
  }
})();
