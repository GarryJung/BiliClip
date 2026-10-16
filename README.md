<div align="center">
  <img src="assets/biliclip-logo.png" width="112" alt="BiliClip 喵贴 Logo">
  <h1>BiliClip 喵贴</h1>
  <p><strong>BV 码、标题，别再来回复制啦。</strong></p>
  <p>在 B 站点一下复制，到创作中心按一次粘贴。剩下的，交给喵贴。</p>
  <p>
    <a href="https://bv.lcat.cc/">逛逛官网</a> ·
    <a href="https://bv.lcat.cc/#install">现在安装</a> ·
    <a href="https://github.com/GaryRong2022/BiliClip/issues">有话想说</a>
  </p>
</div>

---

## 它能帮我省哪一步？

整理视频素材、填写关联视频时，总要重复这套动作：

> 找 BV → 复制 → 切页面 → 粘贴 → 回来找标题 → 再复制 → 再切页面……

喵贴想把这件小事做顺一点：

- **视频卡片上就能复制**：鼠标停在封面上，点击“复制 BV + 标题”，少跑一趟详情页。
- **详情页按需取用**：只要 BV、只要标题，或者两个一起带走，都可以。
- **创作中心一次填两个框**：展开“关联视频”后粘贴，BV 和标题各回各家。
- **普通 B 站输入区交替粘贴**：复制组合信息后，按 BV → 标题的顺序循环粘贴。
- **新复制的内容优先**：中途复制了别的文字，旧任务就让位，不和你抢剪贴板。

喵贴是浏览器里的小帮手，适用于 B 站网页；B 站客户端不在它的工作范围里。

## 先装上，再说 😺

### 扩展商店：选你的浏览器就好

