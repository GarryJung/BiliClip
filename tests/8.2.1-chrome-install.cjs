const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let installed;const opened=[];
const api={runtime:{id:'test',getURL:p=>'chrome-extension://test/'+p,onInstalled:{addListener:fn=>installed=fn},onMessage:{addListener:()=>{}}},tabs:{create:args=>opened.push(args.url)}};
vm.runInNewContext(fs.readFileSync('release/8.2.1/chrome/background.js','utf8'),{chrome:api,URL,AbortController,setTimeout,clearTimeout});
installed({reason:'update'});assert.equal(opened.length,0);installed({reason:'install'});assert.deepEqual(opened,['chrome-extension://test/welcome.html']);
const script=fs.readFileSync('release/8.2.1/chrome/content.js','utf8');assert.ok(script.includes("panel('.resize-sw')"));assert.ok(script.includes("library('.resize-sw')"));
for(const f of ['popup.css','welcome.html','assets/welcome.js','assets/welcome.css','assets/biliclip-logo.png'])assert.ok(fs.existsSync('release/8.2.1/chrome/'+f));
console.log('Chrome offline passed: install-only welcome, bundled assets and bottom-left resize guide targets');
