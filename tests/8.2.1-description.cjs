const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('biliclip.user.js','utf8'),c={};vm.createContext(c);
for(const name of ['descriptionLines','uploadSettings']){const start=source.indexOf('  function '+name+'('),end=source.indexOf('\n  function ',start+1);vm.runInContext(source.slice(start,end),c);}
assert.equal(c.descriptionLines('标题\n旧第二行\n正文\n尾行','新标题','预设一\n预设二',true),'新标题\n预设一\n预设二\n正文\n尾行');
assert.equal(c.descriptionLines('标题\n旧第二行\n正文',null,'预设',false),'标题\n旧第二行\n正文\n预设');
assert.equal(c.descriptionLines('标题\n第二行',null,null,true),'标题\n第二行');
assert.equal(c.descriptionLines('标题',null,'预设',true),'标题\n预设');
assert.equal(c.descriptionLines('',null,'预设',true),'\n预设');
assert.equal(c.uploadSettings({presets:['甲']}).overwriteSecondLine,false);
assert.equal(c.uploadSettings(JSON.parse(JSON.stringify(c.uploadSettings({presets:['甲'],overwriteSecondLine:true})))).overwriteSecondLine,true);
console.log('8.2.1 passed: overwrite/append, preserved body, no selection, short/empty description and preference persistence');
