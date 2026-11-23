const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../versions/8.0.1/biliclip-8.0.1.user.js'),'utf8');
function extract(name){const a=source.indexOf('  function '+name+'('),rest=source.slice(a),b=rest.slice(1).search(/\n  (?:async )?function /);assert.ok(a>=0);return rest.slice(0,b+1);}
const scenes=['copy','workbench','card','association','library'];
const store=new Map();for(const scene of scenes){store.set('biliclip_button_guide_v3_'+scene,true);store.set('biliclip_button_progress_v3_'+scene,2);}
const revision=source.match(/const TUTORIAL_REVISION = '([^']+)'/)[1];
let opened=0,closed=0,released=0;const window={};window.top=window.self=window.parent=window;
const ctx=vm.createContext({TUTORIAL_REVISION:revision,GM_getValue:(k,d)=>store.get(k)??d,GM_setValue:(k,v)=>store.set(k,v),isBili:true,isMember:false,window,location:{pathname:'/'},document:{getElementById:()=>null},getComputedStyle:()=>({display:'block'}),creatorEditorFrames:()=>[],pinHomeGuideCover(){},tutorialSteps:()=>[{target:()=>({})}],openTutorial:()=>opened++,releaseHomeGuideCover:()=>released++});
vm.runInContext(['resetTutorialProgress','ensureTutorialRevision','replayTutorial','startTutorialOnce'].map(extract).join('\n'),ctx);
ctx.startTutorialOnce();assert.equal(opened,1,'previously completed installation starts repaired home guide');
for(const scene of scenes){assert.equal(store.get('biliclip_button_guide_v3_'+scene),false);assert.equal(store.get('biliclip_button_progress_v3_'+scene),0);}
store.set('biliclip_button_guide_v3_copy',true);ctx.startTutorialOnce();ctx.startTutorialOnce();assert.equal(opened,1,'same revision keeps completed/skipped guide suppressed');
ctx.document.getElementById=id=>id==='biliclip-walkthrough'?{shadowRoot:{querySelector:()=>({click:()=>{closed++;store.set('biliclip_button_guide_v3_copy',true);}})}}:null;
// Real close removes the old overlay before a replay starts.
const oldGet=ctx.document.getElementById;ctx.document.getElementById=id=>{const e=oldGet(id);if(e)e.shadowRoot.querySelector=()=>({click:()=>{closed++;ctx.document.getElementById=()=>null;}});return e;};
ctx.replayTutorial();assert.equal(closed,1);assert.equal(released,1);assert.equal(opened,2,'manual replay clears state after closing old guide');
console.log('Guide revision passed: existing seen-state migration, no repeated reset, manual replay closes/clears/restarts');
