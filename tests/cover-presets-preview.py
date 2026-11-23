from pathlib import Path
root=Path(__file__).resolve().parents[1]
s=(root/'biliclip.user.js').read_text()
tail=r'''
(async()=>{
 const checks=[]; const check=(name,ok)=>{checks.push([name,!!ok]);if(!ok)throw Error(name)};
 isUploadPage=()=>true;
 const editor=document.getElementById('description');
 findUploadFields=()=>({description:editor,title:null});
 syncDescriptionPresets();
 const r=descriptionPresetRow.shadowRoot;
 for(let i=0;i<12;i++)r.getElementById('add').click();
 check('ten presets maximum',r.querySelectorAll('.entry').length===10 && r.getElementById('add').disabled);
 const input=r.querySelector('input');input.value='测试简介预设';input.dispatchEvent(new Event('input'));
 r.querySelector('[aria-label="填入预设1"]').click();
 check('preserve first and third lines',editor.value==='第一行\n旧第二行\n第三行\n测试简介预设');
 check('selected preset persists',uploadPrefs.secondLine==='测试简介预设');
 const presetBounds=descriptionPresetRow.getBoundingClientRect();
 check('presets outside fixed-height editor',descriptionPresetRow.parentElement.classList.contains('form'));
 check('following form rows do not overlap',document.getElementById('next-row').getBoundingClientRect().top >= presetBounds.bottom);
 check('preset field aligns with editor',Math.abs(r.querySelector('#entries').getBoundingClientRect().left-editor.getBoundingClientRect().left)<2);
 check('preset uses requested red',getComputedStyle(r.querySelector('.entry button')).color==='rgb(255, 102, 153)');
 createBiliUI();
 for(const width of [160,238,268,500]){
  const a=document.getElementById('cover');a.style.width=width+'px';
  ui.active={cover:a,bv:'BV1s4y1z7KpQ',title:'测试视频'};ui.hoverActions.style.display='flex';positionHover();
  const rect=a.getBoundingClientRect(),box=ui.hoverActions.getBoundingClientRect();
  check('equal cover margins '+width,Math.abs(box.left-rect.left-8)<1 && Math.abs(rect.right-box.right-8)<1);
  check('labels fit '+width,[...ui.hoverActions.querySelectorAll('.action-label')].every(label=>label.scrollWidth<=label.clientWidth+1));
  check('single row '+width,Math.abs(ui.hoverActions.querySelectorAll('button')[0].getBoundingClientRect().top-ui.hoverActions.querySelectorAll('button')[1].getBoundingClientRect().top)<1);
  check('buttons stay inside '+width,[...ui.hoverActions.querySelectorAll('button')].every(b=>{const q=b.getBoundingClientRect();return q.left>=rect.left+7 && q.right<=rect.right-7 && q.bottom<=rect.bottom}));
 }
 const nav=document.getElementById('nav-cover');const rect=nav.getBoundingClientRect();
 check('header popover excluded',findCover(rect.left+20,rect.top+20)===null);
 const coverRect=document.getElementById('cover').getBoundingClientRect();
 const overlay=document.createElement('div');overlay.className='history-panel-popover';overlay.style.cssText=`position:fixed;z-index:2147483647;left:${coverRect.left}px;top:${coverRect.top}px;width:150px;height:80px;background:#ffffff88`;document.body.append(overlay);
 check('no fallthrough to background cover',findCover(coverRect.left+30,coverRect.top+30)===null);
 overlay.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:coverRect.left+30,clientY:coverRect.top+30}));
 check('old hover overlay is cleared',ui.active===null && ui.hoverActions.style.display==='none');overlay.remove();
 ui.active={cover:document.getElementById('cover'),bv:'BV1s4y1z7KpQ',title:'测试视频'};positionHover();
 saveDescriptionPresets(['测试简介预设','第二条常用简介'],0);descriptionPresetRow.refresh();
 syncUploadPanel();
 const panel=document.getElementById('biliclip-upload-panel').shadowRoot;
 const choices=()=>[...panel.querySelectorAll('#preset input')];
 check('panel has one checkbox per preset',choices().length===2);
 const dropdown=panel.querySelector('.description-dropdown');
 check('dropdown initially closed',!dropdown.open);dropdown.querySelector('summary').click();check('dropdown opens',dropdown.open);
 choices()[1].click();
 check('multiple presets combined in order',uploadPrefs.secondLine==='测试简介预设\n第二条常用简介');
 choices()[0].click();choices()[1].click();
 check('can deselect all presets',uploadPrefs.selectedIndices.length===0 && uploadPrefs.secondLine==='');
 saveDescriptionPresets([...uploadPrefs.presets,'第三条简介'],[]);
 check('new preset adds panel choice immediately',choices().length===3);
 choices()[1].click();choices()[2].click();
 descriptionPresetRow.refresh();
 descriptionPresetRow.shadowRoot.querySelector('[aria-label="删除简介预设1"]').click();
 check('delete remaps multi selection without changing texts',uploadPrefs.secondLine==='第二条常用简介\n第三条简介' && uploadPrefs.selectedIndices.join(',')==='0,1');
 check('deleted preset removes panel choice immediately',choices().length===2);
 document.getElementById('biliclip-upload-panel').style.zIndex='100';
 const titleInput=document.createElement('input');titleInput.value='新标题';
 findUploadFields=()=>({description:editor,title:titleInput});
 applyDeclaration=async()=>true;applyKnowledge=async()=>true;
 await panel.getElementById('execute').onclick();
 check('execute appends each selection as a final line',editor.value==='新标题\n旧第二行\n第三行\n测试简介预设\n第二条常用简介\n第三条简介');
 check('completion toast shown',document.getElementById('biliclip-toast-host').shadowRoot.querySelector('.toast-message').textContent.includes('已执行完成'));
 const toastBox=document.getElementById('biliclip-toast-host').shadowRoot.querySelector('.toast');
 check('description toast is high and centered',parseFloat(toastBox.style.top)<=160 && Math.abs(parseFloat(toastBox.style.left)-document.documentElement.clientWidth/2)<1);
 GM_setValue(TAG_PRESET_KEY,[['测试标签']]);
 tagPresetRow=createTagPresetRow(document);document.querySelector('.form').append(tagPresetRow);
 const tagRoot=tagPresetRow.shadowRoot, entry=tagRoot.querySelector('.entry');
 const guide=tutorialSteps('workbench');
 const tagGuide=guide.filter(step=>['输入预设标签','执行标签预设','增加标签预设'].includes(step.title));
 check('tag guide uses precise distinct targets',tagGuide.length===3 && tagGuide[0].target()===tagRoot.querySelector('.tags') && tagGuide[1].target()===tagRoot.querySelector('.execute') && tagGuide[2].target()===tagRoot.querySelector('.add'));
 applyTagPreset=async(row,tags,report)=>{report('已添加 '+tags.length+' 个标签');return {completed:true,added:tags.length}};
 tagRoot.querySelector('.execute').click();await new Promise(resolve=>setTimeout(resolve,0));
 check('tag completion toast shown',toastBox.querySelector('.toast-message').textContent.includes('标签预设执行完成'));
 const entryRect=entry.getBoundingClientRect(),toastRect=toastBox.getBoundingClientRect();
 check('tag toast centers above its row',Math.abs(parseFloat(toastBox.style.left)-(entryRect.left+entryRect.width/2))<2 && parseFloat(toastBox.style.top)+toastBox.offsetHeight<=entryRect.top-19);
 tagPresetRow.remove();
 toast('简介预设已追加完成','blue',10000,null,'upper-center');
 
 panel.querySelector('.preset-clear').click();check('dropdown clear allows no selection',uploadPrefs.selectedIndices.length===0 && panel.querySelector('#preset-summary').textContent==='不使用简介预设');
 dropdown.querySelector('summary').click();
 
 document.getElementById('results').textContent=JSON.stringify(checks);document.body.dataset.passed='true';
})().catch(error=>{document.getElementById('results').textContent='FAILED: '+error.stack;});
'''
s=s.replace('ready(startBiliClip);',tail)
html='''<!doctype html><meta charset="utf-8"><style>body{font:14px system-ui;margin:24px;background:#f6f7f8}.ql-container{max-width:900px}textarea{width:100%;height:158px;box-sizing:border-box}.form{max-width:1100px}.form-item{display:block;margin:18px 0}.desc-container{display:flex;gap:20px}.section-title-container{width:126px;flex:none}.desc-text-wrp{flex:1;min-width:0}.archive-info-editor{height:160px}.ql-container{height:160px}#next-row{padding:16px;background:white}#cover{display:block;position:relative;margin-top:30px;height:180px;background:#d1e9f0;border-radius:8px}#cover img{width:100%;height:100%}header{margin:20px}header a{display:block;width:200px;height:110px}#results{white-space:pre-wrap}</style><div class="form"><div class="form-item"><div class="desc-container"><div class="section-title-container"><h3>简介</h3></div><div class="desc-text-wrp"><div class="archive-info-editor" style="height:160px"><div class="ql-container"><textarea id="description">第一行\n旧第二行\n第三行</textarea></div></div></div></div></div><div class="form-item" id="next-row">定时发布（原表单下一行）</div></div><a id="cover" href="https://www.bilibili.com/video/BV1s4y1z7KpQ/"><img alt="封面占位"></a><header><a id="nav-cover" href="https://www.bilibili.com/video/BV1s4y1z7KpQ/"><img alt="导航浮层测试"></a></header><pre id="results"></pre><script>const values={};window.GM_getValue=(k,d)=>values[k]??d;window.GM_setValue=(k,v)=>values[k]=v;window.GM_registerMenuCommand=()=>{};window.GM_addValueChangeListener=()=>{};</script><script>'''+s.replace('</script','<\\/script')+'</script>'
Path('/tmp/biliclip-cover-presets.html').write_text(html)
