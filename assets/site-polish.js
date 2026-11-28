(() => {
  'use strict';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const install=document.getElementById('install');
  const header=document.querySelector('.unified-header');
  const measureHeader=()=>document.documentElement.style.setProperty('--site-header-height',(header?.getBoundingClientRect().height||0)+'px');
  measureHeader();
  if(header&&'ResizeObserver' in window)new ResizeObserver(measureHeader).observe(header);
  addEventListener('resize',measureHeader,{passive:true});
  window.biliclipScrollInstall=()=>{
    if(!install)return;
    const target=install.querySelector('.installer')||install;
    const y=target.getBoundingClientRect().top+scrollY-(header?.getBoundingClientRect().height||0)-12;
    window.scrollTo({top:y,behavior:reduced.matches?'instant':'smooth'});
  };
  document.querySelectorAll('a[href="index.html#install"]').forEach(a=>a.addEventListener('click',e=>{
    if(!install||!document.querySelector('.browser-choice-grid'))return;
    e.preventDefault();history.replaceState(null,'','#install');window.biliclipScrollInstall();
  }));
  if(install&&location.hash==='#install')requestAnimationFrame(()=>requestAnimationFrame(()=>window.biliclipScrollInstall()));
  document.querySelectorAll('[data-copy-extensions]').forEach(button=>{
    button.addEventListener('click',async()=>{
      const status=button.parentElement.querySelector('.copy-feedback');
      try{
        await navigator.clipboard.writeText('chrome://extensions');
        status.textContent='已复制';
      }catch{
        status.textContent='请手动复制上方地址';
      }
    });
  });
  // Fan leaves share one bottom pivot and never open flat.
  const fan=document.querySelector('.hero-fan');
  if(fan){
    let queued=false;
    const refresh=()=>{queued=false;const hero=fan.closest('.hero');const r=hero.getBoundingClientRect();const progress=Math.max(0,Math.min(1,-r.top/(r.height*.65)));fan.style.setProperty('--fan-scroll',progress.toFixed(3));};
    addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(refresh);}},{passive:true});refresh();
  }
  // Shared inline viewer for photographs and screenshots on all pages.
  const dialog=document.createElement('dialog');dialog.className='image-viewer';dialog.setAttribute('aria-label','图片放大预览');
  const close=document.createElement('button');close.type='button';close.className='image-viewer-close';close.textContent='关闭';
  const image=document.createElement('img');const caption=document.createElement('p');dialog.append(close,image,caption);document.body.append(dialog);
  let opener=null;
  const dismiss=()=>{dialog.close();document.documentElement.classList.remove('image-viewer-open');opener?.focus({preventScroll:true});};
  close.addEventListener('click',dismiss);dialog.addEventListener('cancel',e=>{e.preventDefault();dismiss();});dialog.addEventListener('click',e=>{if(e.target===dialog)dismiss();});
  document.addEventListener('click',e=>{
    const pic=e.target.closest('img');if(!pic||pic===image)return;
    if(pic.closest('header,footer,button,.social-pill,.author-social,.console-title,.browser-parade'))return;
    const anchor=pic.closest('a');
    e.preventDefault();opener=anchor||pic;image.src=pic.currentSrc||pic.src;image.alt=pic.alt||'图片预览';caption.textContent=pic.alt;dialog.showModal();document.documentElement.classList.add('image-viewer-open');
  });
})();
