from pathlib import Path
s=Path('biliclip.user.js').read_text()
tail='''
 void (async()=>{
 isVideoPickerPage=()=>true; currentCreatorDraft=()=>({bv:'',aid:''});findUploadFields=()=>null;enablePanelMovement=()=>{};
 syncVideoPicker();
 const picker=document.getElementById('biliclip-video-picker');picker.style.left='24px';picker.style.top='28px';
 fillCreatorPair=async()=>true;
 pickerState.videos=[{bv:'BV1s4y1z7KpQ',title:'把灵感变成作品：我的创作记录',created:1795132800,duration:754,play:12345},{bv:'BV1dK411t7zS',title:'这周值得分享的三个小发现',created:1795132800,duration:567,play:9345}];
 pickerState.collections=[{id:'1',kind:'season',title:'创作日常',count:12}];pickerState.loaded.add('collections');pickerState.render();
 toast('已复制，去粘贴吧', 'blue', 10000);
 const r=picker.shadowRoot;
 const checks=[]; const check=(name,ok)=>{checks.push([name,!!ok]);if(!ok)throw Error(name)};
 r.getElementById('status').textContent='';
 check('two video rows',r.querySelectorAll('.item').length===2);
 check('duration overlay',r.querySelector('.duration').textContent==='12:34');
 check('video tab selected',r.getElementById('videos').getAttribute('aria-pressed')==='true');
 r.getElementById('collections').click();check('collection search',r.getElementById('query').placeholder==='搜索合集名称');check('collection row',r.querySelectorAll('.collection').length===1);
 r.getElementById('videos').click();check('cached video rows',r.querySelectorAll('.item').length===2);
 await r.querySelector('.action-button').onclick();check('fill success feedback',r.querySelector('.action-button').dataset.feedback==='success');check('no persistent fill status',r.getElementById('status').textContent==='');
 const toastRoot=document.getElementById('biliclip-toast-host').shadowRoot;
 check('toast brand',!!toastRoot.querySelector('.panel-logo'));check('toast message',toastRoot.querySelector('.toast-message').textContent==='已复制，去粘贴吧');
 check('no toast close button',!toastRoot.querySelector('button'));
 toast('短提示','blue',40,r.querySelector('.action-button'));
 const toastBox=toastRoot.querySelector('.toast'),anchorRect=r.querySelector('.action-button').getBoundingClientRect();
 check('toast spacing',anchorRect.top-parseFloat(toastBox.style.top)-toastBox.offsetHeight>=19);
 await new Promise(resolve=>setTimeout(resolve,240));check('toast auto hides',toastBox.style.display==='none');
 toast('重复提示一','blue',40);await new Promise(resolve=>setTimeout(resolve,60));toast('重复提示二','blue',1000);await new Promise(resolve=>setTimeout(resolve,180));check('new toast survives previous hide timer',toastBox.style.display==='flex');
 check('regular fill weight',getComputedStyle(r.querySelector('.action-button')).fontWeight==='400');check('regular play weight',getComputedStyle(r.querySelector('.play-link')).fontWeight==='400');
 toast('链接与描述已填入','blue',10000);
 check('no persistent notice',!document.getElementById('biliclip-association-feedback'));
 check('white fill text',getComputedStyle(r.querySelector('.action-button')).color==='rgb(255, 255, 255)');
 check('white play text',getComputedStyle(r.querySelector('.play-link')).color==='rgb(255, 255, 255)');
 tutorialSteps=()=>[{title:'填入关联视频',text:'点击高亮的“填入”，喵贴会把 BV 和标题分别填好。',target:()=>r.querySelector('.action-button'),action:'fill'}];
 resetTutorialProgress();openTutorial('library');
 const guide=document.getElementById('biliclip-walkthrough').shadowRoot;check('guide logo',!!guide.querySelector('.guide-brand img'));check('guide awaits action',guide.getElementById('next').disabled);
 guide.getElementById('skip').click();check('skip has no celebration',!document.getElementById('biliclip-walkthrough'));check('no guide restart',!tryOpenTutorial('library'));
 document.documentElement.removeAttribute('data-biliclip-guide-library');check('session guard',tutorialSeen('library'));
 resetTutorialProgress();
 tutorialSteps=()=>[{title:'完成引导',text:'操作页面按钮',target:()=>r.querySelector('.action-button'),action:'read'}];
 openTutorial('library');
 const shades=document.getElementById('biliclip-walkthrough').shadowRoot.querySelectorAll('.shade');check('guide does not block page',Array.from(shades).every(e=>e.style.pointerEvents==='none'));
 let nativeClicks=0;const nativePost=document.createElement('button');nativePost.textContent='投稿';nativePost.onclick=()=>nativeClicks++;document.body.append(nativePost);nativePost.click();check('native post click preserved',nativeClicks===1);check('read stage has no celebration',!document.getElementById('biliclip-walkthrough'));
 getBV=()=> 'BV1s4y1z7KpQ';currentTitle=()=> '详情页标题';writeClipboard=async()=>{};
 createBiliUI();document.body.append(ui.barHost);
 ui.bar.querySelector('[data-action="title-link"]').click();await new Promise(resolve=>setTimeout(resolve,20));
 check('detail copy toast',document.getElementById('biliclip-toast-host').shadowRoot.querySelector('.toast-message').textContent==='已复制，去粘贴吧');
 check('no cover hint',!ui.host.shadowRoot.querySelector('.hover-hint'));
 isUploadPage=()=>true;syncUploadPanel();const panelRoot=document.getElementById('biliclip-upload-panel').shadowRoot;
 check('execute at top',panelRoot.querySelector('.body').firstElementChild.id==='execute');check('execute label',panelRoot.getElementById('execute').textContent==='一键执行');

 resetTutorialProgress();
 tutorialSteps=()=>[{title:'试着点一下',text:'点击高亮按钮后，小猫会点头回应。',target:()=>nativePost,action:'click'},{title:'接着看这里',text:'高亮与卡片平滑跟随下一步。',target:()=>panelRoot.getElementById('execute'),action:'read'}];
 openTutorial('library');
 const motionHost=document.getElementById('biliclip-walkthrough'),motionRoot=motionHost.shadowRoot;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 check('stationary logo',getComputedStyle(motionRoot.querySelector('.panel-logo')).animationName==='none');
 check('jumping target arrow',reduced || getComputedStyle(motionRoot.querySelector('.jump-cue')).animationName==='cue-hop');
 check('step progress',motionRoot.querySelectorAll('.step-dot').length===2);
 check('two gentle breaths',reduced || getComputedStyle(motionRoot.querySelector('.ring'),'::after').animationIterationCount==='2');
 nativePost.click();await new Promise(resolve=>setTimeout(resolve,100));
 check('click ripple',motionRoot.querySelector('.tap-ripple').classList.contains('play'));
 check('success phase',motionHost.dataset.phase==='success');check('success checkmark',getComputedStyle(motionRoot.querySelector('.guide-complete')).display==='block');
 for(let i=0;i<60 && motionRoot.querySelector('h2').textContent!=='接着看这里';i++) await new Promise(resolve=>setTimeout(resolve,20));
 check('advance after success',motionRoot.querySelector('h2').textContent==='接着看这里');
 check('step following respects motion preference',reduced ? motionRoot.querySelector('.ring').getAnimations().length===0 : motionRoot.querySelector('.ring').getAnimations().length>0);
 check('cat respects reduced motion',!reduced || getComputedStyle(motionRoot.querySelector('.panel-logo')).animationName==='none');
 motionRoot.getElementById('next').click();check('non-fill stage has no celebration',!document.getElementById('biliclip-walkthrough'));
 resetTutorialProgress();tutorialSteps=()=>[{title:'填入关联视频',text:'点击填入',target:()=>nativePost,action:'fill'}];
 nativePost.dataset.feedback='';nativePost.onclick=()=>{nativePost.dataset.feedback='error'};openTutorial('library');
 const fillHost=document.getElementById('biliclip-walkthrough'),fillRoot=fillHost.shadowRoot;
 nativePost.click();await new Promise(resolve=>setTimeout(resolve,550));check('failed fill does not celebrate',!fillHost.hasAttribute('data-finishing'));
 nativePost.onclick=()=>{nativePost.dataset.feedback='success'};nativePost.click();await new Promise(resolve=>setTimeout(resolve,550));
 check('successful fill celebrates',fillHost.hasAttribute('data-finishing'));check('congratulation text',fillRoot.querySelector('.celebration h2').textContent==='恭喜，视频已填入！');
 check('confetti respects motion preference',fillRoot.querySelectorAll('.confetti').length===(reduced?0:24));
 if(!reduced)check('confetti is visible',getComputedStyle(fillRoot.querySelector('.confetti')).display!=='none');
 await new Promise(resolve=>setTimeout(resolve,1900));check('celebration auto closes',!fillHost.isConnected);
 // Finish sampled animations for a deterministic still preview after motion assertions.
 for(const element of motionRoot.querySelectorAll('*')) for(const animation of element.getAnimations()) animation.finish();
 document.getElementById('results').textContent=JSON.stringify(checks);document.documentElement.dataset.tests='passed';
 })().catch(error=>{document.documentElement.dataset.tests='failed';document.getElementById('results').textContent=error.stack});
})();'''
s=s.rsplit('})();',1)[0]+tail
html='''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>8.2.0 UI 检查</title><style>body{font:14px system-ui;background:#f6f7f8;color:#18191c}main{margin:28px 28px 0 460px;background:white;border:1px solid #e3e5e7;border-radius:8px;padding:24px;max-width:400px}label{display:block;margin:20px 0}input{padding:10px;border:1px solid #e3e5e7;border-radius:6px;width:90%}#results{position:fixed;bottom:10px;font-size:11px;max-width:90vw}</style><main><h2>个性化卡片 · 关联视频</h2><label>链接<input value="BV1s4y1z7KpQ"></label><label>描述文案<input id="description" value="把灵感变成作品：我的创作记录"></label><p>本页使用脚本真实组件与本地示例数据，不连接 B 站账号。</p></main><pre id="results"></pre><script>window.requestAnimationFrame=callback=>setTimeout(()=>callback(performance.now()),16);window.cancelAnimationFrame=clearTimeout;window.GM_getValue=(k,d)=>d;window.GM_setValue=()=>{};window.GM_registerMenuCommand=()=>{};window.GM_addValueChangeListener=()=>{};</script><script>'''+s.replace('</script','<\\/script')+'</script></html>'
Path('/tmp/biliclip-820-preview.html').write_text(html)
