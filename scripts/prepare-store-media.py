"""Render current bundled UI with local sample data; no real account data."""
from pathlib import Path
import subprocess,json,base64
r=Path(__file__).resolve().parents[1];out=r/'release/8.2.1/media';out.mkdir(parents=True,exist_ok=True)
source=(r/'biliclip.user.js').read_text()
chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
def shot(html,path,w,h):
 p=Path('/tmp/biliclip-store-shot.html');p.write_text(html)
 subprocess.run([chrome,'--headless','--no-sandbox','--disable-gpu','--hide-scrollbars','--user-data-dir=/tmp/biliclip-store-render','--allow-file-access-from-files',f'--window-size={w},{h}',f'--screenshot={path}','--virtual-time-budget=2500',p.as_uri()],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,check=True)
def page(title,subtitle,body,tail):
 css='''*{box-sizing:border-box}body{margin:0;background:#f6f7f8;color:#18191c;font:14px/1.6 system-ui}header{padding:32px 48px 22px}h1{font-size:32px;margin:0 0 5px}header p{font-size:17px;color:#61666d;margin:0}.stage{margin:0 38px;background:white;border:1px solid #e3e5e7;border-radius:12px;padding:22px 26px;min-height:550px}.bar{color:#61666d;border-bottom:1px solid #e3e5e7;padding-bottom:12px;margin-bottom:20px}.form{width:790px}.form-item{margin:18px 0}.desc-container{display:flex;gap:20px}.section-title-container{width:126px;flex:none}.desc-text-wrp{flex:1;min-width:0}.archive-info-editor,.ql-container{height:92px}textarea{width:100%;height:92px;border:1px solid #ccd0d7;border-radius:6px;padding:10px;font:14px/1.5 system-ui;resize:none}.cards{display:flex;gap:22px;margin:36px 0}.bili-video-card{width:360px}.bili-video-card a{display:block;width:360px;height:203px;border-radius:8px;overflow:hidden}.bili-video-card img{width:100%;height:100%}.bili-video-card h3{font-size:16px;margin:10px 0}.benefits{display:flex;gap:30px;margin-top:45px;color:#61666d;font-size:16px}footer{position:fixed;bottom:18px;left:48px;color:#61666d;font-size:12px}'''
 script=source.replace('ready(startBiliClip);',tail)
 return '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><style>'+css+'</style><header><h1>'+title+'</h1><p>'+subtitle+'</p></header><div class="stage">'+body+'</div><footer>喵贴 BiliClip · 真实组件 / 本地示例数据 · 独立项目，非哔哩哔哩官方产品</footer><script>const values={};window.GM_getValue=(k,d)=>values[k]??d;window.GM_setValue=(k,v)=>values[k]=v;window.GM_registerMenuCommand=()=>{};window.GM_addValueChangeListener=()=>{};</script><script>'+script.replace('</script','<\\/script')+'</script></html>'
cards=''
for i,(title,color) in enumerate([('记录每一次创作','#2183a5'),('把灵感变成作品','#b04876'),('分享我的日常','#577f53')]):
 svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="720" height="406"><rect width="720" height="406" fill="{color}"/><circle cx="590" cy="50" r="180" fill="white" opacity=".08"/><circle cx="80" cy="400" r="200" fill="white" opacity=".08"/><text x="44" y="220" font-size="42" fill="white" font-family="sans-serif">{title}</text></svg>'
 data='data:image/svg+xml;base64,'+base64.b64encode(svg.encode()).decode()
 cards+=f'<div class="bili-video-card"><a id="cover{i}" href="https://www.bilibili.com/video/BV1s4y1z7KpQ/?sample={i}"><img src="{data}" alt="本地示例封面"></a><h3>{title}</h3><span>本地演示视频 · 示例作者</span></div>'
