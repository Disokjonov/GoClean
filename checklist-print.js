document.addEventListener("DOMContentLoaded",()=>{
  const button=document.querySelector("[data-print-checklist]");
  if(button)button.addEventListener("click",()=>window.print());
});
