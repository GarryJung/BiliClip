const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(require('node:path').join(__dirname, process.argv[2] || '../versions/8.0.0/biliclip-8.0.0.user.js'), 'utf8');
function extract(name) {
  const start = source.indexOf('  function ' + name + '(') >= 0 ? source.indexOf('  function ' + name + '(') : source.indexOf('  async function ' + name + '(');
  const next = source.indexOf('\n  function ', start + 1);
  return source.slice(start, next < 0 ? source.lastIndexOf('})();') : next);
}
const ctx = vm.createContext({ console, setTimeout, URL, isMember:false, clean: v => String(v || '').trim(), document: { querySelector: () => null } });
vm.runInContext(['pickerVideos', 'pickerCover', 'pickerPlay', 'pickerTime', 'pickerScore', 'playerIsFullscreen', 'syncFullscreenUI'].map(extract).join('\n'), ctx);
assert.equal(vm.runInContext(`pickerVideos([{Archive:{bvid:'BV1234567890',title:' A ',ptime:1}},{archive:{bvid:'BVabcdefghij',title:'B',ptime:2}},{bvid:'BV1234567890',title:'A updated',ptime:3},{bvid:'bad',title:'bad'}]).map(v=>v.title).join('|')`, ctx), 'A updated|B');
assert.ok(vm.runInContext(`pickerScore('猫咪养护指南', '猫咪养护') > pickerScore('编程入门', '猫咪养护')`, ctx));
assert.equal(ctx.playerIsFullscreen(), false);
ctx.document.fullscreenElement = {}; assert.equal(ctx.playerIsFullscreen(), true);
ctx.document.fullscreenElement = null;
for (const mode of ['web', 'full', 'fullscreen']) {
  ctx.document.querySelector = selector => selector.includes(`[data-screen="${mode}"]`) ? {} : null;
  assert.equal(ctx.playerIsFullscreen(), true);
}
let display;
ctx.ui = { host: { style: { setProperty: (key, value) => {display=value;} } }, hover: {style:{}}, bar:{style:{}}, active:{} };
ctx.syncFullscreenUI(); assert.equal(display, 'none'); assert.equal(ctx.ui.active, null);
ctx.document.querySelector = () => null;
ctx.syncFullscreenUI(); assert.equal(display, 'block');
let fields = { bv: { value:'' }, title: { value:'', focus() {} } };
ctx.findCreatorFields = () => fields;
ctx.replaceValue = (editor, value) => {editor.value = value; return true;};
ctx.editorValue = editor => editor.value;
ctx.fillingCreator = false;
let message;
ctx.toast = text => {message=text;};
vm.runInContext(extract('fillCreatorPair'), ctx);
(async () => {
  await ctx.fillCreatorPair({bv:'BV1234567890',title:'视频标题'});
  assert.equal(fields.bv.value, 'BV1234567890'); assert.equal(fields.title.value, '视频标题');
  assert.ok(message.includes('已自动填充')); assert.equal(ctx.fillingCreator, false);
  fields = null;
  await ctx.fillCreatorPair({bv:'BV1234567890',title:'视频标题'});
  assert.ok(message.includes('未找到关联视频')); assert.equal(ctx.fillingCreator, false);
  console.log('8.0.0 regression checks passed: normalization, recommendations, fullscreen visibility, paired fill, missing fields');
})().catch(error => {console.error(error); process.exitCode=1;});

// Fixed viewport coordinates, independent of page scroll. Expanded header and collapsed tab share drag behavior; dragging a tab must not expand it.
const listeners = {};
const handle = tagName => ({ tagName, style:{}, listeners:{}, title:'',
  addEventListener(name, fn) {this.listeners[name]=fn;},
  setPointerCapture() {}, hasPointerCapture() {return true;}, releasePointerCapture() {} });
const header = handle('HEADER'), tab = handle('BUTTON');
const panel = {style:{}, offsetWidth:280, offsetHeight:400, isConnected:true, getBoundingClientRect() {return {left:parseFloat(this.style.left), top:parseFloat(this.style.top)};}};
const resizePanel = {style:{},addEventListener(){},getBoundingClientRect:()=>({width:280,height:400})};
const root = { querySelector: selector => selector === 'header' ? header : selector === '.tab' ? tab : selector === 'aside' ? resizePanel : null,
  addEventListener: (name, fn) => {listeners[name]=fn;} };
