(function(){
  const lang=()=>window.getGoCleanLanguage?.()||'uz';
  const message=(uz,ru)=>lang()==='ru'?ru:uz;
  const formError=(field,text)=>{const error=new Error(text);error.field=field;return error};
  const businessForm=document.querySelector('#businessLead');
  if(businessForm){
    const params=new URLSearchParams(location.search);
    const type=params.get('type');
    const service=params.get('service');
    const objectKeys=['','office','retail','mall','production','warehouse','apartment','other'];
    const serviceKeys=['','regular-office','general-office','after-renovation','facade-cleaning','disinfection','other'];
    [...businessForm.elements.object.options].forEach((option,index)=>{option.value=objectKeys[index]||option.value});
    [...businessForm.elements.service.options].forEach((option,index)=>{option.value=serviceKeys[index]||option.value});
    if(![...businessForm.elements.service.options].some(option=>option.value==='warehouse')){
      const option=new Option('Ombor va sex tozalash','warehouse');
      businessForm.elements.service.add(option,3);
    }
    const objectValues=new Set([...businessForm.elements.object.options].map(option=>option.value));
    const serviceValues=new Set([...businessForm.elements.service.options].map(option=>option.value));
    const selectValue=(select,value)=>{select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}))};
    if(objectValues.has(type))selectValue(businessForm.elements.object,type);
    if(serviceValues.has(service))selectValue(businessForm.elements.service,service);
    if(service==='warehouse'&&objectValues.has('warehouse'))selectValue(businessForm.elements.object,'warehouse');
    if(params.get('area'))businessForm.elements.area.value=params.get('area');
    businessForm.onsubmit=async event=>{
      event.preventDefault();const form=event.currentTarget,data=Object.fromEntries(new FormData(form));
      window.GoCleanLeads.clearFormError(form);
      const object=form.elements.object.selectedOptions[0]?.textContent.trim()||data.object;
      const selectedService=form.elements.service.selectedOptions[0]?.textContent.trim()||data.service;
      try{
        if(!data.object)throw formError('object',message('Obyekt turini tanlang.','Выберите тип объекта.'));
        if(!data.area||Number(data.area)<1)throw formError('area',message('Taxminiy maydonni kiriting.','Укажите примерную площадь.'));
        if(!data.service)throw formError('service',message('Kerakli xizmatni tanlang.','Выберите нужную услугу.'));
        await window.GoCleanLeads.send('business',{object,area:`${data.area} m²`,service:selectedService,name:data.name,phone:data.phone},form);form.reset();window.GoCleanLeads.showToast(lang()==='ru'?'Заявка принята. Менеджер скоро свяжется с вами.':'Arizangiz qabul qilindi. Menejer tez orada bog‘lanadi.');setTimeout(()=>location.href='business.html',2200)
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
