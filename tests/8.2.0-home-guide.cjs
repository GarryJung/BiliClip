const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../biliclip.user.js'),'utf8');
function extract(name){const a=source.indexOf('  function '+name+'('),rest=source.slice(a),b=rest.slice(1).search(/\n  (?:async )?function /);return rest.slice(0,b+1);}
const card=(id,left,top,excluded=false)=>({href:id,isConnected:true,excluded,querySelector:()=>({}),getBoundingClientRect:()=>({left,top,width:200,height:120,bottom:top+120,right:left+200})});
let cards=[card('nav',500,150,true),card('left',500,260),card('middle',720,260),card('right',940,260)];
const ui={hoverActions:{style:{}}};let positions=0;
const ctx=vm.createContext({ui,location:{pathname:'/'},window:{innerHeight:900},document:{querySelectorAll:()=>cards},getBV:href=>href,cardTitle:c=>c.href,tutorialVisibleRect:()=>({}),excludedVideoSurface:c=>c.excluded,positionHover:()=>{positions++;ui.hoverActions.style.display='flex'}});
vm.runInContext(extract('pinHomeGuideCover')+'\n'+extract('releaseHomeGuideCover'),ctx);
assert.equal(ctx.pinHomeGuideCover().href,'middle');
ui.active=null;ui.hoverActions.style.display='none';
assert.equal(ctx.pinHomeGuideCover().href,'middle');assert.equal(ui.active.cover,ui.tutorialCover);assert.equal(ui.hoverActions.style.display,'flex');
ui.tutorialCover.isConnected=false;
cards=[card('new',300,260)];assert.equal(ctx.pinHomeGuideCover().href,'new');
ctx.releaseHomeGuideCover();assert.equal(ui.active,null);assert.equal(ui.hoverActions.style.display,'none');
ctx.location.pathname='/index.html';assert.equal(ctx.pinHomeGuideCover().href,'new');
ctx.releaseHomeGuideCover();ctx.location.pathname='/video/BV1234567890';assert.equal(ctx.pinHomeGuideCover(),null);
const bind=extract('bindBiliUI');assert.ok(bind.indexOf('if(ui?.tutorialCover)')<bind.indexOf('excludedVideoSurface(event.target)'));
assert.ok(source.includes("if(scene==='copy' && /^\\/(?:index\\.html)?$/.test(location.pathname))pinHomeGuideCover()"));
console.log('Current home guide passed: navigation exclusion, pin restoration after active clears, detached card replacement, index.html support, pointer guard ordering');
