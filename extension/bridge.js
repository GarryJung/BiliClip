// Local WebExtension adapter. Runs only in the isolated content-script world.
(async () => {
  'use strict';
  const api = globalThis.browser || chrome;
  const cache = await api.storage.local.get(null);
  const listeners = new Map(), menus = [];
  const GM_getValue = (key, fallback) => Object.hasOwn(cache, key) ? cache[key] : fallback;
  const GM_setValue = (key, value) => {
    cache[key] = value;
    api.storage.local.set({[key]: value}).catch(console.error);
  };
  const GM_addValueChangeListener = (key, fn) => {
    if (!listeners.has(key)) listeners.set(key, []);
    listeners.get(key).push(fn);
  };
  api.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    for (const [key, change] of Object.entries(changes)) {
      if ('newValue' in change) cache[key] = change.newValue; else delete cache[key];
      for (const fn of listeners.get(key) || []) fn(key, change.oldValue, change.newValue, true);
    }
  });
  const GM_setClipboard = async text => {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (_) {
      const input = document.createElement('textarea'); input.value = text;
      input.style.cssText = 'position:fixed;left:-9999px';
      (document.body || document.documentElement).append(input); input.select();
      const ok = document.execCommand('copy'); input.remove(); return ok;
    }
  };
  const GM_xmlhttpRequest = options => {
    api.runtime.sendMessage({type:'biliclip-api', url:options.url, timeout:options.timeout}).then(response => {
      if (response?.error) (response.timeout ? options.ontimeout : options.onerror)?.(response);
      else options.onload?.(response);
    }).catch(error => options.onerror?.(error));
  };
  const GM_registerMenuCommand = (title, run) => menus.push({title, run});
  api.runtime.onMessage.addListener((message, sender, reply) => {
    if (sender.id !== api.runtime.id) return;
    if (message.type === 'biliclip-menus') reply(menus.map((m, index) => ({title:m.title, index})));
    if (message.type === 'biliclip-menu' && Number.isInteger(message.index)) menus[message.index]?.run();
  });
  // Build inserts the unmodified userscript below, sharing these local adapters.
  /* USER_SCRIPT */
})();
