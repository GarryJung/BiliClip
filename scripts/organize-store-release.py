"""Organize the 8.2.1 build and media into separate store submission folders."""
from pathlib import Path
import shutil,zipfile,hashlib,json
ROOT=Path(__file__).resolve().parents[1]
r=ROOT/'release/8.2.1';dest=r/'提交资料';dest.mkdir(exist_ok=True)
version='8.2.1'
summary='标题填入、简介多选预设、标签预设与关联视频填充，让 B 站投稿少一点重复。'
intro='''喵贴 BiliClip - B站投稿助手
版本：8.2.1
简述：标题填入、简介多选预设、标签预设与关联视频填充，让 B 站投稿少一点重复。
分类建议：生产力 / 工具；语言：简体中文；费用：免费。

喵贴帮助 B 站创作者减少复制视频信息、填写简介、添加标签和关联视频时的重复操作。

视频复制：封面蓝色按钮复制 BV + 标题，粉红色按钮复制标题 + 链接；详情页支持分别复制。到关联表单粘贴时可分别写入链接和描述。
简介预设：最多 10 条，多选或不选；默认逐条追加到末尾，也可将标题写入首行。8.2.1 新增「复写第二行」，默认关闭，开启时从第二行写入预设并保留后续正文，无预设不改写。重复追加不会去重，请核对。
标签预设：最多 10 组，每组最多 10 个标签，回车保存，逐组独立执行，按剩余名额添加。投稿助手的一键执行不包含标签组。
投稿助手：按用户选择辅助填写简介、声明、分区等选项，最终投稿由用户核对后手动提交。
关联视频库：登录 B 站后搜索本人已发布视频与合集，分别填入视频链接与描述。
实操引导：跟随实际控件提示，可跳过或重新开始。

首次安装打开 https://bv.lcat.cc/welcome.html；普通更新、重载不会自动打开。欢迎页需要网络，不向官网附加账号或安装标识参数。
安装或更新后刷新 B 站页面，扩展版与油猴版选择一种启用。
本地保存预设、配置、引导记录与视频库缓存。不接入开发者广告、统计或追踪服务。仅在 HTTPS B 站页面及编辑器框架运行；粘贴时核对实际文本，避免误填旧视频信息。部分请求使用原有 B 站登录态访问 B 站接口。
独立开发项目，非哔哩哔哩官方产品，适用于桌面 B 站网页版。

官网：https://bv.lcat.cc/
教程：https://bv.lcat.cc/tutorial.html
隐私：https://bv.lcat.cc/privacy.html
反馈：https://github.com/GarryJung/BiliClip/issues
联系：i@lcat.cc
'''
updates='''8.2.1 更新说明
- 权限修订：仅在 HTTPS B 站页面及编辑器框架运行，移除所有网站匹配；粘贴时核对实际文本。
- 首次安装直接打开官网欢迎页 https://bv.lcat.cc/welcome.html；后续更新和重载不弹出。
- 面板初始高度随浏览器可用高度设置，并补充拖动边缘缩放引导。
- 简介预设新增「复写第二行」，默认关闭；无预设不改写。
- 工具栏菜单分组，改善引导入口、悬停与键盘焦点。
'''
privacy='''# 权限与隐私问卷参考

单一用途：辅助 B 站投稿，提供视频信息复制、预设填写与关联视频选择。

- storage：本地保存配置、预设、待填入任务、引导记录、面板位置及视频库缓存。
- clipboardWrite：用户点击按钮时写入视频信息。不申请 clipboardRead，不后台读取系统剪贴板；用户粘贴时处理粘贴事件中的文本。
- HTTPS B 站内容脚本与 iframe：仅匹配 https://*.bilibili.com/*，提供复制按钮、投稿助手及关联视频填入。粘贴时核对实际文本，不在其他网站注入脚本或监听复制。
- api.bilibili.com：只读标题和合集接口；本人稿件通过 B 站页面及接口读取，可能携带现有 B 站登录凭据。封面图片按 B 站返回地址加载。
- 首次安装会打开官网欢迎页，浏览器会产生普通网站访问请求；扩展不会附加账号、扩展 ID 或安装追踪参数。官网页面不加载扩展中的远程代码。
- 无广告、开发者统计或追踪服务，不向开发者服务器上传预设、视频库或账号数据。
- 所有扩展运行代码随包提供，没有动态下载执行远程 JS、eval 或混淆。

Firefox 的 required:none 表示没有开发者收集端。提交者仍应按 AMO 对实际请求的分类，说明与 B 站原服务交互、本地处理和用户主动操作。不得以“没有开发者服务器”为由隐瞒数据处理。

最终以后台问卷的定义和实际包的行为填写，不将本说明当成已通过审核的结论。
'''
validation='''# 验证记录

构建日期：2026-11-23；版本：8.2.1。

已通过本地自动化检查：
- 四浏览器 background.js：fresh install 打开官网欢迎页；update、chrome_update、shared_module_update 不打开；没有打包遗留的 welcome.html。
- 简介首行/第二行、追加预设、正文保留、空选择与持久化。
- 标签预设删除键、回车、输入法和长按处理。
- 后台 API 地址/路径/发送者限制、存储和跨标签页同步。
- 工具栏菜单派发、更新状态和不支持场景。
- 包内版本、必需文件、Firefox 原 ID、ZIP 完整性、校验和与图片尺寸。

尚未完成：四浏览器真实账号端到端验收、Firefox web-ext lint 与 AMO 签名、360 原私钥签名与后台 MV3 接受情况。当前环境只有 Chrome，不能把静态/模拟检查当成其余浏览器实测。

手动验收：安装后欢迎页 URL 正确；更新不弹欢迎页；刷新 B 站后按钮不重复；复制内容正确；简介复写及追加符合设置；标签独立执行；视频库搜索、合集、分页与双字段填入；重启后设置保留。验收过程中不提交测试稿件。

现有截图包含当前代码组件演示及作者提供的真实场景，真实场景的旧界面细节以 8.2.1 实际版本为准。
'''
notes={
'Chrome':('chrome','ZIP 根目录为 manifest.json，上传 Chrome Web Store 开发者后台。离线调试使用「解压调试」目录，或本目录「离线安装」中的带说明 ZIP。'),
'Edge':('edge','在现有 Edge 商品后台上传本目录 ZIP，沿用原商品身份。未向商店执行提交。'),
'Firefox':('firefox','使用原 AMO ID biliclip@bv.lcat.cc。ZIP 可作为更新候选提交 AMO，仍需后台检查与签名；未签名 ZIP 不能当作正式可安装 XPI。临时调试从 about:debugging 加载 manifest.json。'),
'360':('360','安装包 ZIP 是生成 CRX 的源文件输入，不是已签名最终上传包。必须使用原商品对应私钥生成 CRX，保持商品 ID dgigoaikkdcenigcnaeimgnfinocefkd，再按后台要求连同功能说明与图片打包。没有生成或收集私钥，也未伪造 CRX。')}
actual=[f'{i:02d}-real-{key}' for i,key in [(3,'upload'),(4,'description'),(5,'library'),(6,'copy')]]
for name,(channel,note) in notes.items():
 d=dest/name
 if d.exists():shutil.rmtree(d)
 (d/'安装包').mkdir(parents=True);(d/'图片').mkdir();(d/'文案').mkdir()
 package=r/f'biliclip-{version}-{channel}.zip';shutil.copy2(package,d/'安装包'/package.name)
 shutil.copytree(r/channel,d/'解压调试')
 images=([f'{key}-560x350.png' for key in actual]+['icon-48.png','icon-96.png']) if name=='360' else ([f'{key}-1280x800.png' for key in actual]+['icon-128.png'])
 if name in ['Chrome','Edge']:images+=['tile-440x280.png','tile-1400x560.png']
 if name=='Edge':images+=['icon-300.png']
 for image in images:shutil.copy2(r/'media'/image,d/'图片'/image)
 (d/'文案/商店介绍.txt').write_text(intro)
 (d/'文案/版本更新.txt').write_text(updates)
 (d/'文案/权限与隐私.md').write_text(privacy)
 (d/'验证记录.md').write_text(validation)
 (d/'先读我.md').write_text(f'''# {name} · 喵贴 BiliClip {version}

{note}

## 文件

- 安装包：当前渠道 ZIP，manifest.json 位于 ZIP 根目录。
- 解压调试：与 ZIP 完全对应的文件；本目录不是另一个版本。
- 图片：本渠道尺寸的图标、四张实际场景及适用宣传图。
- 文案：商店介绍、更新说明、权限问卷参考。
- 验证记录：已检查项目与待实测项目。

首次安装直接打开官网欢迎页，需要网络；普通更新不打开。包内不再包含欢迎页副本。

若商店后台已经存在 8.2.1，可能无法重复上传同版本，需要发布者先确认版本要求再递增版本号。本资料按当前请求保留 8.2.1，未提交商店。

官网：https://bv.lcat.cc/\n隐私：https://bv.lcat.cc/privacy.html
''')
 if name=='Firefox':
  shutil.copy2(ROOT/'extension/store-identities.json',d/'原商品身份.json')
 if name=='360':
  (d/'功能说明.txt').write_text(intro)
  (d/'待签名说明.txt').write_text('使用原商品对应私钥生成 CRX，保持商品 ID dgigoaikkdcenigcnaeimgnfinocefkd。私钥不得放入本目录、压缩包或 GitHub。上传格式以当前 360 后台为准；提供 48/96px 图标及四张 560×350 PNG。\n')
 if name=='Chrome':
  offline=d/'离线安装';offline.mkdir()
  instructions='''喵贴 BiliClip 8.2.1 · Chrome 离线安装
1. 完整解压本 ZIP，并保留 biliclip 文件夹。
2. 在 Chrome 打开 chrome://extensions，开启开发者模式。
3. 点击「加载已解压的扩展程序」，选择 biliclip 文件夹。
4. 首次安装打开 https://bv.lcat.cc/welcome.html，需要网络。
5. 关闭重复的旧扩展或油猴版，刷新 B 站页面。
更新时覆盖原目录，在扩展管理页重新加载，再刷新 B 站；普通更新不打开欢迎页。离线包不通过商店自动更新。
'''
  (offline/'安装说明.txt').write_text(instructions)
  target=offline/f'BiliClip-{version}-Chrome-offline.zip'
  with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as z:
   z.writestr('安装说明.txt',instructions)
   for p in sorted((r/channel).rglob('*')):
    if p.is_file():z.write(p,Path('biliclip')/p.relative_to(r/channel))
  shutil.copy2(target,ROOT/'downloads'/target.name)
  (ROOT/'downloads/Chrome离线安装说明.txt').write_text(instructions)
 (d/'SHA256SUMS.txt').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.relative_to(d).as_posix()+'\n' for p in sorted(d.rglob('*')) if p.is_file() and p.name!='SHA256SUMS.txt'))
