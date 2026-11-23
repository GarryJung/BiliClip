const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../versions/8.0.1/biliclip-8.0.1.user.js'),'utf8');
const start=source.indexOf('  function tutorialPlacement('),end=source.indexOf('  function openTutorialManual(',start);
const nodes=new Map(),store=new Map(),listeners=new Map();let tick,removed=false,now=1000;
let rect={left:500,top:200,width:100,height:30,right:600,bottom:230};
const node=()=>({style:{setProperty(k,v){this[k]=v;}},setAttribute(k,v){this[k]=v;},append(){},focus(){},isConnected:true,getBoundingClientRect:()=>rect});
const get=s=>{if(!nodes.has(s))nodes.set(s,node());return nodes.get(s);};
get('.probe').getBoundingClientRect=()=>({left:0,top:0,width:100,height:100});
const host=node();host.attachShadow=()=>({querySelector:get});host.remove=()=>{removed=true;};
const target=node();target.value='';
const steps=[{title:'输入',text:'填写',target:()=>target,action:'input'},{title:'刷新',text:'等待',target:()=>target,action:'refresh'},{title:'缺失',text:'打开页面',target:()=>null,action:'appear'},{title:'保留设置',text:'按需选择',target:()=>target,action:'choice'},{title:'完成',text:'检查',target:null,action:'read'}];
const ctx=vm.createContext({tutorialSteps:()=>steps,ui:null,releaseHomeGuideCover(){},GM_getValue:(k,d)=>store.has(k)?store.get(k):d,GM_setValue:(k,v)=>store.set(k,v),pair:null,panelExecuting:false,declarationPending:0,Date:{now:()=>now},window:{innerWidth:1200,innerHeight:800},getComputedStyle:e=>e.css || ({visibility:'visible',display:'block'}),setInterval:fn=>(tick=fn,1),clearInterval(){},document:{getElementById:()=>null,activeElement:node(),createElement:()=>host,body:{append(){}},addEventListener:(k,fn)=>listeners.set(k,fn),removeEventListener:k=>listeners.delete(k)}});
vm.runInContext(source.slice(start,end)+'\nopenTutorial();',ctx);
const position=()=>store.get('biliclip_button_progress_v3_copy');
const fire=type=>listeners.get(type)({type,composedPath:()=>[target]});
const settle=()=>{now+=700;tick();now+=400;tick();};
assert.equal(position(),0);assert.equal(get('#next').hidden,false,'every step has next');assert.equal(get('#prev').disabled,true);
assert.equal(get('.s0').style.height,'195px','mask ends above target');
assert.equal(get('.s2').style.width,'495px','mask leaves target clickable');
assert.equal(get('.card').style.top,'242px','bubble sits beside target');
rect={...rect,left:700,right:800};tick();assert.equal(get('.ring').style.left,'695px','spotlight follows movement');
assert.equal(get('.card').style.left,'700px','bubble follows movement');
target.value='新标题';tick();assert.equal(position(),0,'prefilled values do not silently skip input');
fire('input');settle();assert.equal(position(),1,'typing auto advances after debounce');
target.disabled=true;fire('click');tick();now+=1000;tick();assert.equal(position(),1,'async action waits for completion');
target.disabled=false;settle();assert.equal(position(),2,'completed refresh auto advances');
settle();assert.equal(position(),2,'missing target waits');assert.equal(get('.s0').style.pointerEvents,'none','missing controls do not trap page navigation');
get('#next').onclick();assert.equal(position(),3);get('#prev').onclick();assert.equal(position(),2);get('#next').onclick();assert.equal(position(),3);assert.equal(get('#next').hidden,false,'optional settings can be preserved');
fire('change');settle();assert.equal(position(),4,'changing choice auto advances');
get('#next').onclick();assert.equal(removed,true);assert.equal(store.get('biliclip_walkthrough_done_801'),true);assert.equal(listeners.size,0);
const place=ctx.tutorialPlacement({left:500,top:750,right:600,bottom:780,width:100,height:30},264,150,1200,800);
assert.equal(place.side,'bottom');assert.equal(place.top,588,'bottom-edge targets place bubble above');
for(const [vw,vh] of [[320,568],[1440,900]]){const p=ctx.tutorialPlacement({left:0,top:0,right:40,bottom:30,width:40,height:30},264,150,vw,vh);assert.ok(p.left>=12&&p.left+264<=vw-12);assert.ok(p.top>=12&&p.top+150<=vh-12);}
console.log('Spotlight checks passed: four-sided mask, anchored bubble, movement, edge avoidance, input debounce, automatic progression, async wait, missing-target escape, optional choices, cleanup');

vm.runInContext('openTutorial();',ctx);get('#skip').onclick();assert.equal(position(),0);assert.equal(listeners.size,0,'skip exits entire guide');assert.equal(store.get('biliclip_walkthrough_active_801'),false);