const positions = new Map();
const moveCtx = vm.createContext({
  document:{querySelectorAll:()=>[]}, innerWidth:1400, innerHeight:1000, scrollX:0, scrollY:300,
  GM_getValue:(key,fallback)=>positions.get(key)||fallback, GM_setValue:(key,value)=>positions.set(key,value),
  constrainManagementLibrary(){}, enablePanelResize(){}, MutationObserver: class {observe() {} disconnect() {}}, ResizeObserver: class {observe() {} disconnect() {}}, window:{addEventListener() {},removeEventListener() {}}
});
vm.runInContext(extract('enablePanelMovement'), moveCtx);
moveCtx.enablePanelMovement(panel, root, 'left');
assert.equal(panel.style.position, 'fixed'); assert.equal(panel.style.left, '208px'); assert.equal(panel.style.top, '300px');
function dragHandle(target) {
  const event = {button:0,pointerId:1,clientX:220,clientY:170,target:{closest:()=>null},preventDefault() {}};
  target.listeners.pointerdown(event);
  target.listeners.pointermove({...event,clientX:300,clientY:210});
  target.listeners.pointerup(event);
  let suppressed = false;
  listeners.click({preventDefault(){suppressed=true;},stopImmediatePropagation(){}});
  assert.equal(suppressed,true);
}
dragHandle(header); assert.equal(panel.style.left, '288px');
dragHandle(tab); assert.equal(panel.style.left, '368px');
assert.equal(positions.get('biliclip_panel_position_v3_left').x, 368);
moveCtx.enablePanelMovement(panel, root, 'left'); assert.equal(panel.style.left, '368px');
header.listeners.pointerdown({button:0,pointerId:1,clientX:1,clientY:1,target:{closest:()=>({})}});
console.log('Panel checks passed: navigation offset, page scrolling coordinates, header/tab dragging, click suppression, saved position');

assert.equal(ctx.pickerCover('//i0.hdslb.com/example.jpg'), 'https://i0.hdslb.com/example.jpg');
assert.equal(ctx.pickerCover('javascript:alert(1)'), '');
assert.equal(ctx.pickerPlay(12345), '1.2万');
const normalized = ctx.pickerVideos([{Archive:{bvid:'BV1234567890',title:'Test',cover:'https://i0.hdslb.com/cover.jpg',ptime:123,duration:42},stat:{view:12345}}])[0];
assert.equal(normalized.play, 12345); assert.equal(normalized.cover, 'https://i0.hdslb.com/cover.jpg');
assert.equal(normalized.created,123); assert.equal(normalized.duration,42);

const moreCtx = vm.createContext({
  isUploadPage:()=>true, GM_getValue:()=>true, clean:v=>String(v||'').trim(),
  creatorElementVisible:()=>true, WeakSet,
});
let expanded = 'false', clicks = 0;
const more = { textContent:'更多设置', children:[], closest(){return this;}, getAttribute(){return expanded;} };
moreCtx.uploadQueryAll = () => [more];
moreCtx.clickUploadControl = () => { clicks++; };
vm.runInContext('const moreSettingsAttempted = new WeakSet();\n' + extract('expandCreatorMoreSettings'), moreCtx);
expanded = 'true'; moreCtx.expandCreatorMoreSettings(); assert.equal(clicks,0);
expanded = 'false'; moreCtx.expandCreatorMoreSettings(); moreCtx.expandCreatorMoreSettings(); assert.equal(clicks,1);
moreCtx.GM_getValue = () => false; moreCtx.expandCreatorMoreSettings(); assert.equal(clicks,1);
const routeCtx = vm.createContext({isMember:true,isUploadPage:()=>false,location:{pathname:'/platform/upload-manager/article'}});
routeCtx.creatorEditorFrames=()=>[];
vm.runInContext(extract('isManuscriptManagementPage')+'\n'+extract('isVideoPickerPage'),routeCtx);
assert.equal(routeCtx.isVideoPickerPage(),!source.includes('return (isManuscriptManagementPage() || isUploadPage())'));
routeCtx.location.pathname='/platform/home'; assert.equal(routeCtx.isVideoPickerPage(),false);
console.log('Additional checks passed: cover/date/play metadata, management route, more-settings disabled/already-open/one-time expansion');

