(() => {
  'use strict';
  const choice=document.getElementById('browser-choice');if(!choice)return;
  const note=document.getElementById('browser-note'),download=document.getElementById('crx-download'),store=document.getElementById('store-install'),steps=document.getElementById('install-steps'),heading=document.getElementById('install-steps-title'),help=document.getElementById('offline-help'),version=document.getElementById('store-version'),instructions=document.getElementById('browser-instructions'),installer=choice.closest('.installer'),buttons=document.querySelector('.install-buttons');
  const stores={Chrome:'https://chromewebstore.google.com/detail/喵贴-biliclip-b站投稿助手/jmcgccnpgnllbpnebnpkghbmaaaoebfo',Firefox:'https://addons.mozilla.org/zh-CN/firefox/addon/%E5%96%B5%E8%B4%B4biliclip-b%E7%AB%99%E6%8A%95%E7%A8%BF%E5%8A%A9%E6%89%8B/',Edge:'https://microsoftedge.microsoft.com/addons/detail/kiifbllklilololdabaifmhnaaaokjlc','360 浏览器':'https://ext.se.360.cn/#/extension-detail?id=dgigoaikkdcenigcnaeimgnfinocefkd'};
  function update(){
    const name=choice.value,ownStore=!!stores[name],offline=!!name&&!['Firefox','Edge','360 浏览器'].includes(name),channel=ownStore?name:'Chrome';
    installer.classList.toggle('has-selection',!!name);instructions.hidden=!name;note.hidden=!name;buttons.hidden=!name;version.hidden=!name;
    document.querySelectorAll('[data-install-browser]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.installBrowser===name));b.setAttribute('aria-expanded',String(b.dataset.installBrowser===name));});
    if(!name)return;
    download.hidden=!offline;download.href='downloads/BiliClip-8.2.1-offline.crx';download.textContent='下载离线 CRX';
    store.hidden=false;store.href=stores[channel];store.textContent='前往 '+channel+' 商店';
    note.textContent=offline?(name==='Chrome'?'优先从 Chrome 商店安装；无法访问时，可下载离线 CRX。':name+' 可直接从 Chrome 商店安装；无法访问时，使用同一份离线 CRX。'):name+' 使用专用商店版本，本站不提供离线安装。';
    heading.textContent='从 '+channel+' 商店安装';
    const content=['打开上方喵贴商店详情页。','点击「添加」「获取」或「安装」，按提示确认。','固定喵贴图标，刷新 B 站。'];
    steps.replaceChildren(...content.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
    help.hidden=!offline;
  }
  choice.addEventListener('change',update);
  document.querySelectorAll('[data-install-browser]').forEach(b=>b.addEventListener('click',()=>{choice.value=choice.value===b.dataset.installBrowser?'':b.dataset.installBrowser;update();}));
  document.querySelectorAll('[data-browser-pick]').forEach(b=>b.addEventListener('click',()=>{choice.value=b.dataset.browserPick;update();window.biliclipScrollInstall?.();}));
  update();
})();
