const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../versions/8.0.1/biliclip-8.0.1.user.js'),'utf8');
function extract(name){const start=source.search(new RegExp('  (?:async )?function '+name+'\\('));assert.ok(start>=0,name);const rest=source.slice(start),end=rest.slice(1).search(/\n  (?:async )?function /);return end<0?rest:rest.slice(0,end+1);}
const store=new Map(),hosts=new Map(),nodes=new Map();let videoCalls=0,collectionCalls=0,memberCalls=0;
function node(){return {style:{},dataset:{},isConnected:true,childNodes:[],value:'',hidden:false,append(...items){this.childNodes.push(...items);},replaceChildren(){this.childNodes=[];},addEventListener(){},removeAttribute(){},toggleAttribute(){},remove(){this.isConnected=false;hosts.delete(this.id);},attachShadow(){return root;}};}
const root={getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);},querySelector:selector=>root.getElementById(selector)};
const uid='123',document={cookie:'DedeUserID='+uid,body:{append(host){hosts.set(host.id,host);}},getElementById:id=>hosts.get(id),createElement:()=>node(),createTextNode:text=>({textContent:text})};
const row=i=>({bvid:'BV'+String(i).padStart(10,'0'),title:'视频'+i,pubdate:1});
const ctx=vm.createContext({document,URL,clean:v=>String(v||'').trim(),pickerState:null,isVideoPickerPage:()=>true,findUploadFields:()=>null,GM_getValue:(k,d)=>store.get(k)??d,GM_setValue:(k,v)=>store.set(k,v),setTimeout:fn=>{fn();return 0;},clearTimeout(){},enablePanelMovement(){},fillCreatorPair:async()=>true,savePair(){},Date,
 loadPickerRecentVideos:async cb=>{videoCalls++;cb([row(1)].map(v=>({bv:v.bvid,...v})));return [row(1)].map(v=>({bv:v.bvid,...v}));},
 loadPickerCollections:async(uid,cb)=>{collectionCalls++;const items=[{id:'1',kind:'season',title:'合集 A',count:1}];cb(items);return items;},
 loadPickerCollectionVideos:async(uid,c,cb)=>{memberCalls++;const rows=[{bv:row(2).bvid,title:'合集内视频',created:1}];cb(rows);return rows;}});
vm.runInContext(['pickerVideos','pickerCover','pickerTime','pickerPlay','pickerCollections','syncVideoPicker'].map(extract).join('\n'),ctx);
const flush=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 ctx.syncVideoPicker();await flush();assert.equal(videoCalls,1,'initial videos fetched once');
 nodes.get('collections').onclick();await flush();assert.equal(collectionCalls,1);
 nodes.get('videos').onclick();await flush();assert.equal(videoCalls,1,'switch back uses video cache');
 nodes.get('collections').onclick();await flush();assert.equal(collectionCalls,1,'collection tab uses cache');
 await nodes.get('refresh').onclick();assert.equal(collectionCalls,2,'refresh current collections only');assert.equal(videoCalls,1);
 nodes.get('list').childNodes[0].onclick();await flush();assert.equal(memberCalls,1);
 nodes.get('back').onclick();nodes.get('list').childNodes[0].onclick();await flush();assert.equal(memberCalls,1,'reopening collection uses member cache');
 nodes.get('videos').onclick();await nodes.get('refresh').onclick();assert.equal(videoCalls,2,'video refresh stays on videos');assert.equal(ctx.pickerState.mode,'videos');
 // Exercise actual two-page loader, not the UI stub.
 let calls=0,firstPage=false;
 ctx.AbortSignal={timeout:()=>null};ctx.fetch=async()=>{calls++;if(calls===2)assert.equal(firstPage,true,'first page rendered before page two request');return {ok:true,json:async()=>({code:0,data:{arc_audits:Array.from({length:50},(_,i)=>row(i+calls*50)),page:{count:10000}}})};};
 vm.runInContext(extract('loadPickerRecentVideos'),ctx);
 const videos=await ctx.loadPickerRecentVideos(()=>firstPage=true);assert.equal(calls,2);assert.equal(videos.length,100);
 vm.runInContext(extract('tutorialSteps'),ctx);for(const scene of ['copy','workbench','library'])assert.ok(ctx.tutorialSteps(scene).length<=4);
 console.log('Picker flow passed: cached tabs, current-view refresh, cached collection members, two-page cap, first-page progressive display, short contextual guides');
})().catch(e=>{console.error(e);process.exitCode=1;});

// The workbench stays below every recognized page popup, then restores after closing.
let popupOpen=true;
const assistant={style:{},getBoundingClientRect:()=>({left:0,right:100,top:0,bottom:100})};
const popup={textContent:'普通设置弹窗',hasAttribute:()=>false};
const modalCtx=vm.createContext({document:{getElementById:id=>id==='biliclip-upload-panel'?assistant:null},findCreatorFields:()=>null,isUploadPage:()=>true,uploadQueryAll:selector=>selector.includes('aria-modal')?(popupOpen?[popup]:[]):selector.includes('placeholder')?[{}]:[],creatorElementVisible:()=>true,expandCreatorMoreSettings(){},dockPersonalizationPanels(){},positionInitialWorkbench(){},isManuscriptManagementPage:()=>false,creatorEditorFrames:()=>[],clean:v=>v});
vm.runInContext('let associationWasOpen=false;'+extract('syncCreatorPanelContext').split('\n  document.addEventListener')[0],modalCtx);
modalCtx.syncCreatorPanelContext();assert.equal(assistant.style.display,'none');assert.equal(assistant.style.zIndex,'1');popupOpen=false;modalCtx.syncCreatorPanelContext();assert.equal(assistant.style.display,'block');
const routeCtx=vm.createContext({isUploadPage:()=>false,isManuscriptManagementPage:()=>true,creatorEditorFrames:()=>[],creatorElementVisible:e=>e.visible});
vm.runInContext(extract('isVideoPickerPage'),routeCtx);assert.equal(routeCtx.isVideoPickerPage(),false);routeCtx.creatorEditorFrames=()=>[{frame:{visible:true}}];assert.equal(routeCtx.isVideoPickerPage(),true);routeCtx.creatorEditorFrames=()=>[{frame:{visible:false}}];assert.equal(routeCtx.isVideoPickerPage(),false);
console.log('Panel scope passed: management card-only visibility, popup hiding and restoration');

popupOpen=true;popup.id='biliclip-walkthrough';modalCtx.syncCreatorPanelContext();assert.equal(assistant.style.display,'block','tutorial popover must not hide its own workbench');
console.log('Workbench regression passed: own guide is excluded from page-modal detection');
