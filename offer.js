(function(){
  const form=document.querySelector('#metaLeadForm');
  const success=document.querySelector('#metaLeadSuccess');
  const params=new URLSearchParams(location.search);
  const requestedService=params.get('service');
  if(requestedService){
    const option=[...form.elements.service.options].find(item=>item.value===requestedService);
    if(option){form.elements.service.value=option.value;form.elements.service.dispatchEvent(new Event('change',{bubbles:true}))}
  }

  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const data=Object.fromEntries(new FormData(form));
    try{
      await window.GoCleanLeads.send('meta',{name:data.name,phone:data.phone,service:data.service},form);
      if(typeof window.fbq==='function')window.fbq('track','Lead',{content_name:'GoClean special offer',content_category:data.service});
      window.dataLayer?.push({event:'generate_lead',lead_source:'meta_ads',service:data.service});
      localStorage.setItem('gocleanMetaLeadSubmitted','true');
      form.hidden=true;success.hidden=false;
      success.scrollIntoView({behavior:'smooth',block:'center'});
    }catch(error){
      window.GoCleanLeads.showToast(error.message||window.GoCleanLeads.errorText(),true);
    }
  });
})();
