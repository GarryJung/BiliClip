const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const s=fs.readFileSync('assets/site.js','utf8');
assert.ok(!/navigator\.userAgent|detectInstallBrowser|detectedBrowser|自动识别/.test(s));
assert.ok(s.includes("auto.textContent = '请选择浏览器'"));
assert.ok(s.includes("badge.textContent = '已选择'"));
for(const f of ['index.html','tutorial.html']){
 const html=fs.readFileSync(f,'utf8');assert.equal((html.match(/data-install-browser=/g)||[]).length,8);
 for(const key of ['chrome','dia','comet','cent'])assert.ok(html.includes('data-install-browser="'+key+'" href="https://chromewebstore.google.com/search/BiliClip"'));
 assert.ok(html.includes('99🔪注册费，攒攒钱再上传。'));assert.ok(html.includes('2026-11-22'));assert.ok(!html.includes('简介第二行'));
}
console.log('Website passed: eight browser options, shared Chrome store URL, version/date metadata, Safari note and manual browser selection');
