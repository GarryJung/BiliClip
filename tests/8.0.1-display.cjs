const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../versions/8.0.1/biliclip-8.0.1.user.js'),'utf8');
function extract(name){const start=source.indexOf('  function '+name+'(');assert.ok(start>=0);const rest=source.slice(start);const end=rest.slice(1).search(/\n  (?:async )?function /);return rest.slice(0,end+1);}
const store=new Map([['biliclip_walkthrough_seen_801',true],['biliclip_walkthrough_done_801',true]]);let opened=0;
const window={};window.top=window.self={};
class FixedDate extends Date{constructor(...args){super(...(args.length?args:['2026-11-19T12:00:00+08:00']));}}
const ctx=vm.createContext({ensureTutorialRevision(){},window,isBili:true,GM_getValue:(k,d)=>store.get(k)??d,openTutorial:()=>opened++,Date:FixedDate,isMember:false,location:{pathname:'/'},creatorEditorFrames:()=>[],pinHomeGuideCover(){},tutorialSteps:()=>[{target:()=>({})}],document:{getElementById:id=>id==='biliclip-ui-host'?{}:null},getComputedStyle:()=>({display:'block'})});
vm.runInContext(extract('startTutorialOnce')+'\n'+extract('pickerTime'),ctx);
ctx.startTutorialOnce();assert.equal(opened,1,'old shown/completed flags must not suppress repaired guide');
store.set('biliclip_button_guide_v3_copy',true);ctx.startTutorialOnce();assert.equal(opened,1,'completion/skip suppresses future automatic launches');
store.clear();window.top={};ctx.startTutorialOnce();assert.equal(opened,1,'iframe never starts guide');
assert.equal(ctx.pickerTime(new Date('2026-11-05T12:00:00+08:00').getTime()/1000),'11月5日');
assert.equal(ctx.pickerTime(new Date('2025-11-05T12:00:00+08:00').getTime()/1000),'2025年11月5日');
assert.equal(ctx.pickerTime(0),'');assert.equal(ctx.pickerTime('invalid'),'');
assert.ok(!source.includes('id="breadcrumb"'));assert.ok(!source.includes('先选择合集，再查看合集视频。填入前请展开'));
console.log('Display checks passed: legacy guide migration, completed/skip suppression, iframe exclusion, same-year/previous-year dates, compact library');