copy=page('喵贴 BiliClip · B站投稿助手','视频信息，一次复制；关联视频，分别填好。','<div class="bar">视频复制 · 真实按钮演示</div><div class="cards">'+cards+'</div><div class="benefits"><span>复制 BV + 标题</span><span>复制标题 + 链接</span><span>到关联输入框手动粘贴，自动分别填入</span></div>',"cardTitle=()=> '记录每一次创作';createBiliUI();ui.active={cover:document.getElementById('cover1'),bv:'BV1s4y1z7KpQ',title:'把灵感变成作品'};positionHover();")
shot(copy,out/'01-copy-1280x800.png',1280,800)
form='''<div class="bar">投稿表单 · 标题与简介预设 / 标签预设</div><div class="form"><div style="margin-bottom:14px">视频标题：把灵感变成作品</div><div id="tags-mount"></div><div class="form-item"><div class="desc-container"><div class="section-title-container">简介</div><div class="desc-text-wrp"><div class="archive-info-editor"><div class="ql-container"><textarea id="description">把灵感变成作品
原有正文保留
欢迎一起交流
本期内容仅供参考</textarea></div></div></div></div></div></div>'''
tail="""isUploadPage=()=>true;findUploadFields=()=>({description:document.getElementById('description'),title:null});uploadPrefs=uploadSettings({presets:['欢迎一起交流','本期内容仅供参考'],selectedIndices:[0,1]});syncDescriptionPresets();GM_setValue(TAG_PRESET_KEY,[['生活记录','学习'],['创作日常']]);tagPresetRow=createTagPresetRow(document);document.getElementById('tags-mount').append(tagPresetRow);syncUploadPanel();const host=document.getElementById('biliclip-upload-panel');host.style.cssText='all:initial;position:fixed;right:50px;top:180px;z-index:2';const root=host.shadowRoot;root.querySelector('.panel').style.width='280px';root.querySelector('.description-dropdown').open=true;"""
shot(page('简介与标签预设，按需选择。','简介支持多选，每条分别追加到末尾新一行；标签预设逐组执行。',form,tail),out/'02-presets-1280x800.png',1280,800)
for i,name in enumerate(['copy','presets'],1):
 src=out/f'{i:02d}-{name}-1280x800.png'
 subprocess.run(['sips','-z','350','560',str(src),'--out',str(out/f'{i:02d}-{name}-560x350.png')],stdout=subprocess.DEVNULL,check=True)
for n in [48,96,128,300]:
 subprocess.run(['sips','-z',str(n),str(n),str(r/'assets/biliclip-logo.png'),'--out',str(out/f'icon-{n}.png')],stdout=subprocess.DEVNULL,check=True)
for w,h,name in [(440,280,'tile-440x280.png'),(1400,560,'tile-1400x560.png')]:
 shot(f'<html lang="zh-CN"><meta charset="utf-8"><style>body{{margin:0;display:grid;place-content:center;text-align:center;height:100vh;background:#f6f7f8;font-family:system-ui;color:#18191c}}img{{width:{w//6}px;margin:auto}}h1{{font-size:{w//16}px;margin:12px}}p{{font-size:{max(15,w//48)}px;margin:4px;color:#61666d}}</style><img src="{(r/"assets/biliclip-logo.png").as_uri()}"><h1>喵贴 BiliClip</h1><p>B站投稿助手</p><p>标题填入 · 简介多选 · 标签预设 · 视频关联</p></html>',out/name,w,h)
print('Rendered current UI store media')

# Actual usage scenes supplied by the author, fitted without distorting proportions.
for index,key,title in [(3,'upload','投稿设置，一处备好'),(4,'description','常用简介，按需填入'),(5,'library','关联视频，分别填好'),(6,'copy','跟着引导，顺手复制')]:
 image=(r/f'assets/screenshots/real-{key}.jpg').as_uri()
 html=f'<html lang="zh-CN"><meta charset="utf-8"><style>*{{box-sizing:border-box}}body{{margin:0;background:#f4f8fb;color:#172b3a;font-family:system-ui}}header{{padding:26px 40px}}h1{{font-size:30px;margin:0 0 4px}}p{{margin:0;color:#5d6d7b;font-size:14px}}figure{{margin:0 32px;background:white;border:1px solid #dfe7ed;border-radius:12px;overflow:hidden;display:flex;align-items:center;justify-content:center;height:600px}}img{{max-width:100%;max-height:100%;object-fit:contain}}footer{{padding:12px 40px;font-size:12px;color:#5d6d7b}}</style><header><h1>喵贴 BiliClip · {title}</h1><p>真实使用场景 · B 站网页版投稿助手</p></header><figure><img src="{image}"></figure><footer>实际场景截图，界面细节以 8.2.1 为准 · 独立项目，非哔哩哔哩官方产品</footer></html>'
 src=out/f'{index:02d}-real-{key}-1280x800.png'
 shot(html,src,1280,800)
 subprocess.run(['sips','-z','350','560',str(src),'--out',str(out/f'{index:02d}-real-{key}-560x350.png')],stdout=subprocess.DEVNULL,check=True)
print('Rendered four actual usage scenes')
