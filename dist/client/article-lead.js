(()=>{
  const leads=window.GoCleanLeads;
  if(!leads)return;

  document.querySelectorAll('form[data-article-lead]').forEach(form=>{
    const toggle=form.querySelector('[data-article-area-toggle]');
    const field=form.querySelector('[data-article-area-field]');
    const success=form.querySelector('[data-article-success]');
    const setAreaOpen=open=>{
      if(!toggle||!field)return;
      field.hidden=!open;
      toggle.classList.toggle('active',open);
      toggle.setAttribute('aria-expanded',String(open));
      toggle.querySelector('span').textContent=open?'−':'＋';
      toggle.querySelector('b').textContent=open?form.dataset.areaCloseLabel:form.dataset.areaOpenLabel;
      if(!open&&form.elements.area)form.elements.area.value='';
    };
    toggle?.addEventListener('click',()=>setAreaOpen(field.hidden));

    form.addEventListener('submit',async event=>{
      event.preventDefault();
      if(form.dataset.submitting==='true')return;
      form.dataset.submitting='true';
      leads.clearFormError(form);
      if(success)success.hidden=true;
      const data=Object.fromEntries(new FormData(form));
      const payload={service:form.dataset.serviceName,name:data.name,phone:data.phone};
      if(data.area&&Number(data.area)>0)payload.area=`${Number(data.area)} m²`;
      try{
        await leads.send('order',payload,form);
        form.reset();
        setAreaOpen(false);
        if(success)success.hidden=false;
      }catch(error){
        leads.showFormError(form,error);
      }finally{
        form.dataset.submitting='false';
      }
    });
  });
})();
