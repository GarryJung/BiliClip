# 喵贴 BiliClip 官网

让 B 站投稿，少一点重复。

[访问官网](https://bv.lcat.cc/) · [使用教程](https://bv.lcat.cc/tutorial.html) · [更新日志](https://bv.lcat.cc/changelog.html)

本仓库用于发布官网及当前 Chrome 离线 CRX，不再提供油猴脚本、历史安装包、扩展源码和商店提交资料。网页运行所需的 JavaScript 保留在 `assets/`，包括粒子背景、标签演示、安装渠道选择和图片放大。

## 安装

在[官网安装区](https://bv.lcat.cc/#install)选择浏览器。Chrome、Arc、Dia、Comet、QQ、夸克、2345、百分、UC、搜狗等 Chromium 浏览器可前往 Chrome 商店，无法访问时下载离线 CRX；Firefox、Edge、360 仅提供各自商店入口。

[下载当前离线 CRX](downloads/BiliClip-8.2.1-offline.crx) · [图文安装教程](https://bv.lcat.cc/tutorial.html#install)

## 本地预览

官网为静态 HTML、CSS 和 JavaScript，无需安装构建依赖。

```sh
python3 -m http.server 8000
```

打开 `http://localhost:8000`。推送到 `main` 后，由现有 GitHub Pages 工作流部署。

## 页面

- `index.html`：首页与安装入口
- `tutorial.html`：使用教程
- `welcome.html`：首次安装欢迎页
- `changelog.html`：更新日志
- `privacy.html`：隐私与权限
- `author.html`：关于作者
- `assets/`：页面使用的样式、脚本、图标和素材
- `downloads/`：当前离线 CRX

## 作者

小丁猫同学 · Garry Jung

[GitHub](https://github.com/GarryJung) · [bilibili](https://space.bilibili.com/377939379) · [小红书](https://www.xiaohongshu.com/user/profile/5d69cf940000000001001a37) · [反馈问题](https://github.com/GarryJung/BiliClip/issues)

独立开发项目，非哔哩哔哩官方产品。
