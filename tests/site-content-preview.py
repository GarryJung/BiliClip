from pathlib import Path
import subprocess
root=Path(__file__).resolve().parents[1]
checks=r'''
window.addEventListener('load',()=>setTimeout(()=>{try{
const assert=(v,m)=>{if(!v)throw Error(m)};
const demo=document.querySelector('[data-description-demo]');
assert(demo,'current description demo exists');
const text=demo.querySelector('textarea'),title=demo.querySelector('[data-demo-copy-title]');
const choices=[...demo.querySelectorAll('[data-demo-description-choice]')];
text.value='原首行\n原正文';title.checked=true;choices.forEach(c=>c.checked=true);
demo.querySelector('[data-demo-execute]').click();
assert(text.value==='把灵感变成作品\n原正文\n欢迎在评论区交流\n本期内容仅供参考','multiline append preserves body and changes first line');
demo.querySelector('[data-demo-clear]').click();title.checked=false;const saved=text.value;demo.querySelector('[data-demo-execute]').click();assert(text.value===saved,'no selection leaves description unchanged');
demo.querySelector('[data-demo-reset]').click();
const tags=document.querySelector('[data-tags-demo]');tags.querySelector('[data-demo-add-tags]').click();assert(tags.querySelector('[data-demo-tags-status]').textContent.includes('跳过已有'),'tag duplicate behavior');
if(document.querySelector('.doc-article')){
 assert(document.getElementById('description') && document.getElementById('menu'),'new doc sections exist');
 for(const link of document.querySelectorAll('[data-doc-link]'))assert(document.getElementById(link.dataset.docLink),'sidebar link resolves');
 location.hash='description';
 setTimeout(()=>{try{assert(document.getElementById('description').classList.contains('active'),'description navigation');assert(document.querySelectorAll('[data-doc-toc] a').length===4,'description TOC');document.body.dataset.contentPassed='true';}catch(e){document.body.dataset.contentError=e.message}},150);
}else document.body.dataset.contentPassed='true';
}catch(e){document.body.dataset.contentError=e.message}},100));
'''
for page,w,h in [('index.html',1440,1100),('index.html',500,1100),('tutorial.html',1440,1100)]:
 html=(root/page).read_text().replace('<head>','<head><base href="'+root.as_uri()+'/">')
 html=html.replace('</body>','<script>'+checks+'</script></body>')
 p=Path('/tmp/biliclip-content-preview.html');p.write_text(html)
 out=root/f'tests/previews/content-{page.split(".")[0]}-{w}.png'
 r=subprocess.run(['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','--headless','--no-sandbox','--disable-gpu','--hide-scrollbars','--user-data-dir=/tmp/biliclip-content-review',f'--window-size={w},{h}','--virtual-time-budget=2200','--dump-dom',f'--screenshot={out}',p.as_uri()],capture_output=True,text=True)
 Path('/tmp/biliclip-content-dom.html').write_text(r.stdout)
 if 'data-content-passed="true"' not in r.stdout:
  import re
  raise RuntimeError(str(re.findall('data-content-error="([^"]*)"',r.stdout))+f' {page} {w}')
 print(page,w,'content checks passed')
