const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../biliclip.user.js'),'utf8');
function extract(name){const start=source.indexOf('  function '+name+'(');assert.ok(start>=0,name);const rest=source.slice(start),end=rest.slice(1).search(/\n  (?:async )?function /);return rest.slice(0,end+1);}
const gm=new Map([['biliclip_spotlight_seen_association',true],['biliclip_button_guide_v3_association',true]]),session=new Map(),attrs=new Set();let visible=true,launched=0,closed=0;
const control={isConnected:true},parent={},window={parent};window.top=parent;window.self=window;
const ctx=vm.createContext({window,location:{pathname:'/web/player/index.html'},isBili:true,isMember:false,TUTORIAL_SEEN_PREFIX:'biliclip_spotlight_seen_',GM_getValue:(k,d)=>gm.has(k)?gm.get(k):d,GM_setValue:(k,v)=>gm.set(k,v),sessionStorage:{getItem:k=>session.get(k)??null,setItem:(k,v)=>session.set(k,v),removeItem:k=>session.delete(k)},document:{documentElement:{hasAttribute:k=>attrs.has(k),removeAttribute:k=>attrs.delete(k)},getElementById:()=>null},tutorialSteps:()=>[{target:()=>visible?control:null}],tutorialVisibleRect:()=>visible,tutorialRevealTarget(){},openTutorial(scene){launched++;gm.set(ctx.tutorialKey(scene),true);session.set(ctx.tutorialKey(scene),'true');attrs.add('data-biliclip-guide-'+scene);}});
vm.runInContext('let editorTutorialEpoch;'+['tutorialKey','tutorialSeen','resetTutorialProgress','syncEditorTutorialEpoch','tryOpenTutorial','startTutorialOnce'].map(extract).join('\n'),ctx);
visible=false;ctx.startTutorialOnce();assert.equal(launched,0,'wait for editor controls before recording the scene');
visible=true;ctx.startTutorialOnce();assert.equal(launched,1,'old association records cannot suppress repaired editor guide');ctx.startTutorialOnce();assert.equal(launched,1,'poll does not duplicate editor guide');
// The parent clears shared manager values but cannot touch the iframe DOM/session.
gm.set('biliclip_editor_tutorial_epoch',1);gm.set(ctx.tutorialKey('association'),false);
ctx.startTutorialOnce();assert.equal(launched,2,'parent replay clears stale iframe session and document guards');
// A loaded iframe observes a later replay even if sessionStorage is shared with another iframe.
gm.set('biliclip_editor_tutorial_epoch',2);gm.set(ctx.tutorialKey('association'),false);session.set('biliclip_editor_tutorial_epoch','2');ctx.startTutorialOnce();assert.equal(launched,3);
// Real editor control lookup and step progression use its actual tab-item wrapper.
const tab={isConnected:true},add={isConnected:true};const leaf=text=>({textContent:text,children:[],closest:()=>text==='关联视频'?tab:add});
ctx.clean=v=>v;ctx.document.querySelectorAll=()=>[leaf('关联视频'),leaf('添加关联视频')];vm.runInContext(extract('associationGuideControl'),ctx);assert.equal(ctx.associationGuideControl('tab'),tab);assert.equal(ctx.associationGuideControl('add'),add);
ctx.findCreatorFields=()=>null;ctx.tagPresetRow=null;vm.runInContext(extract('tutorialSteps'),ctx);const steps=ctx.tutorialSteps('association');assert.equal(steps.length,2);assert.equal(steps[0].action,'association-tab');assert.equal(steps[1].action,'fields');
console.log('Editor guide passed: delayed controls, legacy migration, iframe replay reset, duplicate guard, real tab/add targets and two-step order');