| 浏览器 | 去哪里安装 |
| --- | --- |
| Microsoft Edge | [Edge 扩展商店 ↗](https://microsoftedge.microsoft.com/addons/detail/kiifbllklilololdabaifmhnaaaokjlc) |
| Firefox | [Firefox 附加组件商店 ↗](https://addons.mozilla.org/zh-CN/firefox/addon/biliclip%E5%96%B5%E8%B4%B4-b%E7%AB%99%E4%B8%80%E9%94%AE%E5%A4%8D%E5%88%B6bv%E7%A0%81%E6%A0%87%E9%A2%98/) |
| 360 浏览器 | [360 扩展商店 ↗](https://ext.se.360.cn/#/extension-detail?id=dgigoaikkdcenigcnaeimgnfinocefkd) |

用对应浏览器打开商店，按页面提示添加扩展，**装好后刷新 B 站页面**。

**Chrome：**开发者注册需要 5🔪，攒攒钱再上！目前可以走下面的油猴脚本路线。

**QQ 浏览器：**插件上传入口还在捉迷藏。基于 Chromium 内核，可以先尝试下面的脚本安装方式。

### 油猴脚本：已有管理器的话，很快

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 或 [Violentmonkey](https://violentmonkey.github.io/)。
2. 点击 [一键安装喵贴脚本](https://bv.lcat.cc/biliclip.user.js)，在脚本管理器弹出的页面确认安装。
3. 刷新 B 站页面，开工。

如果点击安装后只看到了代码，先检查脚本管理器是否已经安装并启用。也可以把 [脚本源码](biliclip.user.js) 复制到管理器的新建脚本中保存。

> 扩展版和脚本版，选一种就够了。两个都开，喵贴可能会“分身”，出现重复按钮或操作冲突。
>
> 两种渠道的版本号可能不同：本仓库脚本当前标记为 **7.2.1**；扩展版本以各商店页面为准。

## 三步，把信息送到创作中心

### ① 带上 BV 和标题

在视频卡片或详情页，点击 **“复制 BV + 标题”**。

只想复制一项？详情页里的“复制 BV”“复制标题”也在等你。

### ② 打开“关联视频”

进入 B 站创作中心，展开 **“关联视频”**，等 BV / 链接与描述输入框出现。

### ③ 粘贴，检查，完成

在关联视频输入框按 **Ctrl + V**，Mac 上是 **⌘ + V**。

喵贴识别到对应字段后，会把 BV 和标题分别填进去。提交前看一眼内容是否正确，就可以继续创作了。

**小提醒：**如果中途复制过其他东西，请重新点一次“复制 BV + 标题”。喵贴会尊重你最新的复制操作。

## 有些权限，先和你说清楚

以下按已核对的 Firefox 7.2.2 安装包与仓库脚本说明；不同浏览器、不同版本，请以实际安装提示为准。

| 权限 / 行为 | 用来做什么 |
| --- | --- |
| 写入剪贴板 | 把 BV 或标题复制进去；已核对的 Firefox 版本未申请读取剪贴板权限 |
| 本地存储 | 在页面之间共享待粘贴的 BV 与标题 |
| 访问 B 站页面与 API | 显示按钮、识别输入框，标题缺失时向 B 站官方接口查询 |
| 全网页脚本匹配 | 监听新的复制行为，及时取消旧任务；智能粘贴仅在 B 站启用 |

因此，安装时可能会出现“访问所有网站”一类提示，**权限范围并不限于 B 站**。本地任务数据也不应被理解为关掉浏览器就一定清空。

想看更详细的说明，可以打开 [隐私与权限页面](https://bv.lcat.cc/privacy.html)，或直接翻翻 [脚本源码](biliclip.user.js)。

## 喵？怎么没反应？

**装好了，没有按钮。** 先刷新页面；扩展版检查是否启用、是否允许访问 B 站；脚本版检查管理器和脚本是否都启用。也可以暂时关闭其他修改 B 站页面的扩展或脚本，排除冲突。

**创作中心没填进去。** 确认点的是“复制 BV + 标题”，并且已经展开“关联视频”、看到两个输入框。中途复制过其他内容的话，再复制一次视频信息。

**剪贴板报错。** 使用 HTTPS 页面，检查浏览器或脚本管理器的剪贴板权限，先在普通窗口里试试。

**还是不行。** B 站偶尔会换装修，按钮和输入框也可能跟着搬家。欢迎 [开个 Issue](https://github.com/GaryRong2022/BiliClip/issues/new)，带上这些线索：

- 浏览器名称和版本；
- 用的是扩展版还是脚本版，以及版本号；
- 出问题的页面链接、操作步骤，方便的话再放张截图。

截图前记得遮住账号等私人信息。线索越清楚，越容易找到那只捣乱的小 bug。

## 想翻翻这个仓库？

这里放着 **官网、油猴脚本和相关素材**。扩展商店安装包不在当前仓库目录中。

```text
index.html          官网首页：功能、安装、指南与常见问题
biliclip.user.js    油猴脚本
privacy.html        隐私与权限说明
author.html         作者与作品页面
assets/             作品 Logo
.github/workflows/  GitHub Pages 部署流程
```

官网是原生 HTML / CSS / JavaScript，没有打包步骤。本地预览可以在仓库目录运行：

```bash
python3 -m http.server 8000
```

然后打开 `http://localhost:8000`。脚本的实际使用需要在支持脚本管理器的浏览器里访问 B 站；本地官网预览不会自动安装或运行喵贴。

## 最后，认识一下作者

**小丁猫同学 · Garry Jung**

> 用心创作，终会万众瞩目！

[X / Twitter：小丁猫同学](https://x.com/TavvCat) · [GitHub：GaryRong2022](https://github.com/GaryRong2022) · [Email：i@lcat.cc](mailto:i@lcat.cc)

还做了一个小工具：**[ScrollFerry](https://github.com/GaryRong2022/ScrollFerry)**，帮忙处理小鹅通题库上传。欢迎顺路逛逛。

如果喵贴刚好帮你省下了一点重复劳动，给仓库点颗 ⭐，就当请小丁猫同学吃了口罐头。
