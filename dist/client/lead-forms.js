(function(){
  const lang=()=>window.getGoCleanLanguage?.()||'uz';
  const failure=error=>error?.message||window.GoCleanLeads.errorText();
  const businessForm=document.querySelector('#businessLead');
  if(businessForm){
    const params=new URLSearchParams(location.search);
    if(params.get('type'))businessForm.elements.object.value=params.get('type')==='office'?'Ofis':params.get('type');
    if(params.get('area'))businessForm.elements.area.value=params.get('area');
    businessForm.onsubmit=async event=>{
      event.preventDefault();const form=event.currentTarget,data=Object.fromEntries(new FormData(form));
      try{await window.GoCleanLeads.send('business',{object:data.object,area:`${data.area} m²`,service:data.service,name:data.name,phone:data.phone},form);form.reset();window.GoCleanLeads.showToast(lang()==='ru'?'Заявка принята. Менеджер скоро свяжется с вами.':'Arizangiz qabul qilindi. Menejer tez orada bog‘lanadi.');setTimeout(()=>location.href='business.html',2200)}catch(error){window.GoCleanLeads.showToast(failure(error),true)}
    };
  }

  const callbackForm=document.querySelector('#callbackForm');
  if(callbackForm){
    callbackForm.onsubmit=async event=>{
      event.preventDefault();const form=event.currentTarget,data=Object.fromEntries(new FormData(form));
      try{await window.GoCleanLeads.send('contact',{name:data.name,phone:data.phone,message:data.message},form);form.reset();window.GoCleanLeads.showToast(lang()==='ru'?'Обращение принято. Мы скоро свяжемся с вами.':'Murojaatingiz qabul qilindi. Tez orada bog‘lanamiz.')}catch(error){window.GoCleanLeads.showToast(failure(error),true)}
    };
  }
})();
