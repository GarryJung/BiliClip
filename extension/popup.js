(async () => {
  const api = globalThis.browser || chrome;
  const status = document.getElementById('status');
  const version = api.runtime.getManifest().version;
  document.getElementById('version').textContent = version;
  document.getElementById('guide').onclick = async () => {
    try {
      const [tab] = await api.tabs.query({active:true,currentWindow:true});
      const menus = await api.tabs.sendMessage(tab.id,{type:'biliclip-menus'},{frameId:0});
      const guide = menus?.find(menu => menu.title === '引导教程');
      if (!guide) throw Error('Guide unavailable');
      await api.tabs.sendMessage(tab.id,{type:'biliclip-menu',index:guide.index},{frameId:0});
      window.close();
    } catch (_) { status.textContent = '请先打开并刷新 B 站页面，再点击「引导教程」。'; }
  };
  document.getElementById('check-update').onclick = async () => {
    const button = document.getElementById('check-update');button.disabled = true;
    const link = document.getElementById('update-link');link.hidden = true;
    status.textContent = '正在检查更新…';
    try {
      if (typeof api.runtime.requestUpdateCheck !== 'function') throw Error('Unsupported');
      const result = await api.runtime.requestUpdateCheck();
      if (result?.status === 'update_available') status.textContent = `发现新版本 ${result.version || ''}，浏览器将按扩展更新流程安装。`;
      else if (result?.status === 'no_update') status.textContent = `当前版本 ${version}，本次未发现更新。`;
      else if (result?.status === 'throttled') { status.textContent = '检查过于频繁，请稍后再试；也可查看商店及更新日志。';link.hidden = false; }
      else throw Error('Unsupported result');
    } catch (_) {
      status.textContent = '当前浏览器或安装渠道不支持此处手动检查，请到原安装商店检查；离线版请查看官网更新日志。';link.hidden = false;
    } finally { button.disabled = false; }
  };
  try {
    const [tab] = await api.tabs.query({active:true,currentWindow:true});
    const menus = await api.tabs.sendMessage(tab.id, {type:'biliclip-menus'}, {frameId:0});
    for (const menu of menus || []) {
      if (['喵贴官网','使用教程','引导教程','检查更新','关于作者'].includes(menu.title)) continue;
      const button = document.createElement('button');button.textContent = menu.title;
      button.onclick = async () => {
        try { await api.tabs.sendMessage(tab.id,{type:'biliclip-menu',index:menu.index},{frameId:0});window.close(); }
        catch (_) { status.textContent = '页面已变化，请刷新 B 站后重试。'; }
      };
      document.getElementById('menus').append(button);
    }
    document.getElementById('page-actions').hidden = !document.getElementById('menus').children.length;
  } catch (_) { /* The five main menu items remain available on every tab. */ }
})();