common=dest/'通用资料';common.mkdir(exist_ok=True)
shutil.copy2(r/'biliclip-8.2.1-source.zip',common/'biliclip-8.2.1-source.zip')
(common/'验证记录.md').write_text(validation)
(common/'权限与隐私.md').write_text(privacy)
(common/'官网欢迎页说明.md').write_text('首次安装打开 https://bv.lcat.cc/welcome.html；网页可独立更新，无需为改文案重发插件。只打开网站，不在扩展内执行远程代码。\n\nChrome API：https://developer.chrome.com/docs/extensions/reference/api/runtime#event-onInstalled\nFirefox ID：https://extensionworkshop.com/documentation/develop/extensions-and-the-add-on-id/\n原 ID 依据：https://addons.mozilla.org/firefox/downloads/file/5009771/biliclip_bbv-7.2.2.xpi\n')
(dest/'目录说明.md').write_text('''# 喵贴 BiliClip 8.2.1 · 按浏览器分类

Chrome、Edge、Firefox、360 各有安装包、解压调试、图片、文案及验证记录。
Chrome/离线安装 提供面向用户的带说明 ZIP。Firefox 已沿用 Mozilla 官方旧包中核对的原 ID，仍待 AMO 审核签名。360 仍需用原私钥生成 CRX，当前提供的是打包输入和配套材料。

Dia、Comet、百分等没有独立商店的 Chromium 浏览器可参考 Chrome 渠道；UC、夸克、QQ、搜狗的具体版本兼容性待实测，不生成未经验证的独立商店包。Safari 未发布。

所有渠道首次安装打开官网欢迎页，更新不弹出。以上为候选资料，尚未向商店提交。
''')
archive=ROOT/'release/BiliClip-8.2.1-按浏览器分类.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(dest.rglob('*')):
  if p.is_file():z.write(p,p.relative_to(dest))
print(dest);print(archive)
