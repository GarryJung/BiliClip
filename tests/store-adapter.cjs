const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 let handler, calls=0;
 const ctx={chrome:{runtime:{id:'self',onMessage:{addListener:fn=>handler=fn}}},URL,AbortController,setTimeout,clearTimeout,fetch:async()=>{calls++;return {status:200,text:async()=>'{"code":0}'}}};
 vm.runInNewContext(fs.readFileSync('extension/background.js','utf8'),ctx);
 const send=async(url,sender)=>{let value;const pending=handler({type:'biliclip-api',url},sender,v=>value=v);if(pending)await new Promise(r=>setImmediate(r));return value};
 const good={id:'self',url:'https://member.bilibili.com/platform/upload/video/frame'};
 assert.equal((await send('https://api.bilibili.com/x/web-interface/view?bvid=BV123',good)).status,200);
 for(const url of ['https://evil.test/x/web-interface/view','https://api.bilibili.com/x/private','http://api.bilibili.com/x/web-interface/view'])assert.equal((await send(url,good)).error,'Request denied');
 assert.equal((await send('https://api.bilibili.com/x/web-interface/view',{id:'self',url:'https://evil.test'})).error,'Request denied');assert.equal(calls,1);
 let change,receive;const writes=[];const storage={local:{get:async()=>({existing:42}),set:async v=>writes.push(v)},onChanged:{addListener:fn=>change=fn}};
 const context={chrome:{storage,runtime:{id:'self',onMessage:{addListener:fn=>receive=fn},sendMessage:async()=>({status:200})}},console};
 const probe=`globalThis.probe={GM_getValue,GM_setValue,GM_addValueChangeListener,GM_registerMenuCommand};`;
 await vm.runInNewContext(fs.readFileSync('extension/bridge.js','utf8').replace('/* USER_SCRIPT */',probe),context);
 const p=context.probe;assert.equal(p.GM_getValue('existing',0),42);p.GM_setValue('setting',7);assert.equal(p.GM_getValue('setting',0),7);assert.equal(writes[0].setting,7);
 let seen;p.GM_addValueChangeListener('setting',(...args)=>seen=args);change({setting:{oldValue:7,newValue:8}},'local');assert.equal(p.GM_getValue('setting',0),8);assert.equal(seen[2],8);
 let ran=false;p.GM_registerMenuCommand('test',()=>ran=true);let menus;receive({type:'biliclip-menus'},{id:'self'},v=>menus=v);assert.equal(menus[0].title,'test');receive({type:'biliclip-menu',index:0},{id:'self'},()=>{});assert.ok(ran);
 console.log('Store adapter passed: API origin/path/sender restrictions, cached storage, cross-tab updates, popup menu dispatch');
})();
