const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('biliclip.user.js','utf8');
const start=source.indexOf("      input.addEventListener('keydown', event => {");
const end=source.indexOf("      entry.querySelector('.delete-preset')",start);
function setup(value='') {
 let handler,saves=0,renders=0;
 const tags=['甲','乙'],input={value,addEventListener:(_,fn)=>handler=fn},status={};
 vm.runInNewContext(source.slice(start,end),{input,tags,status,persist:()=>saves++,renderTags:()=>renders++,toast:()=>{},MAX_PRESET_TAGS:10});
 const key=(key,extra={})=>{const e={key,preventDefault(){this.prevented=true},stopPropagation(){this.stopped=true},...extra};handler(e);return e};
 return {tags,input,status,key,saves:()=>saves,renders:()=>renders};
}
for(const name of ['Backspace','Delete']) {const t=setup();const e=t.key(name);assert.deepEqual(t.tags,['甲']);assert.equal(t.saves(),1);assert.equal(t.renders(),1);assert.ok(e.prevented&&e.stopped);t.key(name,{repeat:true});assert.deepEqual(t.tags,['甲']);t.key(name);assert.deepEqual(t.tags,[]);assert.doesNotThrow(()=>t.key(name));}
for(const name of ['Backspace','Delete']) {for(const value of ['文字',' ']){const t=setup(value);t.key(name);assert.equal(t.tags.length,2);assert.equal(t.saves(),0);}for(const extra of [{isComposing:true},{keyCode:229}]){const t=setup();t.key(name,extra);assert.equal(t.tags.length,2);}}
const t=setup('丙');t.key('Enter');assert.deepEqual(t.tags,['甲','乙','丙']);assert.equal(t.input.value,'');
console.log('Tag keyboard passed: both delete keys, persistence, empty list, nonempty input, IME, held keys and Enter');
