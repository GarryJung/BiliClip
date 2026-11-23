const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const s = fs.readFileSync('biliclip.user.js','utf8');
function extract(name) {
 const start = s.indexOf('  function '+name+'('), end = s.indexOf('\n  function ', start+1);
 return s.slice(start,end < 0 ? undefined : end);
}
const c = {console};vm.createContext(c);
for(const name of ['uploadSettings','descriptionLines','hoverLayout','excludedVideoSurface','coverBounds'])vm.runInContext(extract(name), c);
assert.equal(c.uploadSettings({secondLine:'原有预设'}).presets[0],'原有预设');
const settings = c.uploadSettings({presets:Array.from({length:15},(_,i)=>'预设'+i),selected:20});
assert.equal(settings.presets.length,10);assert.equal(settings.selected,9);assert.equal(settings.secondLine,'预设9');
assert.equal(c.uploadSettings({presets:[]}).presets.length,1);
assert.equal(c.descriptionLines('首行\n旧预设\n正文\n尾行',null,'新预设'),'首行\n旧预设\n正文\n尾行\n新预设');
for(const width of [160,238,268,500]) {
 const r={left:40,right:40+width,top:20};const layout=c.hoverLayout(r,1200);
 assert.equal(layout.left,48);assert.equal(layout.left+layout.width,r.right-8);assert.equal(layout.top,28);
 assert.ok(layout.scale > 0 && layout.scale <= 1);
}
let selectors;c.excludedVideoSurface({closest:value=>{selectors=value;return {}}});
assert.match(selectors,/\.bili-header/);assert.match(selectors,/\.v-popover/);assert.match(selectors,/header/);
const outer={left:0,right:300,top:0,bottom:260,width:300,height:260},cover={left:0,right:300,top:0,bottom:169,width:300,height:169};
assert.equal(c.coverBounds({getBoundingClientRect:()=>outer,querySelector:()=>({getBoundingClientRect:()=>cover})}),cover);
assert.ok(s.includes('uploadPrefs.presets.length >= 10'));
console.log('Cover/presets passed: old-setting migration, 10-entry cap, selection, preserved description lines, symmetric cover margins, narrow covers, excluded navigation surfaces');
const multiple = c.uploadSettings({presets:['甲','乙','丙'],selectedIndices:[2,0,2,20,-1]});
assert.equal(multiple.selectedIndices.join(','),'0,2');assert.equal(multiple.secondLine,'甲\n丙');
assert.equal(c.uploadSettings({presets:['甲','乙'],selectedIndices:[]}).secondLine,'');
assert.equal(c.uploadSettings({presets:['甲','','丙'],selectedIndices:[0,1,2]}).secondLine,'甲\n丙');
assert.equal(c.uploadSettings(JSON.parse(JSON.stringify(multiple))).secondLine,'甲\n丙');
console.log('Multi-select passed: normalized selection, ordering, deselect all, empty presets, persistence');

assert.equal(c.descriptionLines('正文\n已有末行',null,['预设一','预设二']),'正文\n已有末行\n预设一\n预设二');
assert.equal(c.descriptionLines('正文\n',null,['预设一']),'正文\n预设一');
assert.equal(c.descriptionLines('',null,['预设一']),'预设一');
assert.equal(c.descriptionLines('旧标题\n正文','新标题',null),'新标题\n正文');
assert.equal(c.descriptionLines('原文',null,[]),'原文');
console.log('Append behavior passed: multiline presets, existing text, blank description, title-only and no selection');
