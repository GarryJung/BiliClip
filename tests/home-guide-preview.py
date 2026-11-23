from pathlib import Path
import subprocess,threading,tempfile,http.server,functools
root=Path(__file__).resolve().parents[1]
s=(root/'biliclip.user.js').read_text()
tail=r'''
(async()=>{
const checks=[];const check=(name,ok)=>{checks.push([name,!!ok]);if(!ok)throw Error(name)};
cardTitle=()=>'本地测试视频';createBiliUI();pinHomeGuideCover();
check('middle recommendation selected',ui.tutorialCover.id==='middle');
ui.active=null;ui.hoverActions.style.display='none';
document.querySelector('header a').dispatchEvent(new PointerEvent('pointermove',{bubbles:true}));
check('navigation pointer preserves pinned buttons',ui.active?.cover===ui.tutorialCover && ui.hoverActions.style.display==='flex');
check('guide starts with visible controls',tryOpenTutorial('copy'));
await new Promise(resolve=>setTimeout(resolve,100));
const guide=document.getElementById('biliclip-walkthrough').shadowRoot;
const button=ui.hoverActions.querySelector('[data-action=both]'),r=button.getBoundingClientRect();
const ring=guide.querySelector('.ring').getBoundingClientRect();
check('highlight surrounds actual blue button',ring.width>=r.width && ring.height>=r.height && ring.left<=r.left && ring.right>=r.right && Math.abs(ring.top-r.top)<10);
ui.active=null;ui.hoverActions.style.display='none';
await new Promise(resolve=>setTimeout(resolve,100));
check('guide follow restores missing controls',ui.active?.cover===ui.tutorialCover && ui.hoverActions.style.display==='flex');
check('guide no longer waits for missing controls',!guide.textContent.includes('等待操作控件出现') || guide.querySelector('.status').textContent!=='等待操作控件出现');
writeClipboard=async()=>{};
button.click();await new Promise(resolve=>setTimeout(resolve,700));
check('clicking blue copy advances the guide',guide.querySelector('h2').textContent==='复制标题和链接');
document.body.dataset.passed='true';document.getElementById('results').textContent=JSON.stringify(checks);
})().catch(error=>document.getElementById('results').textContent='FAILED: '+error.stack);
'''
s=s.replace('ready(startBiliClip);',tail)
html='''<!doctype html><meta charset="utf-8"><style>body{font:14px system-ui;background:#fafbfc;margin:24px}header{height:170px;background:#eee;padding:20px}main{display:flex;gap:20px;margin-top:25px}.bili-video-card{width:290px}main a{display:block;width:290px;height:170px;background:linear-gradient(125deg,#418cb0,#e5d2b0);border-radius:8px}img{width:100%;height:100%}#results{position:fixed;bottom:12px;white-space:pre-wrap;font-size:11px}</style><header><a href="https://www.bilibili.com/video/BV1s4y1z7KpQ/">导航历史收藏动态（排除区域）</a></header><main>'''+''.join(f'<div class="bili-video-card"><a id="{id}" href="https://www.bilibili.com/video/{bv}/"><img alt="本地示例封面"></a><h3>示例视频 · {id}</h3></div>' for id,bv in [('left','BV1s4y1z7KpQ'),('middle','BV1dK411t7zS'),('right','BV1Mc4q6HEuk')])+'''</main><pre id="results"></pre><script>window.requestAnimationFrame=fn=>setTimeout(()=>fn(performance.now()),16);window.cancelAnimationFrame=clearTimeout;const values={};window.GM_getValue=(k,d)=>values[k]??d;window.GM_setValue=(k,v)=>values[k]=v;window.GM_registerMenuCommand=()=>{};window.GM_addValueChangeListener=()=>{};</script><script>'''+s.replace('</script','<\\/script')+'</script>'
dest=Path(tempfile.mkdtemp(prefix='biliclip-home-guide-'));(dest/'index.html').write_text(html)
class Handler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(dest)))
threading.Thread(target=server.serve_forever,daemon=True).start()
try:
 result=subprocess.run(['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','--headless','--no-sandbox','--disable-gpu','--hide-scrollbars','--user-data-dir=/tmp/biliclip-home-guide-browser','--window-size=1200,850','--virtual-time-budget=2000','--dump-dom','--screenshot='+str(root/'tests/previews/home-guide-fix.png'),f'http://127.0.0.1:{server.server_port}/'],capture_output=True,text=True)
 Path('/tmp/biliclip-home-guide-dom.html').write_text(result.stdout)
 if 'data-passed="true"' not in result.stdout:
  import re
  print(re.findall(r'<pre id="results">([\s\S]*?)</pre>',result.stdout)[:1]);raise SystemExit(1)
 print('Home guide browser checks passed: visible buttons, navigation pointer, highlight geometry and active-state recovery')
finally:server.shutdown()
