(() => {
  'use strict';
  const current=document.getElementById('demo-current-tags');
  if(!current)return;
  const presets=document.getElementById('demo-preset-tags'),input=document.getElementById('demo-tag-input'),status=document.getElementById('demo-tag-status');
  let tags=['生活记录','学习','经验分享'],saved=['创作笔记','拍摄技巧','剪辑入门'];
  function render(){
    current.replaceChildren();presets.replaceChildren();
    for(const text of tags){const el=document.createElement('span');el.className='demo-tag';el.textContent=text;current.append(el);}
    saved.forEach((text,index)=>{
      const el=document.createElement('span');el.className='demo-tag';
      const label=document.createElement('span');label.textContent=text;el.append(label);
      const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.setAttribute('aria-label','删除预设标签 '+text);
      remove.addEventListener('click',()=>{saved.splice(index,1);render();status.textContent='已删除「'+text+'」';input.focus();});el.append(remove);presets.append(el);
    });
  }
  input.addEventListener('keydown',event=>{
    if(event.key!=='Enter'||event.isComposing)return;
    event.preventDefault();const text=input.value.trim();if(!text)return;
    if(saved.includes(text)){status.textContent='这条预设已经保存';return;}
    if(saved.length>=10){status.textContent='这组预设最多保存 10 个标签';return;}
    saved.push(text);input.value='';render();status.textContent='已保存「'+text+'」';
  });
  document.getElementById('demo-tag-execute').addEventListener('click',()=>{
    const candidates=saved.filter(text=>!tags.includes(text)),added=candidates.slice(0,10-tags.length);
    tags.push(...added);render();
    status.textContent=added.length?'已添加 '+added.length+' 个标签，还可添加 '+(10-tags.length)+' 个':tags.length===10?'当前稿件标签已满':'没有需要追加的标签';
  });
  document.getElementById('demo-tag-reset').addEventListener('click',()=>{
    tags=['生活记录','学习','经验分享'];saved=['创作笔记','拍摄技巧','剪辑入门'];input.value='';render();status.textContent='还可以添加 7 个标签';
  });
  render();
})();