const pickerHost = { style:{}, removeAttribute(){this.opened=(this.opened||0)+1;}, getBoundingClientRect:()=>({left:220,right:500,top:200,bottom:600}) };
let editing = false, association = false, criticalControls=[];
const contextCtx = vm.createContext({
  document:{getElementById:id=>id==='biliclip-video-picker'?pickerHost:null},
  findCreatorFields:()=>association?{}:null, isUploadPage:()=>true,
  uploadQueryAll:selector=>selector.includes('placeholder') ? (editing?[{}]:[]) : selector.startsWith('button') ? criticalControls : [],
  creatorElementVisible:()=>true, expandCreatorMoreSettings(){}, dockPersonalizationPanels(){}, positionInitialWorkbench(){}, isManuscriptManagementPage:()=>false, clean:v=>v,
});
const contextSource = extract('syncCreatorPanelContext').split('\n  document.addEventListener')[0];
vm.runInContext('let associationWasOpen = false;\n'+contextSource,contextCtx);
contextCtx.syncCreatorPanelContext(); assert.equal(pickerHost.style.display,'none');
editing=true; contextCtx.syncCreatorPanelContext(); assert.equal(pickerHost.style.display,'block');
association=true; contextCtx.syncCreatorPanelContext(); contextCtx.syncCreatorPanelContext(); assert.equal(pickerHost.opened,1);
criticalControls=[{textContent:'继续编辑',getBoundingClientRect:()=>({left:300,right:400,top:300,bottom:350})}];
contextCtx.syncCreatorPanelContext(); assert.equal(pickerHost.style.display,'none');
console.log('Context checks passed: landing-page hiding, editing recovery, associated-video auto-open, critical-button avoidance');

assert.ok(source.includes("['n','s','e','w','ne','nw','se','sw']"));
assert.equal(panel.style.position, 'fixed');
console.log('Resize checks passed: native two-axis resize on expanded panels, viewport-fixed collapsed tab');

// Real label from the creator page includes a descriptive suffix.
moreCtx.GM_getValue = () => true;
const suffixed = {textContent:'更多设置 （含声明与权益、视频元素、互动管理等）',children:[],closest(){return this;},getAttribute(){return 'false';}};
moreCtx.uploadQueryAll = () => [suffixed];
moreCtx.expandCreatorMoreSettings(true); assert.equal(clicks,2);
const frameWindow = {postMessage(message, origin) {
  assert.equal(origin, 'https://www.bilibili.com');
  setTimeout(()=>frameListener({origin,source:frameWindow,data:{type:'biliclip-fill-result',id:message.id,ok:true}}),0);
}};
let frameListener;
const frameCtx = vm.createContext({ URL, location:{href:'https://member.bilibili.com/platform/upload/video/frame/'},
  document:{querySelectorAll:()=>[{src:'https://www.bilibili.com/web/player/index.html',contentWindow:frameWindow}]},
  window:{addEventListener:(name, fn)=>frameListener=fn,removeEventListener(){}},setTimeout,clearTimeout });
vm.runInContext(extract('creatorEditorFrames')+'\n'+extract('fillCreatorFrame').split('\n  const openEditorFrames')[0],frameCtx);
frameCtx.fillCreatorFrame({bv:'BV1234567890',title:'Test'}).then(ok=>{assert.equal(ok,true);console.log('Iframe bridge passed: targeted editor frame, matching origin/source/request acknowledgement');}).catch(error=>{console.error(error);process.exitCode=1;});

