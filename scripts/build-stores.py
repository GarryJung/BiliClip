"""Reproducible, dependency-free store builds. No signing keys are created."""
import json, os, shutil, subprocess, zipfile, hashlib, argparse, re
parser=argparse.ArgumentParser()
parser.add_argument("--channel", choices=["chrome","edge","firefox","360"])
args=parser.parse_args()
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'release/8.2.1'
OUT.mkdir(parents=True,exist_ok=True)
manifest=dict(manifest_version=3,name='喵贴 BiliClip - B站投稿助手',version='8.2.1',description='标题填入、简介多选预设、标签预设与关联视频填充，让 B 站投稿少一点重复。',homepage_url='https://bv.lcat.cc/',permissions=['storage','clipboardWrite'],host_permissions=['https://api.bilibili.com/*'],icons={str(n):f'icons/{n}.png' for n in (16,32,48,96,128)},action={'default_popup':'popup.html','default_title':'喵贴 BiliClip'},content_scripts=[dict(matches=['http://*/*','https://*/*'],js=['content.js'],run_at='document_start',all_frames=True)])
identities=json.loads((ROOT/'extension/store-identities.json').read_text())
firefox_id=os.environ.get('BILICLIP_FIREFOX_ID') or identities['firefox']['id']
script=(ROOT/'biliclip.user.js').read_text()
content=(ROOT/'extension/bridge.js').read_text().replace('/* USER_SCRIPT */',script)
for channel in ([args.channel] if args.channel else ['chrome','edge','firefox','360']):
    dest=OUT/channel
    if dest.exists(): shutil.rmtree(dest)
    dest.mkdir(exist_ok=True)
    m=json.loads(json.dumps(manifest))
    if channel=='firefox':
        # Use the existing ID verified from the official signed AMO package.
        gecko={'strict_min_version':'140.0','data_collection_permissions':{'required':['none']}}
        if firefox_id: gecko['id']=firefox_id
        m['browser_specific_settings']={'gecko':gecko}
        m['background']={'scripts':['background.js']}
    else: m['background']={'service_worker':'background.js'}
    if channel=='360': m['update_url']='http://upext.chrome.360.cn/intf.php?method=ExtUpdate.query'
    (dest/'manifest.json').write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
    (dest/'content.js').write_text(content)
    for f in ['background.js','popup.html','popup.js','popup.css']: shutil.copyfile(ROOT/'extension'/f,dest/f)
    (dest/'icons').mkdir(exist_ok=True)
    for n in [16,32,48,96,128]:
        subprocess.run(['sips','-z',str(n),str(n),str(ROOT/'assets/biliclip-logo.png'),'--out',str(dest/f'icons/{n}.png')],check=True,stdout=subprocess.DEVNULL)
    suffix='-preview' if channel=='firefox' and not firefox_id else ''
    target=OUT/f'biliclip-8.2.1-{channel}{suffix}.zip'
    with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as z:
        for p in sorted(dest.rglob('*')):
            if p.is_file():
                info=zipfile.ZipInfo(p.relative_to(dest).as_posix(),(2026,11,23,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED
                z.writestr(info,p.read_bytes())
    print(target.name)
with zipfile.ZipFile(OUT/'biliclip-8.2.1-source.zip','w',zipfile.ZIP_DEFLATED) as z:
    for p in [ROOT/'biliclip.user.js',*sorted((ROOT/'extension').glob('*')),ROOT/'scripts/build-stores.py',ROOT/'scripts/prepare-store-media.py',ROOT/'scripts/organize-store-release.py',ROOT/'tests/store-adapter.cjs',ROOT/'tests/popup-menu.cjs',ROOT/'tests/8.2.1-description.cjs',ROOT/'tests/8.2.1-chrome-install.cjs',ROOT/'tests/8.2.1-tag-keyboard.cjs',ROOT/'assets/biliclip-logo.png']:
        z.write(p,p.relative_to(ROOT))
(OUT/'源文件SHA256.txt').write_text(hashlib.sha256((ROOT/'biliclip.user.js').read_bytes()).hexdigest()+'  biliclip.user.js\n')
(OUT/'SHA256SUMS.txt').write_text(''.join(f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.name}\n' for p in sorted(OUT.glob('*.zip'))))
