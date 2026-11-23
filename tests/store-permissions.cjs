const fs = require('node:fs');
const assert = require('node:assert/strict');
const vm = require('node:vm');
for (const channel of ['chrome', 'edge', 'firefox', '360']) {
  const m = JSON.parse(fs.readFileSync(`release/8.2.1/${channel}/manifest.json`));
  assert.deepEqual(m.content_scripts.flatMap(s => s.matches), ['https://*.bilibili.com/*']);
  assert.deepEqual(m.host_permissions, ['https://api.bilibili.com/*']);
  assert.deepEqual(m.permissions, ['storage', 'clipboardWrite']);
  assert.equal(m.content_scripts[0].all_frames, true, 'B站投稿编辑器 iframe 必须继续工作');
}
const source = fs.readFileSync('biliclip.user.js', 'utf8');
assert.deepEqual([...source.matchAll(/^\/\/ @match\s+(.*)$/gm)].map(m => m[1]), ['https://*.bilibili.com/*']);
// Exercise the actual paste handler: unrelated clipboard text must leave fields alone.
const handler = source.slice(source.indexOf('  async function onPaste(event)'), source.indexOf('  function creatorEditorFrames()'));
(async () => {
  let fills = 0, blocked = 0;
  const field = {};
  const ctx = {isBili:true, isMember:true, location:{pathname:'/platform/upload/video/frame'}, window:{}, KEY:'pair',
    validPair:v=>v, GM_getValue:()=>({bv:'BV123',title:'标题'}), pairClipboardText:v=>`${v.bv}\n${v.title}`,
    findCreatorFields:()=>({bv:field,title:{}}), fillCreatorPair:async()=>fills++};
  vm.runInNewContext(handler + ';globalThis.paste=onPaste;',ctx);
  const event = text=>({clipboardData:{getData:()=>text},composedPath:()=>[field],preventDefault:()=>blocked++,stopImmediatePropagation:()=>{}});
  await ctx.paste(event('其他网站刚复制的文本')); assert.equal(fills,0); assert.equal(blocked,0);
  await ctx.paste(event('BV123\n标题')); assert.equal(fills,1); assert.equal(blocked,1);
  ctx.isBili=false; await ctx.paste(event('BV123\n标题')); assert.equal(fills,1);
  console.log('PASS: B站域名限制、编辑器框架、最小权限及实际粘贴文本核对。');
})();