// Nested scrollers and open shadow hosts limit the visible spotlight, not just viewport bounds.
const clip={isConnected:true,css:{overflowX:'hidden',overflowY:'auto'},getBoundingClientRect:()=>({left:120,top:130,right:280,bottom:180,width:160,height:50})};
const clipped={isConnected:true,parentElement:clip,getBoundingClientRect:()=>({left:100,top:100,right:300,bottom:200,width:200,height:100})};
const visible=ctx.tutorialVisibleRect(clipped);assert.equal(visible.left,120);assert.equal(visible.top,130);assert.equal(visible.width,160);assert.equal(visible.height,50);
clip.css={opacity:'0'};assert.equal(ctx.tutorialVisibleRect(clipped),null,'transparent ancestor cannot be highlighted');
clip.css={display:'none'};const shadowChild={...clipped,parentElement:null,getRootNode:()=>({host:clip})};assert.equal(ctx.tutorialVisibleRect(shadowChild),null,'visibility walks through shadow host');
const normalized=ctx.tutorialLocalRect({left:210,top:120,width:100,height:60},{left:10,top:20,width:200,height:200});assert.equal(normalized.left,100);assert.equal(normalized.top,50);assert.equal(normalized.width,50);assert.equal(normalized.height,30);
console.log('Position checks passed: nested-scroll clipping, hidden shadow ancestors, translated/scaled overlay coordinate conversion');

const workbenchTip=ctx.tutorialPlacement({left:1100,top:300,right:1250,bottom:330,width:150,height:30},264,150,1400,900,{left:1000,right:1280,top:100,bottom:600});
assert.equal(workbenchTip.left,724);assert.equal(workbenchTip.side,'right');assert.ok(workbenchTip.left+264<1000,'tip stays outside whole workbench');
let pageScrolled=false;
const scrollBody={scrollTop:0,getBoundingClientRect:()=>({left:1000,top:200,right:1280,bottom:500,width:280,height:300})};
const workbenchInput={getRootNode:()=>({host:{id:'biliclip-upload-panel'}}),closest:()=>scrollBody,getBoundingClientRect:()=>({left:1050,top:600,bottom:630,height:30}),scrollIntoView:()=>pageScrolled=true};
ctx.tutorialRevealTarget(workbenchInput);assert.equal(scrollBody.scrollTop,265);assert.equal(pageScrolled,false,'workbench guide scrolls only internal body');
workbenchInput.getBoundingClientRect=()=>({top:250,bottom:280,height:30});ctx.tutorialRevealTarget(workbenchInput);assert.equal(scrollBody.scrollTop,265,'visible field remains in place');
console.log('Workbench checks passed: bubble outside panel, internal-only scrolling, visible fields remain stable');

// Reproduce the actual upload page: body is scrolled above viewport and locked
// with overflow:hidden while the library is fixed inside the viewport.
const lockedBody={css:{overflow:'hidden',position:'static'},getBoundingClientRect:()=>({left:0,top:-1463.5,right:1555,bottom:-747.5,width:1555,height:716})};
const fixedPanel={parentElement:lockedBody,css:{position:'fixed',overflow:'visible'},getBoundingClientRect:()=>({left:8,top:76,right:268,bottom:538,width:260,height:462})};
const liveButton={isConnected:true,parentElement:fixedPanel,css:{position:'static'},getBoundingClientRect:()=>({left:71,top:191,right:141,bottom:222.5,width:70,height:31.5})};
const fixedRect=ctx.tutorialVisibleRect(liveButton);assert.ok(fixedRect,'visible fixed button must not disappear due to body scroll lock');assert.equal(fixedRect.left,71);assert.equal(fixedRect.height,31.5);
lockedBody.css.transform='matrix(1,0,0,1,0,0)';assert.equal(ctx.tutorialVisibleRect(liveButton),null,'transformed clipping ancestor still applies');delete lockedBody.css.transform;
const tab={textContent:' 添加一个视频链接，向观众推广你的稿件 关联视频',children:[],getBoundingClientRect:()=>({left:100,top:100,right:173,bottom:173,width:73,height:73})};
const label={isConnected:true,textContent:'关联视频',children:[],closest:()=>tab,getBoundingClientRect:()=>({left:102,top:145,right:171,bottom:166.6,width:69,height:21.6})};
ctx.clean=v=>String(v||'').trim();ctx.document.querySelectorAll=()=>[tab,label];
const controlStart=source.indexOf('  function associationGuideControl('),controlEnd=source.indexOf('  function startTutorialOnce(',controlStart);
vm.runInContext(source.slice(controlStart,controlEnd),ctx);assert.equal(ctx.associationGuideControl('tab'),tab,'highlight entire icon+label tile, not text span');
console.log('Live-DOM reproductions passed: fixed library under scrolled locked body; full association tab selected instead of label');
