'use strict';
const api = globalThis.browser || chrome;
const allowedPaths = new Set(['/x/web-interface/view', '/x/polymer/web-space/seasons_series_list', '/x/series/archives', '/x/polymer/web-space/seasons_archives_list']);
api.runtime.onMessage.addListener((message, sender, reply) => {
  if (message?.type !== 'biliclip-api' || sender.id !== api.runtime.id) return;
  let url;
  try {
    const source = new URL(sender.url);
    if (!/(^|\.)bilibili\.com$/.test(source.hostname)) throw Error('Invalid sender');
    url = new URL(message.url);
    if (url.origin !== 'https://api.bilibili.com' || !allowedPaths.has(url.pathname)) throw Error('Invalid API');
  } catch (_) { reply({error:'Request denied'}); return; }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.min(Number(message.timeout) || 15000, 15000));
  fetch(url.href, {credentials:'include', redirect:'error', signal:controller.signal})
    .then(async response => reply({status:response.status, responseText:await response.text()}))
    .catch(error => reply({error:String(error), timeout:error.name === 'AbortError'}))
    .finally(() => clearTimeout(timer));
  return true;
});