// Unchecking More Settings closes an already expanded section, rather than returning early.
let moreExpanded = true, toggles = 0;
const moreControl = {textContent:'更多设置 （含声明与权益、视频元素、互动管理等）',children:[],closest(){return this;},getAttribute(){return String(moreExpanded);}};
moreCtx.uploadQueryAll = () => [moreControl];
moreCtx.clickUploadControl = () => {toggles++;moreExpanded=!moreExpanded;};
moreCtx.expandCreatorMoreSettings(true,false); assert.equal(moreExpanded,false);
moreCtx.expandCreatorMoreSettings(true,false); assert.equal(toggles,1);
moreCtx.expandCreatorMoreSettings(true,true); assert.equal(moreExpanded,true);
const commercialInput = {checked:false};
const commercialLabel = {textContent:'增加商业推广信息',querySelector:()=>commercialInput};
const commercialCtx=vm.createContext({uploadQueryAll:()=>[commercialLabel],clickUploadControl:()=>{commercialInput.checked=!commercialInput.checked;},setTimeout});
vm.runInContext(extract('applyCommercialPromotion'),commercialCtx);
(async()=>{
  assert.equal(await commercialCtx.applyCommercialPromotion(true),true);assert.equal(commercialInput.checked,true);
  assert.equal(await commercialCtx.applyCommercialPromotion(true),true);assert.equal(commercialInput.checked,true);
  assert.equal(await commercialCtx.applyCommercialPromotion(false),true);assert.equal(commercialInput.checked,false);
  console.log('Saved setting application passed: More Settings open/close and promotion check/uncheck/idempotency');
})().catch(error=>{console.error(error);process.exitCode=1;});
const dockingPicker={style:{left:'200px',top:'200px',zIndex:'999'},offsetWidth:280,offsetHeight:400};
const dockingAssistant={style:{left:'1000px',top:'200px',zIndex:'999'}};
let editorOpen=true;
const dockingCtx=vm.createContext({document:{body:{}},innerWidth:1400,innerHeight:1000,creatorEditorFrames:()=>editorOpen?[{frame:{getBoundingClientRect:()=>({left:400,top:120})}}]:[],isManuscriptManagementPage:()=>false,creatorElementVisible:()=>true,reservePersonalizationRail:editor=>editor?.getBoundingClientRect()});
vm.runInContext(extract('dockPersonalizationPanels'),dockingCtx);
dockingCtx.dockPersonalizationPanels(dockingPicker,dockingAssistant);
assert.equal(dockingPicker.style.left,'120px');assert.equal(dockingAssistant.style.zIndex,'1');
editorOpen=false;dockingCtx.dockPersonalizationPanels(dockingPicker,dockingAssistant);
assert.equal(dockingPicker.style.left,'200px');assert.equal(dockingAssistant.style.zIndex,'999');
console.log('Docking passed: picker alongside editor, assistant below editor layer, normal position restored on close');

const geometryCtx=vm.createContext({});vm.runInContext(extract('panelResizeBounds'),geometryCtx);
const box={left:400,top:200,width:320,height:400};
for(const edge of ['n','s','e','w','ne','nw','se','sw']){
  const resized=geometryCtx.panelResizeBounds(box,edge,40,30,1400,1000);
  if(edge.includes('w'))assert.equal(resized.left,440);
  if(edge.includes('e'))assert.equal(resized.width,360);
  if(edge.includes('n'))assert.equal(resized.top,230);
  if(edge.includes('s'))assert.equal(resized.height,430);
}
const limited=geometryCtx.panelResizeBounds(box,'nw',9999,9999,1400,1000);
assert.equal(limited.width,260);assert.equal(limited.height,220);
const extended=geometryCtx.panelResizeBounds(box,'se',9999,9999,1400,1000);
assert.equal(extended.left+extended.width,1392);assert.equal(extended.top+extended.height,988);
assert.ok(!source.includes("duration.textContent = pickerDuration"));
console.log('Eight-edge resize passed: edge/corner geometry, minimum size, viewport bounds, duration removed');

// Upload form alone does not show the library; manuscript management and a visible
// personalized-card editor are the only entry points.
routeCtx.isUploadPage=()=>true;routeCtx.creatorElementVisible=()=>true;
routeCtx.creatorEditorFrames=()=>[];routeCtx.location.pathname='/platform/upload/video/frame/';
assert.equal(routeCtx.isVideoPickerPage(),false);
routeCtx.creatorEditorFrames=()=>[{frame:{}}];assert.equal(routeCtx.isVideoPickerPage(),true);
routeCtx.isUploadPage=()=>false;routeCtx.location.pathname='/platform/upload-manager/article';
assert.equal(routeCtx.isVideoPickerPage(),true);
const initialHost={style:{},shadowRoot:{querySelector:()=>({style:initialPanelStyle})},offsetWidth:240,setAttribute(){}};
const initialPanelStyle={};
const initialCtx=vm.createContext({innerWidth:1400,creatorElementVisible:()=>true,
  uploadQueryAll:()=>[{getBoundingClientRect:()=>({left:300,right:1000,top:200,width:700,height:40})}]});
