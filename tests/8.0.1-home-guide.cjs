const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../versions/8.0.1/biliclip-8.0.1.user.js'),'utf8');
function extract(name){const a=source.indexOf('  function '+name+'(');assert.ok(a>=0);const rest=source.slice(a),b=rest.slice(1).search(/\n  (?:async )?function /);return rest.slice(0,b+1);}
const card=(id,left,top)=>({href:id,isConnected:true,querySelector:()=>({}),getBoundingClientRect:()=>({left,top,width:200,height:120,bottom:top+120,right:left+200})});
let cards=[card('left',500,260),card('middle',720,260),card('right',940,260),card('next-row',720,500)];
const ui={hover:{style:{}},hoverText:{}};let positioned=0;
const ctx=vm.createContext({ui,location:{pathname:'/'},window:{innerHeight:900},document:{querySelectorAll:()=>cards},getBV:href=>href,cardTitle:cover=>cover.href,tutorialVisibleRect:()=>({}),positionHover:()=>positioned++});
vm.runInContext(extract('pinHomeGuideCover')+'\n'+extract('releaseHomeGuideCover'),ctx);
assert.equal(ctx.pinHomeGuideCover().href,'middle','first row middle recommendation is the example');assert.equal(ui.active.bv,'middle');assert.equal(ui.hover.style.display,'flex');
cards=[card('new-left',500,260),card('new-middle',720,260),card('new-right',940,260)];
assert.equal(ctx.pinHomeGuideCover().href,'middle','existing example remains pinned even if candidates change');assert.equal(ui.active.bv,'middle');assert.equal(positioned,1,'no resetting button state on repeated startup checks');
ctx.releaseHomeGuideCover();assert.equal(ui.tutorialCover,null);assert.equal(ui.active,null);assert.equal(ui.hover.style.display,'none');
ctx.location.pathname='/video/BV1234567890';assert.equal(ctx.pinHomeGuideCover(),null,'detail-page behavior unchanged');
assert.equal((source.match(/if\(ui(?:\?)?\.tutorialCover\)\{positionHover\(\);return;\}/g)||[]).length,2,'both immediate and queued pointer handlers respect pin');
console.log('Home guide passed: middle-card selection, stable example, no hover-state reset, release on exit, detail-page unchanged, pointer guards');
