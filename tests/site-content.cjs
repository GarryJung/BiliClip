const fs=require('node:fs'),assert=require('node:assert/strict');
for(const name of ['index.html','tutorial.html']){
 const s=fs.readFileSync(name,'utf8');
 for(const old of ['保留上次的参与话题','投稿时展开标签区','粉红色「BV + 标题」','蓝色「标题 + 链接」','demo-studio','preset-layout'])assert.ok(!s.includes(old),name+': removed obsolete '+old);
 assert.ok(s.includes('一键执行'));assert.ok(s.includes('data-description-demo'));assert.ok(s.includes('data-tags-demo'));
}
const tutorial=fs.readFileSync('tutorial.html','utf8');
for(const id of ['install','workbench','description','tags','library','copy','menu','guide'])assert.ok(tutorial.includes('data-article="'+id+'"'));
assert.ok(tutorial.includes('不会自动去重'));assert.ok(tutorial.includes('每条所选内容独占一行'));assert.ok(tutorial.includes('标签预设'));assert.ok(tutorial.includes('不执行标签预设'));
console.log('Content audit passed: obsolete UI removed, eight current doc chapters, correct description and tag execution rules');
