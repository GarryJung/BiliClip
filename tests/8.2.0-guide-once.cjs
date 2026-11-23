const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../biliclip.user.js'),'utf8');
function extract(name){const start=source.indexOf('  function '+name+'(');assert.ok(start>=0,name);const rest=source.slice(start),end=rest.slice(1).search(/\n  (?:async )?function /);return rest.slice(0,end+1);}
const attrs=new Set(),session=new Map(),opened=[];
const target={isConnected:true},document={documentElement:{hasAttribute:k=>attrs.has(k),setAttribute:k=>attrs.add(k),removeAttribute:k=>attrs.delete(k)},getElementById:id=>id==='biliclip-upload-panel'?{}:null};
const window={};window.top=window.self=window;
const ctx=vm.createContext({window,document,isBili:true,isMember:true,location:{pathname:'/platform/upload/video/frame'},TUTORIAL_SEEN_PREFIX:'biliclip_spotlight_seen_',GM_getValue:(k,d)=>d,GM_setValue(){},sessionStorage:{getItem:k=>session.get(k),removeItem:k=>session.delete(k)},expandCreatorMoreSettings(){},getComputedStyle:()=>({display:'block'}),creatorEditorFrames:()=>[],findCreatorFields:()=>null,tutorialSteps:()=>[{target:()=>target}],tutorialVisibleRect:()=>true,openTutorial:scene=>{opened.push(scene);attrs.add('data-biliclip-guide-'+scene);session.set(ctx.tutorialKey(scene),'true');}});
vm.runInContext(['tutorialKey','tutorialSeen','resetTutorialProgress','tryOpenTutorial','startTutorialOnce'].map(extract).join('\n'),ctx);
ctx.startTutorialOnce();ctx.startTutorialOnce();ctx.startTutorialOnce();assert.deepEqual(opened,['workbench','card'],'workbench appears once then card; stale storage cannot restart either scene');
attrs.clear();assert.equal(ctx.tutorialSeen('workbench'),true,'session guard survives document marker loss');
ctx.resetTutorialProgress();assert.equal(ctx.tutorialSeen('workbench'),false);ctx.startTutorialOnce();assert.equal(opened.at(-1),'workbench','explicit replay resets guards');
console.log('Guide order passed: workbench once → card once, stale-storage suppression, session persistence, explicit replay');

const leaf={textContent:'个性化卡片',children:[],closest:()=>null};ctx.uploadQueryAll=()=>[leaf];ctx.clean=v=>v;ctx.creatorElementVisible=()=>true;vm.runInContext(extract('tutorialCardEntry'),ctx);assert.equal(ctx.tutorialCardEntry(),leaf,'plain div/span entry remains a valid guide target');
ctx.GM_getValue=(key,fallback)=>key==='biliclip_spotlight_seen_card'?true:fallback;ctx.resetTutorialProgress();assert.equal(ctx.tutorialSeen('card'),false,'old card seen record does not suppress repaired guide');
