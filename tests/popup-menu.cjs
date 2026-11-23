const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const script=fs.readFileSync('extension/popup.js','utf8');
async function setup(result,failTabs=false) {
 const nodes=new Map();
 const node=()=>({textContent:'',hidden:true,disabled:false,children:[],append(child){this.children.push(child)}});
 const document={getElementById:id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},createElement:node};
 let closed=false;const messages=[];
 const api={runtime:{getManifest:()=>({version:'8.2.0'})},tabs:{query:async()=>{if(failTabs)throw Error();return [{id:1}]},sendMessage:async(id,m)=>{messages.push(m);return m.type==='biliclip-menus'?[{index:0,title:'引导教程'},{index:1,title:'喵贴 · 上传简介设置'}]:undefined}}};
 if(result!==undefined)api.runtime.requestUpdateCheck=async()=>{if(result instanceof Error)throw result;return result};
 await vm.runInNewContext(script,{chrome:api,document,window:{close:()=>closed=true}});
 return {nodes,document,messages,closed:()=>closed};
}
(async()=>{
 for(const [result,expected] of [[{status:'no_update'},'本次未发现更新'],[{status:'update_available',version:'8.2.1'},'8.2.1'],[{status:'throttled'},'检查过于频繁'],[undefined,'不支持'],[new Error('offline'),'不支持']]){
  const t=await setup(result);await t.document.getElementById('check-update').onclick();
  assert.ok(t.document.getElementById('status').textContent.includes(expected));assert.equal(t.document.getElementById('check-update').disabled,false);
 }
 const t=await setup();assert.equal(t.document.getElementById('menus').children.length,1);await t.document.getElementById('guide').onclick();assert.equal(t.closed(),true);assert.equal(t.messages.at(-1).index,0);
 const unavailable=await setup(undefined,true);await unavailable.document.getElementById('guide').onclick();assert.ok(unavailable.document.getElementById('status').textContent.includes('刷新 B 站'));assert.equal(unavailable.closed(),false);
 const html=fs.readFileSync('extension/popup.html','utf8');for(const label of ['喵贴官网','使用教程','引导教程','检查更新','关于作者'])assert.ok(html.includes(label));
 console.log('Popup menu passed: five entries, guide dispatch and unavailable page, all update statuses and unsupported browser fallback');
})();
