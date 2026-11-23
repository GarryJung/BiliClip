from pathlib import Path
import subprocess,tempfile,re
root=Path(__file__).resolve().parents[1]
for page,w,h in [('index.html',1440,1100),('index.html',500,1100),('tutorial.html',1440,1100)]:
 original=(root/page).read_text()
 head=original[:original.index('</head>')].replace('<head>','<head><base href="'+root.as_uri()+'/">')
 if page=='index.html':
  start=original.index('<section class="container install-section"');end=original.index('<section class="container faq-section"',start)
  content=original[start:end]
 else:
  start=original.index('<article class="doc-article',original.index('data-article="install"')-100) if False else original.rfind('<article',0,original.index('data-article="install"'))
  end=original.index('</article>',start)+10;content=original[start:end]
 html=head+'<style>body{padding:30px 0}.js .doc-article{display:block!important}.doc-article{max-width:1000px;margin:auto;padding:20px}.reveal-ready{opacity:1}</style></head><body><main>'+content+'</main></body></html>'
 html=html.replace('</body>','''<script>window.addEventListener('load',()=>setTimeout(()=>{const cards=[...document.querySelectorAll('[data-install-browser]')];const selector=document.querySelector('[data-browser-select]');let manualWorks=!!selector;if(selector){for(const browser of ['dia','comet']){selector.value=browser;selector.dispatchEvent(new Event('change'));const card=document.querySelector('[data-install-browser='+browser+']');manualWorks=manualWorks&&card.classList.contains('current-browser')&&card.querySelector('.current-browser-badge').textContent==='已选择';}selector.value='';selector.dispatchEvent(new Event('change'));manualWorks=manualWorks&&!document.querySelector('[data-install-browser=chrome]').classList.contains('current-browser');}const good=manualWorks&&cards.length===8&&cards.every(c=>c.querySelector('.store-meta'))&&document.documentElement.scrollWidth<=innerWidth;document.body.dataset.previewPassed=String(good);const target=document.getElementById('install');},150));</script></body>''')
 p=Path('/tmp/biliclip-site-preview.html');p.write_text(html)
 out=root/f'tests/previews/site-{page.split(".")[0]}-{w}.png'
 r=subprocess.run(['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','--headless','--no-sandbox','--disable-gpu','--hide-scrollbars','--user-data-dir=/tmp/biliclip-site-review',f'--window-size={w},{h}','--virtual-time-budget=2000','--dump-dom',f'--screenshot={out}',p.as_uri()],capture_output=True,text=True)
 if 'data-preview-passed="true"' not in r.stdout:
  Path('/tmp/biliclip-site-failed.html').write_text(r.stdout);raise RuntimeError(f'{page} {w}: layout/content check failed')
 print(page,w,'passed')
