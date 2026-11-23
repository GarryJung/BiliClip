"""Run after build-stores.py and prepare-store-media.py."""
from pathlib import Path
import shutil,zipfile,hashlib
ROOT=Path(__file__).resolve().parents[1]
r=ROOT/'release/8.2.0'; dest=r/'提交资料';dest.mkdir(exist_ok=True)
channels={'Chrome':('chrome','biliclip-8.2.0-chrome.zip',['icon-128.png','tile-440x280.png','tile-1400x560.png','01-copy-1280x800.png','02-presets-1280x800.png']), 'Edge':('edge','biliclip-8.2.0-edge.zip',['icon-300.png','tile-440x280.png','tile-1400x560.png','01-copy-1280x800.png','02-presets-1280x800.png']), 'Firefox':('firefox','biliclip-8.2.0-firefox-preview.zip',['icon-128.png','01-copy-1280x800.png','02-presets-1280x800.png']), '360':('360','biliclip-8.2.0-360.zip',['icon-48.png','icon-96.png','01-copy-560x350.png','02-presets-560x350.png'])}
notes={'Chrome':'上传本目录 ZIP 到 Chrome Web Store 开发者后台。离线安装版在同级 Chrome离线版 文件夹。','Edge':'在现有 Edge 商品后台更新 ZIP，沿用原商品身份。','Firefox':'此 ZIP 仅预览，缺少原 AMO 扩展 ID，不能直接提交。设置 BILICLIP_FIREFOX_ID 后重建，再替换本目录候选包。','360':'此 ZIP 是扩展源文件，不是最终上传包。须用原私钥生成 CRX，再将 CRX、功能说明.txt、图标和效果图一起打包上传。'}
for name,(channel,package,images) in channels.items():
 d=dest/name;d.mkdir(exist_ok=True)
 shutil.copy2(r/package,d/package)
 for text in ['商店介绍.txt','上架说明.md','验证记录.md']:shutil.copy2(r/text,d/text)
 (d/'图片').mkdir(exist_ok=True)
 for image in images:shutil.copy2(r/'media'/image,d/'图片'/image)
 if name=='360':shutil.copy2(r/'360功能说明.txt',d/'功能说明.txt')
 (d/'先读我.txt').write_text(notes[name]+'\n\n各候选包仍需真实浏览器测试。权限问卷及审核步骤见上架说明.md。\n',encoding='utf-8')
offline=dest/'Chrome离线版';offline.mkdir(exist_ok=True)
readme='''喵贴 BiliClip 8.2.0 · Chrome 离线安装版（候选）

1. 将 ZIP 完整解压到准备长期保留的文件夹。
2. 在 Chrome 地址栏输入 chrome://extensions 并回车。
3. 打开右上角“开发者模式”。
4. 点击“加载已解压的扩展程序”，选择内含 manifest.json 的 biliclip 文件夹。
5. 关闭其他喵贴扩展或油猴脚本，刷新已打开的 B 站页面。
6. 点击浏览器拼图图标，可将喵贴固定到工具栏。

不要把 ZIP 直接拖到扩展管理页；应先解压后选择 biliclip 文件夹。
不要删除安装目录，Chrome 从该目录读取扩展。
离线版无需脚本管理器；运行 B 站功能仍需联网，视频库等功能需登录 B 站。
离线版不通过商店自动更新。更新时退出相关页面，以新文件覆盖同一目录，
在扩展管理页面点击喵贴的重新加载，再刷新 B 站。保留目录路径以维持本地扩展身份。
卸载会清除扩展存储，卸载前请自行记录需要保留的预设。

此包为本地开发者模式安装包，尚未完成四浏览器真实环境测试，未获商店审核。
Chrome 如由组织管理并限制开发者模式，请联系管理员；本包不修改安全策略。

官网：https://bv.lcat.cc/
隐私：https://bv.lcat.cc/privacy.html
反馈：https://github.com/GarryJung/BiliClip/issues
安装依据：https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked
'''
(offline/'安装说明.txt').write_text(readme)
shutil.copytree(r/'chrome',offline/'biliclip',dirs_exist_ok=True)
package=offline/'BiliClip-8.2.0-Chrome-offline.zip'
with zipfile.ZipFile(package,'w',zipfile.ZIP_DEFLATED) as z:
 z.write(offline/'安装说明.txt','安装说明.txt')
 for p in sorted((offline/'biliclip').rglob('*')):
  if p.is_file():z.write(p,p.relative_to(offline))
(offline/'SHA256SUMS.txt').write_text(hashlib.sha256(package.read_bytes()).hexdigest()+'  '+package.name+'\n')
common=dest/'通用资料';common.mkdir(exist_ok=True)
for f in ['biliclip-8.2.0-source.zip','上架说明.md','验证记录.md']:shutil.copy2(r/f,common/f)
(dest/'目录说明.txt').write_text('Chrome/、Edge/、Firefox/、360/：各商店专属 ZIP、文案、图片及说明。\nChrome离线版/：可下载 ZIP、解压后的 biliclip/ 与安装说明。\n通用资料/：源码及验证记录。\nFirefox 缺原扩展 ID；360 缺原私钥签名 CRX。\n')
downloads=ROOT/'downloads';downloads.mkdir(exist_ok=True)
shutil.copy2(package,downloads/package.name)
shutil.copy2(offline/'安装说明.txt',downloads/'Chrome离线安装说明.txt')
with zipfile.ZipFile(ROOT/'release/BiliClip-8.2.0-按浏览器分类.zip','w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(dest.rglob('*')):
  if p.is_file():z.write(p,p.relative_to(dest))
print(dest)
print(package)