vm.runInContext(extract('positionInitialWorkbench'),initialCtx);
initialCtx.positionInitialWorkbench(initialHost);assert.equal(initialHost.style.left,'1012px');assert.equal(initialPanelStyle.width,'280px');
initialHost.biliclipUserAdjusted=true;initialHost.style.left='500px';
initialCtx.positionInitialWorkbench(initialHost);assert.equal(initialHost.style.left,'500px');
// When the dialog originally lacks left room, reserve a rail rather than putting
// the library over the player. Restoring closes the layout override.
const dialog={style:{width:'',maxWidth:'',minWidth:'',translate:'',boxSizing:''},parentElement:null,
  getBoundingClientRect(){const width=parseFloat(this.style.width)||1200;return {left:100+(parseFloat(this.style.translate)||0),top:100,width,height:700};}};
const editorFrame={parentElement:dialog,getBoundingClientRect(){return {left:120,top:120,width:parseFloat(dialog.style.width)||1180,height:660};}};
const railCtx=vm.createContext({innerWidth:1400,document:{body:{}},});
vm.runInContext('let personalizationDock=null;\n'+extract('reservePersonalizationRail'),railCtx);
const rail=railCtx.reservePersonalizationRail(editorFrame,280);
assert.equal(rail.left,288);assert.equal(rail.left-280,8);assert.ok(rail.width<=1096);
railCtx.reservePersonalizationRail(null,0);assert.equal(dialog.style.translate,'');assert.equal(dialog.style.width,'');
console.log('Visibility and defaults passed: upload library hidden, card-only/management visibility, form-bound initial width, manual override, exact external docking and restoration');

// Manuscript management keeps both panel states outside the real creator navigation,
// including stale saved coordinates, narrow windows and drag attempts into the rail.
let navigationRect = {left:0,right:200,width:200,height:850};
const navigation = {getBoundingClientRect:()=>navigationRect,parentElement:null};
moveCtx.document = {body:{},querySelectorAll:selector=>selector.includes('.slider-bar-wrap')?[navigation]:[],getElementById:()=>({parentElement:navigation})};
moveCtx.isManuscriptManagementPage=()=>true;
moveCtx.innerWidth=900;
vm.runInContext(extract('creatorNavigationRight')+'\n'+extract('constrainManagementLibrary'),moveCtx);
positions.set('biliclip_panel_position_v3_left',{x:10,y:200});
moveCtx.enablePanelMovement(panel,root,'left');
assert.equal(panel.style.left,'212px');
assert.equal(resizePanel.style.maxWidth,'680px');
assert.equal(tab.style.maxWidth,'680px');
dragHandle(header); assert.equal(panel.style.left,'292px');
dragHandle(tab); assert.equal(panel.style.left,'372px');
const leftDrag={button:0,pointerId:2,clientX:400,clientY:200,target:{closest:()=>null},preventDefault(){}};
tab.listeners.pointerdown(leftDrag);
tab.listeners.pointermove({...leftDrag,clientX:0});
tab.listeners.pointerup(leftDrag);
assert.equal(panel.style.left,'212px');
assert.equal(positions.get('biliclip_panel_position_v3_left').x,212);
navigationRect={left:0,right:240,width:240,height:850};
panel.biliclipLayout(); assert.equal(panel.style.left,'252px');
assert.equal(resizePanel.style.maxWidth,'640px');
moveCtx.isManuscriptManagementPage=()=>false;
panel.style.left='16px';panel.biliclipLayout();assert.equal(panel.style.left,'16px');
// The management editor is inline: it must never reattach a dragged library.
editorOpen=true;dockingCtx.isManuscriptManagementPage=()=>true;
dockingPicker.style.left='600px';
dockingCtx.dockPersonalizationPanels(dockingPicker,dockingAssistant);
assert.equal(dockingPicker.style.left,'600px');
assert.equal(dockingPicker.biliclipDockToEditor,null);
console.log('Management navigation checks passed: saved position recovery, expanded/header and collapsed/tab dragging, navigation resize, no inline-editor docking');
