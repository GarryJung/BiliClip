const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
for(const channel of ['chrome','edge','firefox','360']) {
  let installed;const opened=[];
  const api={runtime:{id:'test',getURL:p=>'chrome-extension://test/'+p,onInstalled:{addListener:fn=>installed=fn},onMessage:{addListener:()=>{}}},tabs:{create:args=>opened.push(args.url)}};
  vm.runInNewContext(fs.readFileSync('release/8.2.1/'+channel+'/background.js','utf8'),{chrome:api,URL,AbortController,setTimeout,clearTimeout});
  for(const reason of ['update','chrome_update','shared_module_update']) installed({reason});
  assert.equal(opened.length,0,'updates must not open a welcome tab');
  installed({reason:'install'});assert.deepEqual(opened,['https://bv.lcat.cc/welcome.html'],channel+' opens hosted welcome');
  assert.ok(!fs.existsSync('release/8.2.1/'+channel+'/welcome.html'),'no stale bundled welcome page');
  const script=fs.readFileSync('release/8.2.1/'+channel+'/content.js','utf8');
  assert.ok(script.includes("panel('.resize-sw')"));assert.ok(script.includes("library('.resize-sw')"));
  assert.ok(fs.existsSync('release/8.2.1/'+channel+'/popup.css'));
}
console.log('Four browser builds passed: fresh install opens hosted welcome, updates stay quiet, no bundled welcome leftovers, popup styles included.');
