// ==UserScript==
// @name         BiliClip 喵贴  B站一键填充BV码和标题
// @namespace    https://www.bilibili.com/
// @version      8.2.0
// @description  复制 B 站视频的 BV、标题和链接。仅在创作中心的关联视频输入框粘贴 BV + 标题时自动双填。
// @author       Garry Jung
// @match        http://*/*
// @match        https://*/*
// @run-at       document-start
// @grant        GM_registerMenuCommand
// @grant        GM_setClipboard
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @grant        GM_xmlhttpRequest
// @connect      api.bilibili.com
// ==/UserScript==

(function () {
  'use strict';

  const NATIVE_UI_CSS = `
        /* 8.2.0 · shared Bilibili surfaces */
        :host{--bc-text:#18191c;--bc-secondary:#61666d;--bc-border:#e3e5e7;--bc-soft:#f1f2f3;--bc-link:#0078a3;color-scheme:light}
        button,input,summary{box-sizing:border-box}
        button,summary{min-height:28px;border-radius:6px}
        button:focus-visible,input:focus-visible,summary:focus-visible,a:focus-visible{outline:2px solid #0078a3;outline-offset:2px}
        .panel,aside,.card,.declaration-menu{border-color:var(--bc-border);border-radius:8px;box-shadow:0 4px 18px #18191c14}
        .hint,.foot,.status,.meta,.bv{color:var(--bc-secondary);font-size:12px}
        input[type=text],input[type=search]{border-color:var(--bc-border);border-radius:6px;background:white;min-height:32px}
        header{border-color:var(--bc-border)}
        .panel-logo{width:20px;height:20px;vertical-align:-5px;margin-right:6px}
        .section-title{margin:8px 0;padding:4px 8px;background:var(--bc-soft);font-size:13px;font-weight:600;border-radius:4px}
        .panel .primary{background:#00aeec;color:#fff}
        .settings summary{background:var(--bc-soft);padding:7px 8px;color:var(--bc-text);font-size:12px}
        .preset{color:var(--bc-text)}
        .preset .entry{border-color:var(--bc-border);border-radius:6px}
        .preset input,.preset button{color:var(--bc-link)}
        .preset button{border-color:var(--bc-border)}
        .preset button:hover:not(:disabled){background:#e5f6fc;border-color:#00aeec}
        .preset .chip{background:#e5f6fc;color:var(--bc-link)}
        .toast{box-sizing:border-box;white-space:normal;overflow-wrap:anywhere;border-radius:6px;background:#fff;box-shadow:0 4px 16px #18191c1a;max-height:calc(100dvh - 32px);overflow:auto}
        .toast{pointer-events:none;align-items:center;gap:8px}
        .toast .panel-logo{width:22px;height:22px;margin:0;flex:none}
        .toast .toast-message{flex:1;min-width:0}
        .toast .toast-icon{width:16px;height:16px;flex:none;color:#218744}
        .toast.pink .toast-icon{color:#b82d58}
        .hover-actions .action-button{border-radius:6px;box-shadow:0 2px 8px #18191c26}
        .bar .copy-icon{color:var(--bc-secondary)}
        .ring{border:2px solid white;border-radius:6px;box-shadow:0 0 0 3px #00aeec80}
        .card .top{border-bottom:1px solid var(--bc-border);padding-bottom:8px;margin-bottom:10px}
        .guide-brand{display:flex;align-items:center;white-space:nowrap;font-weight:600;color:var(--bc-text)}
        .guide-brand .panel-logo{width:24px;height:24px}
        .card .top .count{margin-left:auto;font-size:12px;color:var(--bc-secondary)}
        .card .bottom{margin-top:10px;gap:8px}
        .card button{border:1px solid var(--bc-border);min-height:30px}
        .card button.primary{background:#00aeec;color:#fff}
        @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
  `;

  const VIDEO_ACTION_COLORS = ':host{--biliclip-video-blue:#00aeec;--biliclip-video-pink:#fb7299}';

  const ACTION_FEEDBACK_CSS = `
    .action-button{display:inline-grid;place-items:center}
    .action-label,.action-feedback{grid-area:1/1}
    .action-feedback{display:flex;justify-content:center;width:0;white-space:nowrap}
    .action-button[data-feedback] .action-label{visibility:hidden}
  `;
  const actionFeedbackTimers = new WeakMap();

  const KEY = 'biliclip_pair_v72';
  const TUTORIAL_SEEN_PREFIX = 'biliclip_spotlight_seen_';
  const PANEL_LOGO = '<img class="panel-logo" width="18" height="18" alt="" draggable="false" src="data:image/png;base64,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">';
  const PANEL_LOGO_CSS = '.panel-logo{width:18px;height:18px;vertical-align:-4px;margin-right:5px}';
  let autoKnowledge = GM_getValue('biliclip_auto_knowledge', true) !== false;
  const knowledgeApplied = new WeakSet();
  const knowledgeAttempts = new WeakMap();
  let knowledgeBusy = false;
  let panelExecuting = false;
  let declarationPending = 0;
  const DECL_KEY = 'biliclip_declaration_v1';
  let declarationPrefs = declarationSettings(GM_getValue(DECL_KEY, null));
  const declarationApplied = new WeakMap();
  let declarationBusy = false;
  const TAG_PRESET_KEY = 'biliclip_upload_tag_preset_v1';
  const TAG_INPUT_SELECTOR = 'input[placeholder*="创建标签"], input[placeholder*="添加标签"], input[placeholder*="Enter"][placeholder*="标签"]';
  const MAX_TAG_PRESETS = 10;
  const MAX_PRESET_TAGS = 10;
  let tagPresetRow;
  let clearTagsBar;
  let uploadTagsBusy = false;
  const UPLOAD_KEY = 'biliclip_upload_settings_v1';
  let uploadPrefs = uploadSettings(GM_getValue(UPLOAD_KEY, null));
  let autoFilledDescriptions = new WeakSet();

  const isBili =
    /(^|\.)bilibili\.com$/i.test(location.hostname);

  const isMember =
    /(^|\.)member\.bilibili\.com$/i.test(location.hostname);

  let ui = null;
  let creatorFields = null;
  let fillingCreator = false;

  document.addEventListener(
    'paste',
    onPaste,
    true
  );

  // 在 paste 时核对实际剪贴板内容。删除、剪切或按快捷键本身
  // 不应提前丢弃配对，否则无法在清空表单后重新填充。

  if (isBili) {
    GM_registerMenuCommand('喵贴 · 重新开始引导', () => ready(replayTutorial));
    GM_registerMenuCommand('喵贴 · 上传简介设置', () => ready(openUploadSettings));
    GM_registerMenuCommand('喵贴 · 标题填入简介第一行（含第二行预设）', () => ready(() => fillUploadDescription(true)));
    GM_registerMenuCommand('喵贴 · 填入简介第二行预设', () => ready(() => fillUploadDescription(false)));
  }
  if (typeof GM_addValueChangeListener === 'function') {
    GM_addValueChangeListener(UPLOAD_KEY, (_key, _old, value) => {
      uploadPrefs = uploadSettings(value);
      autoFilledDescriptions = new WeakSet();
    });
  }

  function ready(callback) {
    if (
      document.readyState ===
      'loading'
    ) {
      document.addEventListener(
        'DOMContentLoaded',
        callback,
        { once: true }
      );
    } else {
      callback();
    }
  }


  // 场景式实操引导：目标来自当前真实页面，不创建模拟业务控件。
  function associationGuideControl(kind) {
    const wanted=kind==='tab' ? /^关联视频$/ : /^[+＋]?\s*添加关联视频$/;
    const leaf=[...document.querySelectorAll('button, [role="button"], div, span')].find(e =>
      wanted.test(clean(e.textContent)) && tutorialVisibleRect(e) &&
      ![...e.children].some(child => wanted.test(clean(child.textContent))));
    if (!leaf) return null;
    // Actual editor markup: span.editor-right-text inside div.editor-right-tab-item.
    const button=leaf.closest('.editor-right-tab-item, button, [role="tab"], [role="button"]');
    if (button) return button;
    let control=leaf;
    while(control.parentElement && wanted.test(clean(control.parentElement.textContent))) control=control.parentElement;
    return control;
  }

  function pinHomeGuideCover() {
    if (!ui || location.pathname !== '/') return null;
    if (ui.tutorialCover) return ui.tutorialCover;
    const preferred=[...document.querySelectorAll('.bili-video-card a[href]')];
    const anchors=preferred.length ? preferred : [...document.querySelectorAll('a[href]')];
    const seen=new Set();
    const candidates=anchors.filter(anchor=>{
      const bv=getBV(anchor.href),r=anchor.getBoundingClientRect();
      if(!bv || seen.has(bv) || !anchor.querySelector('img,picture,video') || !tutorialVisibleRect(anchor) ||
        r.width<100 || r.height<60 || r.top<80 || r.bottom>window.innerHeight) return false;
      seen.add(bv);return true;
    });
    if(!candidates.length)return null;
    const firstTop=Math.min(...candidates.map(e=>e.getBoundingClientRect().top));
    const row=candidates.filter(e=>Math.abs(e.getBoundingClientRect().top-firstTop)<30)
      .sort((a,b)=>a.getBoundingClientRect().left-b.getBoundingClientRect().left);
    const cover=row[Math.floor(row.length/2)];
    ui.tutorialCover=cover;
    ui.active={cover,bv:getBV(cover.href),title:cardTitle(cover)};
    ui.hoverActions.style.display='flex';
    positionHover();return cover;
  }

  function releaseHomeGuideCover() {
    if(!ui?.tutorialCover)return;
    ui.tutorialCover=null;ui.active=null;ui.hoverActions.style.display='none';
  }

  function tutorialKey(scene) {
    return TUTORIAL_SEEN_PREFIX + scene + (['card','association'].includes(scene) ? '_v2' : '');
  }

  function tutorialSeen(scene) {
    const key = tutorialKey(scene);
    if (document.documentElement?.hasAttribute('data-biliclip-guide-' + scene)) return true;
    try { if (sessionStorage.getItem(key) === 'true') return true; } catch (_) {}
    const seen = GM_getValue(key, null);
    if (seen !== null) return seen;
    const legacySeen = scene === 'association' ? false : GM_getValue('biliclip_button_guide_v3_' + scene, false);
    GM_setValue(key, legacySeen);
    return legacySeen;
  }

  function resetTutorialProgress() {
    GM_setValue('biliclip_editor_tutorial_epoch', Number(GM_getValue('biliclip_editor_tutorial_epoch',0)) + 1);
    for (const scene of ['copy','workbench','card','association','library']) {
      GM_setValue(tutorialKey(scene), false);
      GM_setValue(TUTORIAL_SEEN_PREFIX + scene, false);
      document.documentElement?.removeAttribute('data-biliclip-guide-' + scene);
      try { sessionStorage.removeItem(tutorialKey(scene)); sessionStorage.removeItem(TUTORIAL_SEEN_PREFIX + scene); } catch (_) {}
    }
  }

  function replayTutorial() {
    document.getElementById('biliclip-walkthrough')?.shadowRoot?.querySelector('#close')?.click();
    resetTutorialProgress();
    releaseHomeGuideCover();
    startTutorialOnce();
  }

  let editorTutorialEpoch;
  function syncEditorTutorialEpoch() {
    const epoch = String(GM_getValue('biliclip_editor_tutorial_epoch', 0));
    if (editorTutorialEpoch === undefined) {
      try { editorTutorialEpoch = sessionStorage.getItem('biliclip_editor_tutorial_epoch') || '0'; }
      catch (_) { editorTutorialEpoch = '0'; }
    }
    if (editorTutorialEpoch === epoch) return;
    document.getElementById('biliclip-walkthrough')?.shadowRoot?.querySelector('#close')?.click();
    document.documentElement?.removeAttribute('data-biliclip-guide-association');
    try {
      sessionStorage.removeItem(tutorialKey('association'));
      sessionStorage.setItem('biliclip_editor_tutorial_epoch', epoch);
    } catch (_) {}
    editorTutorialEpoch = epoch;
  }

  function startTutorialOnce() {
    if (!isBili || document.getElementById('biliclip-walkthrough')) return;
    const inEditor = location.pathname === '/web/player/index.html' && window.parent !== window;
    if (inEditor) {
      syncEditorTutorialEpoch();
      tryOpenTutorial('association');
      return;
    }
    if (window.top !== window.self) return;

    if (!isMember) {
      if (tutorialSeen('copy')) return;
      pinHomeGuideCover();
      if (!tryOpenTutorial('copy')) releaseHomeGuideCover();
      return;
    }

    const visible = host => host && getComputedStyle(host).display !== 'none';
    const library = document.getElementById('biliclip-video-picker');
    const workbench = document.getElementById('biliclip-upload-panel');
    const frames = creatorEditorFrames().filter(({frame}) => creatorElementVisible(frame));
    if (frames.length || findCreatorFields()) {
      const fieldsReady = frames.length
        ? frames.some(({frame}) => openEditorFrames.has(frame) && !guidedEditorFrames.has(frame))
        : true;
      if (fieldsReady && visible(library)) tryOpenTutorial('library');
      return;
    }
    if (visible(workbench) && tryOpenTutorial('workbench')) return;
    if (!tutorialSeen('card')) expandCreatorMoreSettings(true, true);
    tryOpenTutorial('card');
  }

  function tryOpenTutorial(scene) {
    if (tutorialSeen(scene)) return false;
    const first = tutorialSteps(scene)[0];
    const target = first?.target?.();
    if (!target?.isConnected) return false;
    if (scene !== 'copy' && !tutorialVisibleRect(target)) tutorialRevealTarget(target);
    if (!tutorialVisibleRect(target)) return false;
    openTutorial(scene);
    return true;
  }

  function tutorialCardEntry() {
    const editor = creatorEditorFrames().map(entry => entry.frame).find(creatorElementVisible);
    if (editor) return editor;
    const leaf = uploadQueryAll('button, [role="button"], a, span, div').find(e =>
      /^(?:[+＋]\s*)?个性化卡片$/.test(clean(e.textContent)) && creatorElementVisible(e) &&
      ![...e.children].some(child => /个性化卡片/.test(clean(child.textContent))));
    return leaf?.closest('button, [role="button"], a, label') || leaf || null;
  }

  function tutorialLayoutTarget() {
    // The workbench is intentionally beneath the personalization editor. Guide the visible library instead.
    const library = document.getElementById('biliclip-video-picker');
    const workbench = document.getElementById('biliclip-upload-panel');
    const host = library || workbench;
    return host?.shadowRoot?.querySelector(library ? '.resize-se' : 'header');
  }

  function tutorialSteps(scene = 'copy') {
    const get = (host, selector) => () => document.getElementById(host)?.shadowRoot?.querySelector(selector);
    const panel = selector => get('biliclip-upload-panel', selector);
    const library = selector => get('biliclip-video-picker', selector);
    const step = (title,text,target,action='read') => ({title,text,target,action});
    if (scene === 'workbench') {
      const host=document.getElementById('biliclip-upload-panel');
      const expand=host?.hasAttribute('data-collapsed') ? [step('展开工作台','点击这个标签，展开投稿设置。',panel('.tab'),'click')] : [];
      return [...expand,
        step('设置简介第二行','输入常用文案，或点「下一步」沿用当前设置。文案会先保存为预设。',panel('#preset'),'choice'),
        step('应用投稿设置','点击「一键执行」，把选中的设置应用到当前稿件。',panel('#execute'),'execute'),
        step('核对投稿表单','这里会逐项显示执行结果。回到 B 站表单核对后，再自行投稿。',panel('.status')),
        ...(tagPresetRow?.isConnected ? [{
          ...step('喵贴·标签预设',
            '按回车保存标签，点右侧「执行」按剩余名额填入。最多保存 10 组预设，每组最多 10 个标签。',
            () => tagPresetRow?.shadowRoot?.querySelector('.entry, .add')),
          vertical: true
        }] : [])
      ];
    }
    if (scene === 'card') return [step('打开个性化卡片','点击高亮的「个性化卡片」，打开组件编辑器。',tutorialCardEntry,'card-open')];
    if (scene === 'association') {
      if(findCreatorFields()) return [step('关联输入框已就绪','接下来可在「喵贴 · 关联视频库」选一条稿件填入。',()=>findCreatorFields()?.bv)];
      return [
        step('切换到关联视频','点击高亮的「关联视频」标签。',()=>associationGuideControl('tab'),'association-tab'),
        step('添加关联视频','点击「＋ 添加关联视频」，打开链接和描述文案输入框。',()=>associationGuideControl('add'),'fields')
      ];
    }
    if (scene === 'library') return [
      ...(document.getElementById('biliclip-video-picker')?.hasAttribute('data-collapsed')
        ? [step('展开关联视频库','点击这个按钮，展开关联视频库。',library('.tab'),'click')]
        : []),
      step('打开我的视频','点击「我的视频」，查看可以关联的稿件。',library('#videos'),'click'),
      {
        ...step('填入关联视频','点击高亮的「填入」，把 BV 和标题分别填到链接和描述文案。',library('#list .actions button[title="填入 BV + 标题"]'),'fill'),
        fallback: library('#refresh')
      }
    ];
    const copyTarget = action => () => {
      const selector = `button[data-action="${action}"]`;
      const bar = document.getElementById('biliclip-video-copy-bar')?.shadowRoot;
      const hover = document.getElementById('biliclip-ui-host')?.shadowRoot;
      return [bar?.querySelector(selector), hover?.querySelector(selector)].find(e => tutorialVisibleRect(e));
    };
    return [
      step('复制 BV 和标题','点击蓝色按钮，把 BV 和标题一起复制。粘贴到创作中心的关联视频输入框时，喵贴会分别填入两栏。',copyTarget('both'),'copy'),
      step('复制标题和链接','点击粉红色按钮，把标题和视频链接一起复制，方便在聊天或文档里分享。',copyTarget('title-link'),'copy')
    ];
  }

  function tutorialPlacement(rect, width, height, vw, vh, panel = null, vertical = false) {
    const gap=12, pad=12;
    const clamp=(n,min,max)=>Math.max(min,Math.min(n,Math.max(min,max)));
    // Keep workbench tips outside the entire panel, rather than covering its next controls.
    if (panel && !vertical) {
      const y=clamp(rect.top+(rect.height-height)/2,pad,vh-height-pad);
      if(panel.left-gap-width>=pad) return {left:panel.left-gap-width,top:y,side:'right'};
      if(panel.right+gap+width<=vw-pad) return {left:panel.right+gap,top:y,side:'left'};
    }
    const x=clamp(rect.left+(rect.width-width)/2,pad,vw-width-pad);
    if(rect.bottom+gap+height<=vh-pad) return {left:x,top:rect.bottom+gap,side:'top'};
    if(rect.top-gap-height>=pad) return {left:x,top:rect.top-gap-height,side:'bottom'};
    if (vertical) {
      const below = vh - rect.bottom;
      const above = rect.top;
      return below >= above
        ? {left:x,top:clamp(rect.bottom+gap,pad,vh-height-pad),side:'top'}
        : {left:x,top:clamp(rect.top-gap-height,pad,vh-height-pad),side:'bottom'};
    }
    const y=clamp(rect.top+(rect.height-height)/2,pad,vh-height-pad);
    if(rect.right+gap+width<=vw-pad) return {left:rect.right+gap,top:y,side:'left'};
    if(rect.left-gap-width>=pad) return {left:rect.left-gap-width,top:y,side:'right'};
    return {left:x,top:clamp(rect.bottom+gap,pad,vh-height-pad),side:'none'};
  }

  function tutorialVisibleRect(target) {
    if (!target?.isConnected) return null;
    const rect=target.getBoundingClientRect();
    let left=rect.left,top=rect.top,right=rect.right,bottom=rect.bottom;
    let fixedOutsideClip=false;
    for (let node=target;node;node=node.parentElement || node.getRootNode?.().host) {
      const css=getComputedStyle(node);
      if(css.display==='none'||css.visibility==='hidden'||css.opacity==='0')return null;
      const establishesContainingBlock = (css.transform && css.transform!=='none') ||
        (css.perspective && css.perspective!=='none') || (css.filter && css.filter!=='none') ||
        /paint|layout|strict|content/.test(css.contain || '') || /transform|perspective|filter/.test(css.willChange || '');
      if (establishesContainingBlock) fixedOutsideClip=false;
      // Ordinary body/html overflow does not clip a fixed-position panel. Continue
      // checking visibility, but only clip again if an ancestor creates its containing block.
      if(node!==target && !fixedOutsideClip) {
        const clip=node.getBoundingClientRect();
        if(/auto|scroll|hidden|clip/.test(css.overflowX || css.overflow || '')) {left=Math.max(left,clip.left);right=Math.min(right,clip.right);}
        if(/auto|scroll|hidden|clip/.test(css.overflowY || css.overflow || '')) {top=Math.max(top,clip.top);bottom=Math.min(bottom,clip.bottom);}
      }
      if(css.position==='fixed')fixedOutsideClip=true;
    }
    left=Math.max(0,left);top=Math.max(0,top);right=Math.min(window.innerWidth,right);bottom=Math.min(window.innerHeight,bottom);
    return right>left && bottom>top ? {left,top,right,bottom,width:right-left,height:bottom-top} : null;
  }

  function tutorialRevealTarget(target) {
    const workbench = target?.getRootNode?.().host;
    if (['biliclip-upload-panel', 'biliclip-video-picker'].includes(workbench?.id)) {
      const body=target.closest?.('.body');
      if (!body) return;
      const rect=target.getBoundingClientRect(),view=body.getBoundingClientRect();
      const padding=8;
      if(rect.top<view.top+padding || rect.bottom>view.bottom-padding) {
        body.scrollTop += rect.top + rect.height/2 - (view.top + view.height/2);
      }
      return;
    }
    target?.scrollIntoView?.({block:'center',inline:'nearest',behavior:'instant'});
  }

  function tutorialLocalRect(rect, probe) {
    const sx=probe.width/100 || 1,sy=probe.height/100 || 1;
    const left=(rect.left-probe.left)/sx,top=(rect.top-probe.top)/sy;
    const width=rect.width/sx,height=rect.height/sy;
    return {left,top,width,height,right:left+width,bottom:top+height};
  }

  function openTutorial(scene = 'copy') {
    if (document.getElementById('biliclip-walkthrough') || tutorialSeen(scene)) return;
    const key = tutorialKey(scene);
    document.documentElement?.setAttribute('data-biliclip-guide-' + scene, 'true');
    try { sessionStorage.setItem(key, 'true'); } catch (_) {}
    GM_setValue(key, true);
    const steps=tutorialSteps(scene);
    let index=0;
    let disposed=false, actionSeen=false, completed=false, lastTarget=null, initialRect=null;
    let due=0, editedAt=0, busySeen=false;
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const followAnimations = new Set();
    let hasLayout = false, finishTimer = 0;
    const cancelFollow = () => { for (const animation of followAnimations) animation.cancel(); followAnimations.clear(); };
    const onMotionChange = () => { if (motionPreference.matches) cancelFollow(); };
    motionPreference.addEventListener?.('change', onMotionChange);
    const previous=document.activeElement;
    const host=document.createElement('div'); host.id='biliclip-walkthrough';
    // manual popover keeps the spotlight above ordinary page layers without making the page inert.
    host.setAttribute('popover','manual');
    host.style.cssText='all:initial;position:fixed;inset:0;width:100vw;height:100dvh;margin:0;padding:0;border:0;background:transparent;overflow:visible;z-index:2147483647;pointer-events:none';
    const root=host.attachShadow({mode:'open'});
    root.innerHTML = `
      <style>
        * { box-sizing:border-box }
        .probe { position:fixed; top:0; left:0; width:100px; height:100px; pointer-events:none; visibility:hidden }
        .shade { position:fixed; background:#12151c73; pointer-events:auto }
        .ring { position:fixed; border:2px solid #35c5ee; border-radius:9px; box-shadow:0 0 0 3px #00aeec30; pointer-events:none }
        .card { position:fixed; pointer-events:auto; width:300px; max-width:calc(100vw - 24px); padding:12px 14px;
          border:1px solid #e3e8ef; border-radius:12px; background:#fff; color:#18191c; box-shadow:0 8px 28px #182a4433;
          font:13px/1.55 system-ui,"PingFang SC",sans-serif; overflow-wrap:anywhere }
        .top,.bottom { display:flex; align-items:center; justify-content:space-between; gap:8px }
        .top { color:#61666d; font-size:12px }
        .count { color:#00799c; font-weight:600 }
        h2 { margin:3px 0 5px; font-size:16px; line-height:1.35 }
        p { margin:0 }
        .status { color:#087b9f; font-size:12px; min-height:19px; margin:7px 0 2px }
        .status[data-error] { color:#a12650 }
        .bottom { justify-content:flex-end }
        button { border:0; border-radius:6px; background:transparent; color:#61666d; padding:4px 7px; font:inherit; cursor:pointer }
        button:hover { background:#f0f4f7; color:#18191c }
        button:disabled { opacity:.55; cursor:default }
        button.primary { color:#006b89; background:#e5f6fc; font-weight:600 }
        button.primary:hover { background:#d1f0fa }
        :focus-visible { outline:2px solid #00aeec; outline-offset:2px }
        .arrow { position:absolute; width:10px; height:10px; background:#fff; transform:rotate(45deg); pointer-events:none }
        [data-side=top] .arrow { top:-5px; left:var(--arrow-x,50%) }
        [data-side=bottom] .arrow { bottom:-5px; left:var(--arrow-x,50%) }
        [data-side=left] .arrow { left:-5px; top:var(--arrow-y,50%) }
        [data-side=right] .arrow { right:-5px; top:var(--arrow-y,50%) }
        [data-side=none] .arrow,[hidden] { display:none!important }
      
        ${NATIVE_UI_CSS}
        .card{animation:guide-enter 220ms ease-out both}
        .guide-brand .panel-logo{animation:none!important;transform:none!important}
        .jump-cue{position:absolute;left:50%;top:-36px;width:28px;height:28px;margin-left:-14px;color:#00aeec;filter:drop-shadow(0 2px 2px #18191c26);opacity:0}
        :host([data-phase=waiting][data-interactive]) .jump-cue{opacity:1;animation:cue-hop 650ms ease-in-out 3}
        .tap-ripple{position:absolute;left:50%;top:50%;width:24px;height:24px;margin:-12px;border:2px solid #00aeec;border-radius:50%;opacity:0}
        .tap-ripple.play{animation:tap-spread 440ms ease-out}
        .step-trail{display:flex;align-items:center;gap:6px;margin:0 0 10px;height:16px}
        .step-dot{width:7px;height:7px;border-radius:50%;background:#e3e5e7}
        .step-dot[data-current]{width:22px;border-radius:5px;background:#00aeec;animation:step-land 320ms ease-out}
        .step-dot[data-done]{background:#83d4ec}
        .guide-burst{position:absolute;width:48px;height:48px;right:-18px;top:-20px;opacity:0;color:#00aeec}
        :host([data-phase=success]) .guide-burst{animation:success-burst 380ms ease-out}
        @keyframes cue-hop{0%,100%{transform:translateY(0)}45%{transform:translateY(-7px)}70%{transform:translateY(2px)}}
        @keyframes tap-spread{0%{opacity:.85;transform:scale(.4)}100%{opacity:0;transform:scale(2.8)}}
        @keyframes step-land{0%{transform:translateY(-4px) scale(.8)}65%{transform:translateY(1px) scale(1.05)}100%{transform:none}}
        @keyframes success-burst{0%{opacity:0;transform:scale(.5) rotate(-12deg)}40%{opacity:1}100%{opacity:0;transform:scale(1.3) rotate(8deg)}}
        .ring::after{content:'';position:absolute;inset:-5px;border:2px solid #00aeec80;border-radius:9px;opacity:0}
        :host([data-phase=waiting]) .ring::after{animation:target-breathe 900ms ease-in-out 2}
        .guide-complete{display:none;width:16px;height:16px;margin-left:5px;color:#218744;flex:none}
        :host([data-phase=success]) .guide-complete{display:block}
        .guide-complete path{stroke-dasharray:20;stroke-dashoffset:20}
        :host([data-phase=success]) .guide-complete path{animation:check-draw 220ms ease-out forwards}
        .status[data-success]{color:#218744}
        @keyframes guide-enter{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes target-breathe{0%,100%{opacity:0;transform:scale(.98)}50%{opacity:.8;transform:scale(1.035)}}
        @keyframes check-draw{to{stroke-dashoffset:0}}
        @media(prefers-reduced-motion:reduce){.card{animation:guide-fade 160ms ease-out!important}.guide-complete path{stroke-dashoffset:0}}
        @keyframes guide-fade{from{opacity:0}to{opacity:1}}
        .celebration{display:none;text-align:center;padding:14px 0 4px}
        .celebration h2{font-size:20px;color:#0078a3;margin:6px 0 10px}
        .celebration p{color:#61666d;margin:0 0 16px}
        .celebration .primary{padding:6px 20px}
        :host([data-finishing]) .card>:not(.top):not(.celebration):not(.confetti){display:none!important}
        :host([data-finishing]) .celebration{display:block;animation:celebrate-in 240ms ease-out both}
        :host([data-finishing]) .ring{display:none!important}
        .confetti{position:absolute;left:50%;top:52px;width:7px;height:11px;background:var(--color);border-radius:2px;pointer-events:none;opacity:0}
        :host([data-finishing]) .confetti{animation:confetti-pop 1100ms cubic-bezier(.15,.65,.35,1) var(--delay) both}
        @keyframes celebrate-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        @keyframes confetti-pop{0%{opacity:0;transform:translate(0,0) rotate(0) scale(.4)}12%{opacity:1}65%{opacity:1;transform:translate(var(--x),var(--y)) rotate(var(--spin))}100%{opacity:0;transform:translate(var(--x),calc(var(--y) + 70px)) rotate(calc(var(--spin) + 90deg))}}
        @media(prefers-reduced-motion:reduce){.confetti{display:none!important}}

      </style>
      <div class="probe" aria-hidden="true"></div>
      <div class="shade s0"></div><div class="shade s1"></div><div class="shade s2"></div><div class="shade s3"></div>
      <div class="ring" aria-hidden="true"><svg class="jump-cue" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3v19m-7-7 7 7 7-7"/></svg><i class="tap-ripple"></i><svg class="guide-burst" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m24 3 0 7m14-1-5 5m12 10h-7M10 9l5 5M3 24h7m28 14-5-5"/></svg></div>
      <section class="card" role="region" aria-label="喵贴操作引导">
        <i class="arrow" aria-hidden="true"></i>
        <div class="top"><span class="guide-brand">${PANEL_LOGO}喵贴小提示<svg class="guide-complete" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m4 10 4 4 8-9"/></svg></span><span class="count"></span><button id="close" aria-label="退出引导">×</button></div>
        <div class="step-trail" aria-hidden="true"></div><h2></h2><p id="text"></p><p class="status" role="status"></p>
        <div class="celebration" role="status"><h2>恭喜，视频已填入！</h2><p>核对关联信息后，再自行提交。</p><button id="celebration-close" type="button" class="primary">知道啦</button></div>
        <div class="bottom"><button id="skip">跳过</button><button id="prev">上一步</button><button id="next" class="primary">下一步</button></div>
      </section>
    `;
    const get=s=>root.querySelector(s);
    get('.step-trail').innerHTML = steps.map(() => '<i class="step-dot"></i>').join('');
    const rectOf=tutorialVisibleRect;
    const target=()=>{try{return steps[index].target?.() || steps[index].fallback?.() || null;}catch{return null;}};
    const box=(element,l,t,w,h)=>Object.assign(element.style,{left:l+'px',top:t+'px',width:Math.max(0,w)+'px',height:Math.max(0,h)+'px'});
    const update=()=>{
      if(disposed || host.hasAttribute('data-finishing'))return;
      if(scene==='copy' && ui?.tutorialCover?.isConnected)positionHover();
      const step=steps[index], t=target(), now=Date.now();
      if(t!==lastTarget && t?.isConnected && step.action!=='copy') tutorialRevealTarget(t);
      const probe=get('.probe').getBoundingClientRect();
      const raw=rectOf(t),r=raw?tutorialLocalRect(raw,probe):null;
      if(t!==lastTarget){lastTarget=t;initialRect=r; }
      const viewport=tutorialLocalRect({left:0,top:0,width:window.innerWidth,height:window.innerHeight},probe);
      const vw=viewport.right,vh=viewport.bottom,vl=viewport.left,vt=viewport.top;
      const onscreen=r&&r.bottom>vt&&r.top<vh&&r.right>vl&&r.left<vw;
      const shades=[get('.s0'),get('.s1'),get('.s2'),get('.s3')];
      if(onscreen){
        const l=Math.max(vl,r.left-5),top=Math.max(vt,r.top-5),right=Math.min(vw,r.right+5),bottom=Math.min(vh,r.bottom+5);
        box(shades[0],vl,vt,vw-vl,top-vt);box(shades[1],vl,bottom,vw-vl,vh-bottom);box(shades[2],vl,top,l-vl,bottom-top);box(shades[3],right,top,vw-right,bottom-top);
        shades.forEach(e=>e.style.pointerEvents='none');get('.ring').hidden=false;box(get('.ring'),l,top,right-l,bottom-top);
      }else{
        // Missing/offscreen controls must not block navigation, scrolling or opening the required editor.
        box(shades[0],vl,vt,vw-vl,vh-vt);shades.slice(1).forEach(e=>box(e,0,0,0,0));shades.forEach(e=>e.style.pointerEvents='none');get('.ring').hidden=true;
      }
      const card=get('.card');
      const cr=tutorialLocalRect(card.getBoundingClientRect(),probe);
      const relative = r ? {...r,left:r.left-vl,right:r.right-vl,top:r.top-vt,bottom:r.bottom-vt} : null;
      const panelNode=scene==='workbench' ? document.getElementById('biliclip-upload-panel')?.shadowRoot?.querySelector('.panel') : null;
      const panelRect=panelNode ? tutorialLocalRect(panelNode.getBoundingClientRect(),probe) : null;
      const panelBounds=panelRect ? {...panelRect,left:panelRect.left-vl,right:panelRect.right-vl,top:panelRect.top-vt,bottom:panelRect.bottom-vt} : null;
      const placement=onscreen?tutorialPlacement(relative,cr.width,cr.height,viewport.width,viewport.height,panelBounds,step.vertical):{left:Math.max(12,(viewport.width-cr.width)/2),top:Math.max(12,viewport.height-cr.height-24),side:'none'};
      placement.left+=vl;placement.top+=vt;
      Object.assign(card.style,{left:placement.left+'px',top:placement.top+'px'});card.setAttribute('data-side',placement.side);
      if(r){card.style.setProperty('--arrow-x',Math.max(16,Math.min(cr.width-24,r.left+r.width/2-placement.left))+'px');card.style.setProperty('--arrow-y',Math.max(16,Math.min(cr.height-24,r.top+r.height/2-placement.top))+'px');}
      const waitingForVideos = step.action === 'fill' && !!step.fallback && !step.target();
      const title = waitingForVideos ? '加载可关联稿件' : step.title;
      const isLastRead = index === steps.length - 1 && step.action === 'read';
      const text = waitingForVideos
        ? '列表没有可填入的稿件。点击「刷新」读取稿件，已有稿件出现后可继续填入。'
        : step.text + (isLastRead ? ' 点击任意位置完成引导。' : '');
      if (get('h2').textContent !== title) get('h2').textContent = title;
      if (get('#text').textContent !== text) get('#text').textContent = text;
      if(step.action==='copy' && actionSeen)completed=t?.dataset?.feedback==='success';
      if(step.action==='card-open')completed=creatorEditorFrames().some(({frame})=>creatorElementVisible(frame)) || !!associationGuideControl('tab');
      if(step.action==='association-tab')completed=!!associationGuideControl('add') || !!findCreatorFields();
      if(step.action==='fields')completed=!!findCreatorFields();
      if(step.action==='fill' && actionSeen && !waitingForVideos)completed=t?.dataset?.feedback==='success';
      if(step.action==='appear')completed=!!r;
      if(step.action==='association')completed=creatorEditorFrames().some(({frame}) => openEditorFrames.has(frame));
      if(step.action==='input')completed=actionSeen&&!!String(t?.value||'').trim()&&now-editedAt>=650;
      if (step.action === 'execute' && actionSeen) completed = t?.dataset?.guideResult === 'success';
      if (step.action === 'refresh' && actionSeen) {
        if (t?.disabled) busySeen = true;
        const status = document.getElementById('biliclip-video-picker')?.shadowRoot?.querySelector('#status')?.textContent || '';
        completed = busySeen && !t?.disabled && !/失败|未完成|未找到|请先|未填入|错误/.test(status);
      }
      if(step.action==='layout'&&r&&initialRect)completed=Math.abs(r.left-initialRect.left)+Math.abs(r.top-initialRect.top)+Math.abs(r.width-initialRect.width)+Math.abs(r.height-initialRect.height)>5;
      const failed = t?.dataset?.feedback === 'error' || (step.action === 'execute' && actionSeen && t?.dataset?.guideResult === 'error');
      const hint = completed ? '已完成' : failed ? '操作未完成，可检查后重试'
        : t?.disabled ? '处理中…' : !r && step.target ? '等待操作控件出现'
        : step.action === 'choice' ? '可沿用当前设置' : step.action === 'read' ? '' : '请操作高亮控件';
      const status = get('.status');
      if (status.textContent !== hint) status.textContent = hint;
      status.toggleAttribute('data-error', failed);
      status.toggleAttribute('data-success', completed);
      const phase = completed ? 'success' : failed ? 'error' : 'waiting';
      if (host.dataset.phase !== phase) host.dataset.phase = phase;
      if(completed){if(!due)due=now+400;if(now>=due)advance();}else due=0;
    };
    const render=()=>{
      // FLIP only between steps; scrolling and resizing track the live target directly.
      const previousRects = hasLayout ? ['.card','.ring'].map(selector => {
        const element = get(selector);
        return {element, rect:element.getBoundingClientRect(), hidden:element.hidden};
      }) : [];
      cancelFollow();
      host.dataset.phase = 'entering';
      actionSeen=false;completed=false;busySeen=false;lastTarget=null;initialRect=null;due=0;
      const step = steps[index];
      host.toggleAttribute('data-interactive', !['read','choice'].includes(step.action));
      get('.step-trail').querySelectorAll('.step-dot').forEach((dot,i) => {dot.toggleAttribute('data-current',i===index);dot.toggleAttribute('data-done',i<index);});
      const last = index === steps.length - 1;
      if(step.action==='association') expandCreatorMoreSettings(true,true);
      get('#next').hidden = false;
      get('#next').disabled = step.action !== 'read' && step.action !== 'choice';
      get('#next').textContent = get('#next').disabled ? '等待你操作' : last ? '完成' : '下一步';
      get('#prev').disabled = index === 0;
      get('.count').textContent=({copy:'复制',workbench:'投稿设置',card:'卡片入口',association:'关联编辑',library:'视频库'}[scene] || '操作')+' · '+(index+1)+' / '+steps.length;
      update();
      if (!motionPreference.matches) for (const {element,rect,hidden} of previousRects) {
        if (hidden || element.hidden || !rect.width || !rect.height) continue;
        const next = element.getBoundingClientRect();
        if (!next.width || !next.height) continue;
        const scale = element.classList.contains('ring') ? ` scale(${rect.width / next.width},${rect.height / next.height})` : '';
        const animation = element.animate([
          {transform:`translate(${rect.left-next.left}px,${rect.top-next.top}px)${scale}`,transformOrigin:'0 0'},
          {transform:'translate(0,0) scale(1)',transformOrigin:'0 0'}
        ], {duration:240,easing:'cubic-bezier(.2,.7,.3,1)'});
        followAnimations.add(animation);
        animation.onfinish = () => followAnimations.delete(animation);
      }
      hasLayout = true;
    };
    const close=()=>{clearTimeout(finishTimer);cancelFollow();motionPreference.removeEventListener?.('change',onMotionChange);if(scene==='copy')releaseHomeGuideCover();if(frame)window.cancelAnimationFrame?.(frame);disposed=true;clearInterval(timer);for(const name of ['click','change','input'])document.removeEventListener(name,observe,true);document.removeEventListener('keydown',escape,true);host.remove();if(previous?.isConnected)previous.focus();};
    const finish=()=>{
      if(scene!=='library' || steps[index].action!=='fill' || !completed){close();return;}
      if(host.hasAttribute('data-finishing'))return;
      cancelFollow();host.setAttribute('data-finishing','');
      const card=get('.card');
      get('.count').textContent='引导完成';
      if (!motionPreference.matches) {
        const colors=['#00aeec','#fb7299','#ffd166','#71d6ba'];
        for(let i=0;i<24;i++) {
          const piece=document.createElement('i');piece.className='confetti';piece.setAttribute('aria-hidden','true');
          const angle=(i/24)*Math.PI*2, distance=65+(i%4)*18;
          piece.style.cssText=`--color:${colors[i%4]};--x:${Math.cos(angle)*distance}px;--y:${Math.sin(angle)*distance-25}px;--spin:${(i%2?1:-1)*(120+i*13)}deg;--delay:${i%5*30}ms`;
          card.append(piece);
        }
      }
      // Position once; the completion card never blocks native page navigation.
      Object.assign(card.style,{left:Math.max(12,(innerWidth-card.offsetWidth)/2)+'px',top:Math.max(12,(innerHeight-card.offsetHeight)/2)+'px'});card.setAttribute('data-side','none');
      finishTimer=setTimeout(close,1800);
    };
    const advance=()=>{if(scene==='library' && steps[index].action==='fill' && completed){finish();return;}if(index===steps.length-1){close();}else{index++;render();}};
    const observe=event=>{
      if(host.hasAttribute('data-finishing'))return;
      const action = steps[index].action;
      const path = event.composedPath();
      if (event.type === 'click' && action === 'read' && index === steps.length - 1 &&
          !['#close', '#skip', '#prev', '#next'].some(selector => path.includes(get(selector)))) {
        // Preserve native navigation when closing an informational step.
        close();
        return;
      }
      const t=target();if(!t||!path.includes(t)||path.includes(host))return;
      if(event.type==='click') {const ripple=get('.tap-ripple');ripple.classList.remove('play');void ripple.offsetWidth;ripple.classList.add('play');}
      if(action==='input'&&event.type==='input'){actionSeen=true;editedAt=Date.now();}
      if(event.type==='click' && (['copy','execute','refresh'].includes(action) || (action==='fill' && t===steps[index].target()))) {
        actionSeen=true;
        busySeen=false;
      }
      if(action==='choice'&&event.type==='change')completed=true;
      if(action==='click'&&event.type==='click'&&path.some(n=>n?.tagName==='BUTTON'||n?.tagName==='INPUT'||n?.tagName==='SUMMARY'||n?.tagName==='LABEL'))completed=true;
      // Let the original click/change handlers apply their changes before moving the spotlight.
    };
    const escape=event=>{if(event.key==='Escape')close();};
    get('#celebration-close').onclick=close;get('#close').onclick=close;get('#skip').onclick=close;get('#prev').onclick=()=>{if(index>0){index--;render();}};get('#next').onclick=()=>{if(!get('#next').hidden && !get('#next').disabled) advance();};
    document.body.append(host);if(typeof host.showPopover==='function')host.showPopover();
    // A refresh or closing a tab also ends this automatic showing.
    GM_setValue(tutorialKey(scene), true);
    for(const name of ['click','change','input'])document.addEventListener(name,observe,true);document.addEventListener('keydown',escape,true);
    let frame=0;
    const track=()=>{if(disposed)return;update();if(!disposed)frame=window.requestAnimationFrame(track);};
    const timer=typeof window.requestAnimationFrame==='function'?null:setInterval(update,80);
    render();if(typeof window.requestAnimationFrame==='function')frame=window.requestAnimationFrame(track);
  }

  function clean(value) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function validPair(value) {
    if (
      !value ||
      typeof value !== 'object'
    ) {
      return null;
    }

    const bv = clean(value.bv);
    const title = clean(value.title);

    return (
      /^BV[0-9A-Za-z]{10}$/.test(bv) &&
      title
    )
      ? {
          bv,
          title,
          savedAt:
            Number(value.savedAt) || 0
        }
      : null;
  }

  async function savePair(bv, title) {
    const value = {
      bv,
      title: clean(title),
      savedAt: Date.now()
    };

    await writeClipboard(pairClipboardText(value));
    GM_setValue(KEY, value);
  }

  function pairClipboardText({bv, title}) {
    return `${bv}\n${title}`;
  }

  function clearPair() {
    GM_setValue(KEY, null);
  }

  async function writeClipboard(text) {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch (_) {}
    }
    if (typeof GM_setClipboard !== 'function' || await GM_setClipboard(text, 'text') === false) {
      throw new Error('剪贴板不可用');
    }
  }

  /* ==================== 粘贴与自动填充 ==================== */

  async function onPaste(event) {
    if (!isBili) return;
    const inCreatorEditor = location.pathname === '/web/player/index.html' && window.parent !== window;
    if (!isMember && !inCreatorEditor) return;

    const text = event.clipboardData?.getData('text/plain').replace(/\r\n/g, '\n');
    if (!text) return;
    const current = validPair(GM_getValue(KEY, null));
    if (!current || text !== pairClipboardText(current)) return;

    const fields = findCreatorFields();
    if (!fields) return;
    const path = event.composedPath();
    if (!path.includes(fields.bv) && !path.includes(fields.title)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    await fillCreatorPair(current);
  }

  function creatorEditorFrames() {
    return [...document.querySelectorAll('iframe')].flatMap(frame => {
      try {
        const url = new URL(frame.src, location.href);
        return /(^|\.)bilibili\.com$/.test(url.hostname) && url.pathname === '/web/player/index.html'
          ? [{ frame, origin: url.origin }] : [];
      } catch (_) { return []; }
    });
  }

  function creatorDraftIdentity(url) {
    const params = url.searchParams;
    const bv = params.get('bvid') || params.get('bv') || getBV(url.href);
    const aid = (params.get('aid') || params.get('avid') || '').replace(/^av/i, '');
    return {
      bv: /^BV[0-9A-Za-z]{10}$/.test(bv || '') ? bv : '',
      aid: /^[1-9]\d*$/.test(aid) ? aid : ''
    };
  }

  function currentCreatorDraft() {
    if (location.pathname === '/web/player/index.html' && window.parent !== window) {
      return creatorDraftIdentity(new URL(location.href));
    }
    const entry = creatorEditorFrames().find(({frame}) => creatorElementVisible(frame));
    if (entry) {
      const frameDraft = creatorDraftIdentity(new URL(entry.frame.src, location.href));
      if (frameDraft.bv || frameDraft.aid) return frameDraft;
      const reportedDraft = creatorFrameDrafts.get(entry.frame);
      if (reportedDraft) return reportedDraft;
    }
    return isManuscriptManagementPage() ? creatorDraftIdentity(new URL(location.href)) : { bv: '', aid: '' };
  }

  const creatorFrameDrafts = new WeakMap();
  const creatorDraftLookups = new Map();
  const creatorDraftBVs = new Map();

  function resolveCreatorDraftBV(aid) {
    if (!creatorDraftLookups.has(aid)) {
      const lookup = pickerApi('/x/web-interface/view', {aid}).then(data =>
        /^BV[0-9A-Za-z]{10}$/.test(data.bvid || '') ? data.bvid : ''
      ).catch(() => '').then(bv => {
        if (bv) creatorDraftBVs.set(aid, bv);
        else creatorDraftLookups.delete(aid);
        return bv;
      });
      creatorDraftLookups.set(aid, lookup);
    }
    return creatorDraftLookups.get(aid);
  }

  function fillCreatorFrame(value) {
    const frames = creatorEditorFrames();
    if (!frames.length) return Promise.resolve(false);
    return new Promise(resolve => {
      const id = 'biliclip-' + Date.now() + '-' + Math.random().toString(36).slice(2);
      const finish = result => { clearTimeout(timer); window.removeEventListener('message', receive); resolve(result); };
      const receive = event => {
        if (event.data?.type !== 'biliclip-fill-result' || event.data.id !== id ||
          !frames.some(({frame, origin}) => event.source === frame.contentWindow && event.origin === origin)) return;
        if (event.data.ok) finish(true);
      };
      const timer = setTimeout(() => finish(false), 3500);
      window.addEventListener('message', receive);
      for (const {frame, origin} of frames) frame.contentWindow.postMessage({ type: 'biliclip-fill-request', id, bv: value.bv, title: value.title }, origin);
    });
  }

  const openEditorFrames = new WeakSet();
  const guidedEditorFrames = new WeakSet();
  window.addEventListener('message', event => {
    if (!isMember || event.data?.type !== 'biliclip-editor-state') return;
    const entry = creatorEditorFrames().find(({frame, origin}) => frame.contentWindow === event.source && origin === event.origin);
    if (!entry) return;
    const bv = event.data.draftBV;
    const aid = event.data.draftAid;
    if (/^BV[0-9A-Za-z]{10}$/.test(bv || '') || /^[1-9]\d*$/.test(aid || '')) {
      creatorFrameDrafts.set(entry.frame, {
        bv: /^BV[0-9A-Za-z]{10}$/.test(bv || '') ? bv : '',
        aid: /^[1-9]\d*$/.test(aid || '') ? aid : ''
      });
    } else creatorFrameDrafts.delete(entry.frame);
    if (event.data.guiding === true) guidedEditorFrames.add(entry.frame);
    else guidedEditorFrames.delete(entry.frame);
    if (event.data.open === true) {
      if (!openEditorFrames.has(entry.frame)) document.getElementById('biliclip-video-picker')?.removeAttribute('data-collapsed');
      openEditorFrames.add(entry.frame);
    } else openEditorFrames.delete(entry.frame);
  });
  if (isBili && location.pathname === '/web/player/index.html' && window.parent !== window) {
    ready(() => {
      let lastOpen = null;
      let lastGuiding = null;
      let lastDraft = null;
      setInterval(() => {
        startTutorialOnce();
        const open = !!findCreatorFields();
        const guiding = !!document.getElementById('biliclip-walkthrough');
        const {bv: draftBV, aid: draftAid} = currentCreatorDraft();
        const draft = draftBV + ':' + draftAid;
        if (open === lastOpen && guiding === lastGuiding && draft === lastDraft) return;
        lastOpen = open;
        lastGuiding = guiding;
        lastDraft = draft;
        window.parent.postMessage({type:'biliclip-editor-state', open, guiding, draftBV, draftAid}, 'https://member.bilibili.com');
      }, 800);
    });
  }

  // The personalized-card editor is cross-origin; its own userscript instance fills
  // local inputs. Only the direct Bilibili creator parent may request this action.
  window.addEventListener('message', async event => {
    if (!isBili || location.pathname !== '/web/player/index.html' || event.source !== window.parent ||
      event.origin !== 'https://member.bilibili.com' || event.data?.type !== 'biliclip-fill-request') return;
    const { id, bv, title } = event.data;
    if (typeof id !== 'string' || !/^BV[0-9A-Za-z]{10}$/.test(bv) || typeof title !== 'string' || title.length > 1000) return;
    let ok = false;
    try {
      ensureAssociationExpanded();
      await new Promise(resolve => setTimeout(resolve, 80));
      ok = await fillCreatorPair({bv, title});
      if (ok) setTimeout(ensureAssociationExpanded, 120);
    } catch (_) {}
    event.source.postMessage({ type:'biliclip-fill-result', id, ok: !!ok }, event.origin);
  });

  async function fillCreatorPair(current) {
    const draft = currentCreatorDraft();
    let draftBV = draft.bv || creatorDraftBVs.get(draft.aid);
    if (!draftBV && draft.aid && !current.aid) {
      draftBV = await resolveCreatorDraftBV(draft.aid);
      const active = currentCreatorDraft();
      if (active.aid !== draft.aid || active.bv !== draft.bv) return false;
    }
    if ((draftBV && draftBV === current.bv) || (draft.aid && draft.aid === current.aid)) {
      return false;
    }
    const fields = findCreatorFields();
    if (!fields) {
      if (isMember && await fillCreatorFrame(current)) return true;
      return false;
    }
    if (fillingCreator) return;
    fillingCreator = true;

    try {
      const bvDone = replaceValue(fields.bv, current.bv);

      // 让页面处理 BV 的 input/change 更新后，重新取得当前标题框。
      await new Promise(resolve => setTimeout(resolve, 0));
      const refreshed = findCreatorFields();
      const titleDone = refreshed && replaceValue(refreshed.title, current.title);
      await new Promise(resolve => setTimeout(resolve, 0));
      const finalFields = findCreatorFields();
      const complete = bvDone && titleDone && finalFields &&
        editorValue(finalFields.bv) === current.bv &&
        editorValue(finalFields.title) === current.title;

      if (complete) { finalFields.title.focus(); toast('链接与描述已填入', 'blue', 1800); }
      return !!complete;
    } finally {
      fillingCreator = false;
    }

  }


  /* ==================== 输入框识别 ==================== */

  function visibleEditors() {
    return [
      ...(isMember ? uploadQueryAll : selector => document.querySelectorAll(selector))(
        [
          'input',
          'textarea',
          '[contenteditable="true"]',
          '[contenteditable=""]',
          '[role="textbox"]'
        ].join(',')
      )
    ].filter(editor => {
      if (
        editor instanceof
        HTMLInputElement
      ) {
        if (
          !/^(text|search|url|tel|email)$/i
            .test(
              editor.type || 'text'
            )
        ) {
          return false;
        }

        if (
          editor.disabled ||
          editor.readOnly
        ) {
          return false;
        }
      }

      if (
        editor instanceof
          HTMLTextAreaElement &&
        (
          editor.disabled ||
          editor.readOnly
        )
      ) {
        return false;
      }

      const rect =
        editor.getBoundingClientRect();

      const style =
        getComputedStyle(editor);

      return (
        rect.width > 30 &&
        rect.height > 10 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0'
      );
    });
  }

  function fieldText(editor) {
    const parts = [
      editor.getAttribute('placeholder'),
      editor.getAttribute('aria-label'),
      editor.getAttribute('title'),
      editor.getAttribute('name'),
      editor.id
    ];

    if (editor.id) {
      const label =
        document.querySelector(
          `label[for="${
            CSS.escape(editor.id)
          }"]`
        );

      if (label) {
        parts.push(
          label.textContent
        );
      }
    }

    let node =
      editor.parentElement;

    for (
      let i = 0;
      i < 5 && node;
      i += 1
    ) {
      const text =
        clean(node.textContent);

      const editorCount =
        node.querySelectorAll(
          [
            'input',
            'textarea',
            '[contenteditable="true"]',
            '[contenteditable=""]',
            '[role="textbox"]'
          ].join(',')
        ).length;

      if (
        editorCount === 1 &&
        text.length <= 220
      ) {
        parts.push(text);
        break;
      }

      node =
        node.parentElement;
    }

    return clean(
      parts.join(' ')
    );
  }

  function findCreatorFields() {
    const direct = uploadQueryAll('input[placeholder="支持关联本人投稿或开放的番剧、课程"]')
      .find(creatorElementVisible);
    if (direct) {
      let container = direct.parentElement;
      for (let depth = 0; container && depth < 6; depth++, container = container.parentElement) {
        const title = container.querySelector('input[placeholder="输入描述文案"]');
        if (title && creatorElementVisible(title)) return { bv: direct, title };
      }
    }
    const editors =
      visibleEditors();

    if (
      editors.length < 2
    ) {
      return null;
    }

    // 同一组输入框清空后继续使用，避免标签变化导致识别失败。
    if (
      creatorFields &&
      editors.includes(creatorFields.bv) &&
      editors.includes(creatorFields.title)
    ) {
      return creatorFields;
    }
    creatorFields = null;

    const bvPattern =
      /(关联视频\s*(?:ID)?\s*[／/]?\s*链接|关联视频|视频\s*ID\s*[／/]?\s*链接|BV号|BV\s*ID)/i;

    const titlePattern =
      /(描述文案|关联描述|视频描述)/i;

    const bvByLabel =
      editorBelowLabel(
        bvPattern,
        editors
      );

    const titleByLabel =
      editorBelowLabel(
        titlePattern,
        editors,
        bvByLabel
      );

    if (
      bvByLabel &&
      titleByLabel &&
      bvByLabel !== titleByLabel
    ) {
      creatorFields = { bv: bvByLabel, title: titleByLabel };
      return creatorFields;
    }

    const bvList =
      editors.filter(
        editor =>
          bvPattern.test(
            fieldText(editor)
          )
      );

    const titleList =
      editors.filter(
        editor =>
          titlePattern.test(
            fieldText(editor)
          )
      );

    let best = null;

    for (
      const bv of bvList
    ) {
      for (
        const title of titleList
      ) {
        if (bv === title) {
          continue;
        }

        const common =
          commonAncestor(
            bv,
            title
          );

        if (!common) {
          continue;
        }

        const text =
          clean(
            common.textContent
          );

        if (
          !bvPattern.test(text) ||
          !titlePattern.test(text)
        ) {
          continue;
        }

        const distance =
          Math.abs(
            bv.getBoundingClientRect().top -
            title.getBoundingClientRect().top
          );

        const score =
          elementDepth(common) *
            100 -
          distance -
          text.length / 10;

        if (
          !best ||
          score > best.score
        ) {
          best = {
            bv,
            title,
            score
          };
        }
      }
    }

    creatorFields = best ? { bv: best.bv, title: best.title } : null;
    return creatorFields;
  }

  function editorBelowLabel(
    pattern,
    editors,
    excluded = null
  ) {
    const labels = [
      ...(isMember ? uploadQueryAll : selector => document.querySelectorAll(selector))(
        [
          'label',
          'div',
          'span',
          'p',
          'h1',
          'h2',
          'h3',
          'h4'
        ].join(',')
      )
    ].filter(element => {
      const text =
        clean(
          element.textContent
        );

      if (
        !text ||
        text.length > 45 ||
        !pattern.test(text)
      ) {
        return false;
      }

      const rect =
        element.getBoundingClientRect();

      const style =
        getComputedStyle(element);

      if (
        rect.width <= 1 ||
        rect.height <= 1 ||
        style.display === 'none' ||
        style.visibility === 'hidden'
      ) {
        return false;
      }

      return ![
        ...element.children
      ].some(child => {
        const childText =
          clean(
            child.textContent
          );

        return (
          childText.length <= 45 &&
          pattern.test(childText)
        );
      });
    });

    let best = null;

    for (
      const label of labels
    ) {
      if (
        label instanceof
          HTMLLabelElement &&
        label.htmlFor
      ) {
        const linked =
          document.getElementById(
            label.htmlFor
          );

        if (
          editors.includes(linked) &&
          linked !== excluded
        ) {
          return linked;
        }
      }

      const labelRect =
        label.getBoundingClientRect();

      for (
        const editor of editors
      ) {
        if (
          editor === excluded
        ) {
          continue;
        }

        const editorRect =
          editor.getBoundingClientRect();

        const verticalGap =
          editorRect.top -
          labelRect.bottom;

        const horizontalGap =
          Math.abs(
            editorRect.left -
            labelRect.left
          );

        const overlapsHorizontally =
          editorRect.right >=
            labelRect.left - 20 &&
          editorRect.left <=
            labelRect.right + 320;

        if (
          verticalGap < -10 ||
          verticalGap > 180 ||
          !overlapsHorizontally
        ) {
          continue;
        }

        const score =
          verticalGap +
          horizontalGap * 0.08;

        if (
          !best ||
          score < best.score
        ) {
          best = {
            editor,
            score
          };
        }
      }
    }

    return (
      best?.editor ||
      null
    );
  }

  function commonAncestor(
    first,
    second
  ) {
    const parents =
      new Set();

    let node = first;

    while (node) {
      parents.add(node);

      node =
        node.parentElement;
    }

    node = second;

    while (node) {
      if (
        parents.has(node)
      ) {
        return node;
      }

      node =
        node.parentElement;
    }

    return null;
  }

  function elementDepth(
    element
  ) {
    let depth = 0;

    while (
      element?.parentElement
    ) {
      depth += 1;

      element =
        element.parentElement;
    }

    return depth;
  }

  function editorValue(editor) {
    return editor instanceof HTMLInputElement || editor instanceof HTMLTextAreaElement
      ? editor.value
      : clean(editor.textContent);
  }

  function nativeValue(
    editor,
    value
  ) {
    const prototype =
      editor instanceof
        HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;

    const setter =
      Object.getOwnPropertyDescriptor(
        prototype,
        'value'
      )?.set;

    if (setter) {
      setter.call(
        editor,
        value
      );
    } else {
      editor.value = value;
    }
  }

  function fireInput(
    editor,
    text
  ) {
    try {
      editor.dispatchEvent(
        new InputEvent(
          'input',
          {
            bubbles: true,
            composed: true,
            inputType:
              'insertFromPaste',
            data: text
          }
        )
      );
    } catch (_) {
      editor.dispatchEvent(
        new Event(
          'input',
          {
            bubbles: true,
            composed: true
          }
        )
      );
    }

    editor.dispatchEvent(
      new Event(
        'change',
        {
          bubbles: true,
          composed: true
        }
      )
    );
  }

  function replaceValue(
    editor,
    text
  ) {
    if (
      !editor?.isConnected
    ) {
      return false;
    }

    editor.focus();

    if (
      editor instanceof
        HTMLInputElement ||
      editor instanceof
        HTMLTextAreaElement
    ) {
      nativeValue(
        editor,
        text
      );

      try {
        editor.setSelectionRange(
          text.length,
          text.length
        );
      } catch (_) {}

      fireInput(
        editor,
        text
      );

      return (
        editor.value === text
      );
    }

    const selection =
      getSelection();

    const range =
      document.createRange();

    range.selectNodeContents(
      editor
    );

    selection?.removeAllRanges();
    selection?.addRange(range);

    let done = false;

    try {
      done =
        document.execCommand(
          'insertText',
          false,
          text
        );
    } catch (_) {}

    if (!done) {
      editor.textContent = text;
    }

    fireInput(
      editor,
      text
    );

    return (
      clean(
        editor.textContent
      ) === clean(text)
    );
  }

  /* ==================== 上传简介与菜单 ==================== */

  function uploadSettings(value) {
    return {
      secondLine: String(value?.secondLine || '').replace(/[\r\n]+/g, ' ').trim(),
      autoSecondLine: false
    };
  }

  function isUploadPage() {
    return isMember && /\/(?:platform\/upload\/video|video\/videoup)(?:\/|$)/.test(location.pathname);
  }

  function uploadQueryAll(selector) {
    // 上传页由 micro-app 托管。先走原生 DOM 查询，绕开页面改写的查询方法。
    const roots = [document];
    const found = new Set();
    for (let i = 0; i < roots.length; i += 1) {
      const root = roots[i];
      const view = root.ownerDocument?.defaultView || root.defaultView || window;
      const query = root.nodeType === 9
        ? view.Document.prototype.querySelectorAll
        : root.nodeType === 11
          ? view.DocumentFragment.prototype.querySelectorAll
          : view.Element.prototype.querySelectorAll;
      for (const editor of query.call(root, selector)) found.add(editor);
      for (const element of query.call(root, '*')) {
        if (element.shadowRoot && !element.id.startsWith('biliclip-')) roots.push(element.shadowRoot);
        if (element.tagName === 'IFRAME') {
          try {
            if (element.contentDocument && !roots.includes(element.contentDocument)) roots.push(element.contentDocument);
          } catch (_) {}
        }
      }
    }
    return [...found];
  }

  function findUploadFields() {
    if (!isUploadPage()) return null;
    const available = editor => {
      if (!editor.isConnected || editor.disabled || editor.readOnly) return false;
      const rect = editor.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };
    // 简介专用查询独立于 visibleEditors，不能先被通用输入框筛选排除。
    const descriptions = uploadQueryAll(
      '[editor_id="desc_at_editor"] .ql-editor[contenteditable="true"], ' +
      '.desc-container .ql-editor[contenteditable="true"], ' +
      '.desc-text-wrp .ql-editor[contenteditable="true"]'
    );
    const description = descriptions.find(available);
    const title = uploadQueryAll('input[placeholder="请输入稿件标题"], input[placeholder*="标题"]')
      .find(available);
    if (description) return { title, description };

    // 兼容非 Quill 版简介，仍限定为简介字段，避免写入动态。
    const fallback = uploadQueryAll('textarea[placeholder*="简介"], [contenteditable="true"][data-placeholder*="简介"]')
      .find(available);
    return fallback ? { title, description: fallback } : null;
  }

  function syncTagPreset() {
    if (isUploadPage()) {
      const { title, description } = findUploadFields() || {};
      const tags = uploadQueryAll(TAG_INPUT_SELECTOR)
        .find(input => input.getClientRects().length && input.getRootNode() === description?.getRootNode());
      if (description && tags) {
        let row = description;
        while (row.parentElement && !row.parentElement.contains(tags)) row = row.parentElement;
        const form = row.parentElement;
        if (form && form !== row.ownerDocument.body && !row.contains(tags) &&
            (tags.compareDocumentPosition(row) & 4) && !row.contains(tagPresetRow)) {
          if (!tagPresetRow || tagPresetRow.ownerDocument !== row.ownerDocument) {
            tagPresetRow = createTagPresetRow(row.ownerDocument);
          }
          if (row.previousElementSibling !== tagPresetRow) row.before(tagPresetRow);
          syncClearUploadTags(tags, form);
          const bounds = tagPresetRow.getBoundingClientRect();
          const field = (description.closest('.ql-container, .desc-text-wrp') || title || description).getBoundingClientRect();
          const label = [...row.querySelectorAll('label, span, div')]
            .find(element => !element.children.length && element.textContent.trim() === '简介' &&
              element.getBoundingClientRect().width > 0);
          const labelLeft = label?.getBoundingClientRect().left ?? (bounds.left + 24);
          const scale = bounds.width / tagPresetRow.offsetWidth || 1;
          tagPresetRow.style.setProperty('--label-offset', `${Math.max(0, (labelLeft - bounds.left) / scale)}px`);
          tagPresetRow.style.setProperty('--field-offset', `${Math.max(0, (field.left - bounds.left) / scale)}px`);
          tagPresetRow.style.setProperty('--field-end', `${Math.max(0, (bounds.right - field.right) / scale)}px`);
          return;
        }
      }
    }
    tagPresetRow?.remove();
    clearTagsBar?.remove();
  }

  function createTagPresetRow(doc) {
    const row = doc.createElement('div');
    row.id = 'biliclip-tag-preset';
    row.style.cssText = 'display:block; min-width:0; margin:8px 0 0; padding:0';
    const root = row.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <style>
        :host { font:14px/1.5 system-ui, sans-serif; }
        .preset { display:grid; grid-template-columns:minmax(0, var(--field-offset, 146px)) minmax(0, 1fr);
          align-items:start; padding-right:var(--field-end, 0px); color:#b82d58; font:14px/1.5 system-ui, sans-serif; }
        .label { padding:9px 6px 0 var(--label-offset, 24px); overflow-wrap:anywhere; font-weight:400; }
        .entry { display:flex; align-items:center; gap:8px; padding:4px 6px;
          margin-bottom:8px; min-height:30px; border:1px solid #fb7299; border-radius:4px; }
        .tags { display:flex; flex:1; min-width:0; flex-wrap:wrap; align-items:center; gap:6px; }
        input, button { color:#b82d58; font:14px/1.5 system-ui, sans-serif; }
        input { box-sizing:border-box; flex:1 1 140px; min-width:0; border:0; padding:3px 6px; }
        button { cursor:pointer; border:1px solid #fb7299; background:white; border-radius:4px;
          padding:3px 9px; white-space:nowrap; }
        button:hover:not(:disabled) { background:#fff0f4; }
        .chip .remove:hover { background:#ffffff55; }
        button:disabled { opacity:.5; cursor:default; }
        .chip { display:inline-flex; align-items:center; gap:4px; padding:3px 6px; border-radius:4px;
          max-width:100%; overflow-wrap:anywhere; background:#fb7299; color:#3b1020; }
        .remove { color:inherit; background:transparent; border:0; padding:0 3px; }
        [role="status"] { margin-top:4px; font-size:12px; }
      
        ${NATIVE_UI_CSS}
      </style>
      <div class="preset">
        <span class="label" id="preset-label">${PANEL_LOGO}喵贴·预设标签</span>
        <div role="group" aria-labelledby="preset-label">
          <div class="entries"></div>
          <button class="add" type="button">＋ 增加一条预设</button>
          <div role="status"></div>
        </div>
      </div>`;
    const entries = root.querySelector('.entries');
    const add = root.querySelector('.add');
    const status = root.querySelector('[role="status"]');
    const saved = GM_getValue(TAG_PRESET_KEY, '');
    const splitTags = value => [...new Set(value.split(/[,，、；;\n]+/).map(tag => tag.trim()).filter(Boolean))];
    const presets = Array.isArray(saved)
      ? saved.filter(Array.isArray).slice(0, MAX_TAG_PRESETS).map(tags => tags.filter(tag => typeof tag === 'string'))
      : [splitTags(typeof saved === 'string' ? saved : '')];
    const persist = () => GM_setValue(TAG_PRESET_KEY, presets);

    async function execute(tags) {
      const buttons = [...entries.querySelectorAll('.execute, .delete-preset')];
      buttons.forEach(button => { button.disabled = true; });
      add.disabled = true;
      status.textContent = '正在执行…';
      try {
        await applyTagPreset(row, [...tags], message => { status.textContent = message; });
      } catch (_) {
        status.textContent = '执行中断，请核对标签栏';
      } finally {
        buttons.forEach(button => { button.disabled = false; });
        add.disabled = presets.length >= MAX_TAG_PRESETS;
      }
    }

    function appendPreset(tags) {
      const entry = doc.createElement('div');
      entry.className = 'entry';
      entry.innerHTML = `<button class="delete-preset" type="button" aria-label="删除整条预设">删除</button>
        <div class="tags"><input type="text" placeholder="输入标签后按回车"
        aria-label="预设标签"></div>
        <button class="execute" type="button">执行</button>`;
      const input = entry.querySelector('input');
      const renderTags = () => {
        entry.querySelectorAll('.chip').forEach(chip => chip.remove());
        tags.forEach((tag, index) => {
          const chip = doc.createElement('span');
          chip.className = 'chip';
          chip.textContent = tag;
          const remove = doc.createElement('button');
          remove.className = 'remove';
          remove.type = 'button';
          remove.textContent = '×';
          remove.setAttribute('aria-label', `删除标签 ${tag}`);
          remove.addEventListener('click', () => {
            tags.splice(index, 1);
            persist();
            renderTags();
            input.focus();
          });
          chip.append(remove);
          input.before(chip);
        });
      };
      input.addEventListener('keydown', event => {
        if (event.key !== 'Enter' || event.isComposing || event.keyCode === 229) return;
        event.preventDefault();
        event.stopPropagation();
        const tag = input.value.trim();
        if (!tag) return;
        if (tags.includes(tag)) {
          toast('该标签已存在，请输入其他标签', 'pink', 1800, input);
          return;
        }
        if (tags.length >= MAX_PRESET_TAGS) {
          toast('标签已达上限，请先删除不需要的标签', 'pink', 1800, input);
          return;
        }
        tags.push(tag);
        input.value = '';
        persist();
        renderTags();
      });
      entry.querySelector('.delete-preset').addEventListener('click', () => {
        presets.splice(presets.indexOf(tags), 1);
        persist();
        const next = entry.nextElementSibling || entry.previousElementSibling;
        entry.remove();
        add.disabled = presets.length >= MAX_TAG_PRESETS;
        (next?.querySelector('.delete-preset') || add).focus();
        status.textContent = '已删除预设';
      });
      entry.querySelector('.execute').addEventListener('click', () => {
        if (tags.length) void execute(tags);
        else status.textContent = '请先输入标签并按回车';
      });
      renderTags();
      entries.append(entry);
      return input;
    }

    presets.forEach(appendPreset);
    add.disabled = presets.length >= MAX_TAG_PRESETS;
    add.addEventListener('click', () => {
      if (presets.length >= MAX_TAG_PRESETS) return;
      const tags = [];
      presets.push(tags);
      persist();
      appendPreset(tags).focus();
      add.disabled = presets.length >= MAX_TAG_PRESETS;
    });
    return row;
  }

  function uploadTagField(form) {
    const input = [...form.querySelectorAll(TAG_INPUT_SELECTOR)].find(field => field.getClientRects().length);
    for (let box = input?.parentElement; box && box !== form; box = box.parentElement) {
      const counter = box.textContent.match(/还可以添加\s*(\d+)\s*个标签/);
      if (!counter) continue;
      const remaining = Number(counter[1]);
      if (remaining > MAX_PRESET_TAGS) return null;
      const selector = 'button, [role="button"], [class*="close"], [class*="delete"], [class*="remove"], i, svg, span';
      const chips = new Map();
      const iconFallbacks = new Map();
      for (const control of box.querySelectorAll(selector)) {
        if (control.compareDocumentPosition(input) !== 4 || !control.getClientRects().length) continue;
        const marker = [control.getAttribute('class'), control.getAttribute('title'), control.getAttribute('aria-label'),
          control.querySelector('use')?.getAttribute('href'), control.querySelector('use')?.getAttribute('xlink:href')].join(' ');
        const explicit = /close|delete|remove|删除|移除/i.test(marker) || /^[×✕✖]$/.test(control.textContent.trim());
        if (!explicit && !control.matches('i, svg')) continue;
        let chip = control.parentElement;
        while (chip && chip !== box && !chip.contains(input)) {
          const label = chip.textContent.trim().replace(/[×✕✖]$/, '').trim();
          if (label) {
            const candidates = explicit ? chips : iconFallbacks;
            if (!candidates.has(chip)) candidates.set(chip, { label, control });
            break;
          }
          chip = chip.parentElement;
        }
      }
      if (chips.size < MAX_PRESET_TAGS - remaining) {
        for (const [chip, candidate] of iconFallbacks) {
          if (!chips.has(chip)) chips.set(chip, candidate);
        }
      }
      return { input, box, remaining, chips: [...chips.values()] };
    }
    return null;
  }

  function syncClearUploadTags(input, form) {
    const field = uploadTagField(form);
    if (!field || field.input !== input) {
      clearTagsBar?.remove();
      return;
    }
    const doc = input.ownerDocument;
    if (clearTagsBar?.ownerDocument !== doc) {
      clearTagsBar?.remove();
      clearTagsBar = doc.createElement('div');
      clearTagsBar.id = 'biliclip-clear-upload-tags';
      clearTagsBar.style.cssText = 'display:flex;justify-content:flex-end;margin:0 0 4px';
      const root = clearTagsBar.attachShadow({ mode: 'open' });
      root.innerHTML = `<style>
        button { font:14px/1.5 system-ui,sans-serif; color:#ff6699; background:white;
          border:1px solid #ff6699; border-radius:4px; padding:3px 9px; cursor:pointer; }
        button:hover:not(:disabled) { background:#fff0f4; }
        button:disabled { opacity:.5; cursor:default; }
      
        ${NATIVE_UI_CSS}
      </style><button type="button">删除所有标签</button>`;
      root.querySelector('button').addEventListener('click', () => void clearUploadTags());
    }
    if (field.box.previousElementSibling !== clearTagsBar) field.box.before(clearTagsBar);
    clearTagsBar.shadowRoot.querySelector('button').disabled = uploadTagsBusy || field.remaining === MAX_PRESET_TAGS;
  }

  async function clearUploadTags() {
    if (uploadTagsBusy || !isUploadPage()) return;
    uploadTagsBusy = true;
    const bar = clearTagsBar;
    const button = bar.shadowRoot.querySelector('button');
    button.disabled = true;
    const form = tagPresetRow.parentElement;
    try {
      for (let i = 0; i < MAX_PRESET_TAGS && bar.isConnected && isUploadPage(); i += 1) {
        const field = uploadTagField(form);
        if (!field || field.remaining === MAX_PRESET_TAGS) break;
        if (field.chips.length !== MAX_PRESET_TAGS - field.remaining) break;
        field.chips[0].control.dispatchEvent(new field.input.ownerDocument.defaultView.MouseEvent('click', {
          bubbles: true, cancelable: true, composed: true
        }));
        await new Promise(resolve => setTimeout(resolve, 80));
        if ((uploadTagField(form)?.remaining ?? -1) <= field.remaining) break;
      }
      const cleared = uploadTagField(form)?.remaining === MAX_PRESET_TAGS;
      toast(cleared ? '已删除所有投稿标签' : '未能删除全部标签，请核对标签栏', 'pink', 1800, bar);
    } finally {
      uploadTagsBusy = false;
      button.disabled = uploadTagField(form)?.remaining === MAX_PRESET_TAGS;
    }
  }

  async function applyTagPreset(row, tags, report) {
    if (uploadTagsBusy || !row.isConnected || !isUploadPage()) return report('请等待当前标签操作结束');
    const form = row.parentElement;
    const initial = uploadTagField(form);
    if (!initial) return report('未读取到投稿标签的剩余名额');
    if (!initial.remaining) return report('投稿标签栏已达到上限');
    if (initial.input.value) return report('请先处理投稿标签输入框中的文字');

    uploadTagsBusy = true;
    let submitted = 0;
    try {
      for (const tag of tags) {
        if (!row.isConnected || !isUploadPage()) break;
        const field = uploadTagField(form);
        if (!field?.remaining || field.input.value) break;
        if (field.chips.some(chip => chip.label === tag)) continue;
        const { input } = field;
        if (input.disabled || input.readOnly) break;
        const view = input.ownerDocument.defaultView;
        const setValue = Object.getOwnPropertyDescriptor(view.HTMLInputElement.prototype, 'value').set;
        setValue.call(input, tag);
        input.dispatchEvent(new view.Event('input', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 0));
        if (!row.isConnected || !input.isConnected || input.value !== tag) break;
        input.dispatchEvent(new view.KeyboardEvent('keydown', {
          key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true
        }));
        // B 站可能异步校验标签。等余量减少且输入框清空，再提交下一项。
        let confirmed = false;
        for (let check = 0; check < 60 && row.isConnected && isUploadPage(); check += 1) {
          await new Promise(resolve => setTimeout(resolve, 50));
          const updated = uploadTagField(form);
          if (!updated || !row.isConnected || !isUploadPage()) break;
          if (!updated.input.value && updated.remaining < field.remaining) {
            confirmed = updated.chips.some(chip => chip.label === tag) ||
              updated.chips.length < MAX_PRESET_TAGS - updated.remaining;
            break;
          }
        }
        if (!confirmed) {
          report(`已添加 ${submitted} 个标签。「${tag}」未确认添加，已暂停后续标签，请核对标签栏`);
          return;
        }
        submitted += 1;
        if (submitted >= initial.remaining) break;
      }
    } finally {
      uploadTagsBusy = false;
    }
    report(`已添加 ${submitted} 个标签，请核对标签栏`);
  }

  function descriptionText(editor) {
    if (editor.classList.contains('ql-editor')) {
      return [...editor.children].map(block => block.textContent || '').join('\n');
    }
    return (editor instanceof HTMLTextAreaElement ? editor.value : editor.innerText)
      .replace(/\r\n?/g, '\n');
  }

  function descriptionLines(text, title, preset) {
    const lines = text.split('\n');
    if (title !== null) lines[0] = title;
    if (preset !== null) {
      if (!lines.length) lines.push('');
      lines[1] = preset;
    }
    return lines.join('\n');
  }

  function writeDescription(editor, text, automatic = false) {
    if (descriptionText(editor) === text) return true;
    if (editor instanceof HTMLTextAreaElement) {
      nativeValue(editor, text);
      fireInput(editor, text);
    } else {
      // execCommand 让富文本编辑器同步内部状态，并保留换行。
      const previous = document.activeElement;
      replaceValue(editor, text);
      if (automatic && previous instanceof HTMLElement && previous.isConnected) previous.focus();
    }
    return descriptionText(editor) === text;
  }

  function fillUploadDescription(withTitle = true) {
    const fields = findUploadFields();
    if (!fields) return toast(isUploadPage() ? '未找到简介框，请等待视频上传完成后重试' : '请先进入 B 站视频上传页', 'pink', 3200);
    const title = withTitle ? clean(fields.title?.value) : null;
    if (withTitle && !title) return toast('请先填写上传视频的标题', 'pink');
    if (!withTitle && !uploadPrefs.secondLine) return toast('请先在「上传简介设置」中保存第二行预设', 'pink');
    const preset = uploadPrefs.secondLine || null;
    const text = descriptionLines(descriptionText(fields.description), title, preset);
    const done = writeDescription(fields.description, text);
    toast(done ? '✓ 简介已填入，请检查后再投稿' : '简介填入未完成，请检查编辑器内容', done ? 'blue' : 'pink', 2600);
  }

  function openUploadSettings() {
    document.getElementById('biliclip-settings-host')?.remove();
    const host = document.createElement('div');
    host.id = 'biliclip-settings-host';
    host.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#0006;display:grid;place-items:center';
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <style>
        *{box-sizing:border-box}section{width:min(460px,90vw);padding:24px;border-radius:16px;background:white;color:#18191c;font:14px/1.6 system-ui,sans-serif;box-shadow:0 16px 60px #0003}
        h2{margin:0 0 12px;font-size:20px}p{color:#61666d}input[type=text]{width:100%;padding:10px;border:1px solid #ccd0d7;border-radius:8px;margin:8px 0 16px}label{display:block}footer{display:flex;justify-content:flex-end;gap:10px;margin-top:20px}button{border:0;border-radius:8px;padding:9px 16px;cursor:pointer}button[type=submit]{background:#00aeec;color:white}
      
        ${NATIVE_UI_CSS}
      </style>
      <section role="dialog" aria-modal="true" aria-labelledby="heading">
        <form><h2 id="heading">喵贴 · 上传简介设置</h2>
          <p>一键填入会将上传页标题写入简介第一行，并填入已保存的第二行预设。第三行及以后的文字保留。</p>
          <label>简介第二行预设<input type="text" name="preset" placeholder="例如：关注我，获取更多精彩内容"></label>
          <p>仅在点击一键执行或填入菜单时写入简介。</p>
          <footer><button type="button" id="cancel">取消</button><button type="submit">保存设置</button></footer>
        </form>
      </section>`;
    const input = root.querySelector('[name=preset]');
    input.value = uploadPrefs.secondLine;
    root.querySelector('#cancel').onclick = () => host.remove();
    host.addEventListener('keydown', event => { if (event.key === 'Escape') host.remove(); });
    root.querySelector('form').onsubmit = event => {
      event.preventDefault();
      uploadPrefs = uploadSettings({ secondLine: input.value, autoSecondLine: false });
      GM_setValue(UPLOAD_KEY, uploadPrefs);
      autoFilledDescriptions = new WeakSet();
      host.remove();
      toast('✓ 上传简介设置已保存');
    };
    document.body.appendChild(host);
    input.focus();
  }

  /* ==================== 8.2.0 上传页右侧悬浮面板 ==================== */

  function clickUploadControl(element) {
    const view = element.ownerDocument.defaultView;
    for (const type of ['mousedown', 'mouseup', 'click']) {
      element.dispatchEvent(new view.MouseEvent(type, {bubbles:true, cancelable:true, composed:true, view, button:0}));
    }
  }

  async function waitUploadElement(find) {
    for (let i = 0; i < 25; i += 1) {
      const result = find();
      if (result) return result;
      await new Promise(resolve => setTimeout(resolve, 60));
    }
    return null;
  }

  async function applyKnowledge(automatic = false) {
    if (!isUploadPage() || knowledgeBusy || declarationBusy) return false;
    const getControl = () => uploadQueryAll('.video-human-type .select-item-cont')
      .find(e => e.getBoundingClientRect().width > 0);
    const control = getControl();
    if (!control) {
      if (!automatic) toast('未找到分区选择框', 'pink');
      return false;
    }
    if (automatic && knowledgeApplied.has(control)) return true;
    if (clean(control.textContent) === '知识') {
      knowledgeApplied.add(control);
      return true;
    }
    const tries = knowledgeAttempts.get(control) || 0;
    if (automatic && tries >= 3) return false;
    knowledgeAttempts.set(control, automatic ? tries + 1 : 0);
    knowledgeBusy = true;
    const getChoice = () => uploadQueryAll('.drop-list-v2-item[title="知识"]')
      .find(e => e.getBoundingClientRect().height > 0);
    try {
      if (!getChoice()) {
        control.scrollIntoView?.({block:'nearest'});
        clickUploadControl(control);
      }
      const choice = await waitUploadElement(getChoice);
      if (!choice) throw new Error('分区菜单未出现知识选项');
      clickUploadControl(choice);
      const selected = await waitUploadElement(() => {
        // Vue 可能更换控件节点，不能检查点击前保存的旧节点。
        const current = getControl();
        return current && clean(current.textContent) === '知识' ? current : null;
      });
      if (!selected) throw new Error('页面未确认知识分区');
      knowledgeApplied.add(selected);
      knowledgeAttempts.delete(control);
      if (!automatic) toast('✓ 分区已选择「知识」');
      return true;
    } catch (error) {
      if (!automatic) toast(`分区选择未完成：${error.message}`, 'pink', 2600);
      return false;
    } finally {
      knowledgeBusy = false;
    }
  }

  /* 创作声明：主声明单选，授权声明独立勾选。 */
  function declarationSettings(value) {
    const choices = ['内容无需标注', '含AI生成内容', '含虚构演绎内容', '内容含营销信息', '个人观点，仅供参考', '内容为转载'];
    return { main: choices.includes(value?.main) ? value.main : '', copyright: value?.copyright === true, auto: value?.auto === true };
  }

  function declarationSelected(option) {
    if (!option) return false;
    if (option.matches('.auth-content')) {
      return !!option.querySelector('.option-text-selected');
    }
    const aria = option.getAttribute('aria-selected') ?? option.getAttribute('aria-checked');
    if (aria !== null) return aria === 'true';
    return option.classList.contains('selected') || option.classList.contains('is-selected');
  }

  async function applyDeclaration(automatic = false, request = {}) {
    if (declarationBusy || !isUploadPage()) return false;
    const prefs = { ...(request.prefs || declarationPrefs) };
    if (request.copyrightOnly) prefs.main = '';
    const getInput = () => uploadQueryAll('input[placeholder*="创作声明"]')
      .find(e => e.getBoundingClientRect().width > 0);
    const input = getInput();
    if (!input) {
      if (!automatic) toast('未找到创作声明，请等待上传表单出现', 'pink');
      return false;
    }
    const signature = JSON.stringify(prefs);
    if (automatic && declarationApplied.get(input) === signature) return true;
    if (!prefs.main && !prefs.copyright && !request.copyrightOnly) return true;
    declarationBusy = true;
    declarationApplied.set(input, signature);
    const container = () => getInput()?.closest('.bcc-select');
    const options = () => [...(container()?.querySelectorAll('.bcc-option') || [])];
    // 授权声明不是 li.bcc-option，而是独立的 div.auth-content。
    const getAuth = () => container()?.querySelector('.auth-content');
    const show = async () => {
      if (!options().some(e => e.getBoundingClientRect().height > 0)) clickUploadControl(getInput());
      if (!await waitUploadElement(() => options().find(e => e.getBoundingClientRect().height > 0))) {
        throw new Error('声明菜单未展开');
      }
    };
    const setAuth = async enabled => {
      await show();
      const auth = getAuth();
      if (!auth) throw new Error('未找到授权声明控件');
      if (declarationSelected(auth) !== enabled) clickUploadControl(auth);
      if (!await waitUploadElement(() => {
        const current = getAuth();
        return current && declarationSelected(current) === enabled ? current : null;
      })) throw new Error('授权声明状态未更新');
    };
    try {
      if (prefs.main === '内容为转载' && prefs.copyright) throw new Error('转载稿件不能添加自制授权声明');
      // 先取消授权，才能从其他主声明切换到「内容为转载」。
      if (!prefs.copyright) await setAuth(false);
      if (prefs.main) {
        await show();
        const option = options().find(e => clean(e.textContent) === prefs.main);
        if (!option) throw new Error('未找到对应主声明');
        if (option.classList.contains('is-disabled')) throw new Error('主声明当前不可选');
        if (!declarationSelected(option)) clickUploadControl(option);
        if (!await waitUploadElement(() => {
          const current = options().find(e => clean(e.textContent) === prefs.main);
          return current && declarationSelected(current) ? current : null;
        })) throw new Error('主声明状态未更新');
      }
      if (prefs.copyright) await setAuth(true);
      const complete = (!prefs.main || declarationSelected(options().find(e => clean(e.textContent) === prefs.main))) &&
        declarationSelected(getAuth()) === prefs.copyright;
      if (!complete) throw new Error('页面未确认声明组合');
      declarationApplied.set(getInput(), signature);
      if (!automatic) toast(request.copyrightOnly ? (prefs.copyright ? '✓ 已添加禁止转载声明' : '✓ 已取消禁止转载声明') : '✓ 主声明与授权声明已设置');
      return true;
    } catch (error) {
      if (!automatic) toast(`声明未完成：${error.message}`, 'pink', 3000);
      return false;
    } finally {
      if (options().some(e => e.getBoundingClientRect().height > 0)) clickUploadControl(getInput());
      declarationBusy = false;
    }
  }

  function creatorNavigationRight() {
    const elements = new Set(document.querySelectorAll('.slider-bar-wrap, .nav-slider, .nav-wrap, .bcc-nav, .cc-nav, .sidebar, .left-nav, nav, aside'));
    const upload = document.getElementById('nav_upload_btn');
    for (let node = upload?.parentElement; node && node !== document.body; node = node.parentElement) elements.add(node);
    const edges = [...elements].map(element => element.getBoundingClientRect())
      .filter(rect => rect.width > 60 && rect.width < Math.min(480, innerWidth * .6) && rect.left < 80 && rect.right > 0 && rect.height > 140)
      .map(rect => rect.right);
    return edges.length ? Math.max(...edges) : Math.min(208, innerWidth * .3);
  }

  function constrainManagementLibrary(host, root) {
    if (!isManuscriptManagementPage()) return;
    const left = creatorNavigationRight() + 12;
    const available = Math.max(0, innerWidth - left - 8);
    const panel = root.querySelector('aside');
    const tab = root.querySelector('.tab');
    if (panel) panel.style.maxWidth = available + 'px';
    if (tab) { tab.style.maxWidth = available + 'px'; tab.style.whiteSpace = 'normal'; }
    host.style.left = Math.max(left, Math.min(parseFloat(host.style.left) || left, innerWidth - host.offsetWidth - 8)) + 'px';
  }

  function enablePanelMovement(host, root, side) {
    const key = 'biliclip_panel_position_v3_' + side;
    const saved = GM_getValue(key, null);
    host.biliclipUserAdjusted = !!saved;
    let manuallyPlaced = Number.isFinite(saved?.x) && Number.isFinite(saved?.y);
    const nav = [...document.querySelectorAll('.nav-slider, .nav-wrap, .bcc-nav, .sidebar, nav, aside')]
      .map(element => element.getBoundingClientRect())
      .filter(rect => rect.width > 80 && rect.width < 300 && rect.left < 60 && rect.height > 200);
    const safeLeft = Math.max(208, ...nav.map(rect => rect.right + 12));
    const initialX = () => side === 'left' ? (innerWidth < 980 ? 8 : safeLeft) : innerWidth - host.offsetWidth - 16;
    const place = (x, y) => {
      host.style.left = Math.max(8, Math.min(x, innerWidth - host.offsetWidth - 8)) + 'px';
      host.style.top = Math.max(76, Math.min(y, innerHeight - host.offsetHeight - 12)) + 'px';
      if (side === 'left') constrainManagementLibrary(host, root);
    };
    host.style.position = 'fixed';
    host.style.right = 'auto';
    host.style.transform = 'none';
    const layout = () => place(parseFloat(host.style.left), parseFloat(host.style.top));
    place(manuallyPlaced ? saved.x : initialX(), manuallyPlaced ? saved.y : (innerHeight - host.offsetHeight) / 2);
    let drag = null;
    let suppressClick = false;
    const handles = [root.querySelector('header'), root.querySelector('.tab')];
    for (const handle of handles) {
      handle.style.cursor = 'grab';
      handle.style.touchAction = 'none';
      handle.title = '按住拖动面板';
      handle.addEventListener('pointerdown', event => {
        if (event.button !== 0 || (handle.tagName !== 'BUTTON' && event.target.closest('button,input,a,select,textarea'))) return;
        suppressClick = false;
        const rect = host.getBoundingClientRect();
        drag = { id: event.pointerId, x: event.clientX, y: event.clientY,
          left: rect.left, top: rect.top, moved: false };
        handle.setPointerCapture(event.pointerId);
      });
      handle.addEventListener('pointermove', event => {
        if (!drag || event.pointerId !== drag.id) return;
        const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
        if (!drag.moved && Math.hypot(dx, dy) < 5) return;
        drag.moved = true;
        manuallyPlaced = true;
        host.biliclipUserAdjusted = true;
        suppressClick = true;
        handle.style.cursor = 'grabbing';
        place(drag.left + dx, drag.top + dy);
        host.biliclipDockToEditor?.();
        const menu = root.querySelector('.declaration-menu');
        if (menu?.matches(':popover-open')) menu.hidePopover();
        event.preventDefault();
      });
      const finish = event => {
        if (!drag || event.pointerId !== drag.id) return;
        if (drag.moved) GM_setValue(key, { x: parseFloat(host.style.left), y: parseFloat(host.style.top) });
        drag = null;
        handle.style.cursor = 'grab';
        if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
      };
      handle.addEventListener('pointerup', finish);
      handle.addEventListener('pointercancel', finish);
      handle.addEventListener('lostpointercapture', finish);
    }
    root.addEventListener('click', event => {
      if (!suppressClick) return;
      suppressClick = false;
      event.preventDefault(); event.stopImmediatePropagation();
    }, true);
    const observer = new MutationObserver(layout);
    observer.observe(host, { attributes: true, attributeFilter: ['data-collapsed'] });
    // Detached panels must not retain window listeners after SPA navigation.
    const resize = () => {
      if (!host.isConnected) { window.removeEventListener('resize', resize); observer.disconnect(); return; }
      layout();
    };
    window.addEventListener('resize', resize);
    const sizeObserver = new ResizeObserver(() => {
      if (!host.isConnected) { sizeObserver.disconnect(); return; }
      layout();
    });
    sizeObserver.observe(root.querySelector(side === 'left' ? 'aside' : '.panel'));
    host.biliclipLayout = layout;
    enablePanelResize(host, root, side);
  }

  function panelResizeBounds(rect, edge, dx, dy, viewportWidth, viewportHeight) {
    const minWidth = Math.min(260, Math.max(160, (viewportWidth - 32) / 2), viewportWidth - 16), minHeight = Math.min(220, viewportHeight - 88);
    let left = rect.left, top = rect.top, right = rect.left + rect.width, bottom = rect.top + rect.height;
    if (edge.includes('w')) left = Math.max(8, Math.min(right - minWidth, left + dx));
    if (edge.includes('e')) right = Math.min(viewportWidth - 8, Math.max(left + minWidth, right + dx));
    if (edge.includes('n')) top = Math.max(76, Math.min(bottom - minHeight, top + dy));
    if (edge.includes('s')) bottom = Math.min(viewportHeight - 12, Math.max(top + minHeight, bottom + dy));
    return { left, top, width: right - left, height: bottom - top };
  }

  function enablePanelResize(host, root, side) {
    const panel = root.querySelector(side === 'left' ? 'aside' : '.panel');
    const sizeKey = 'biliclip_panel_size_v3_' + side;
    const saved = GM_getValue(sizeKey, null);
    const fit = (width, height) => {
      panel.style.width = Math.min(innerWidth - 16, Math.max(Math.min(260, Math.max(160, (innerWidth - 32) / 2), innerWidth - 16), width)) + 'px';
      panel.style.height = Math.min(innerHeight - 88, Math.max(Math.min(220, innerHeight - 88), height)) + 'px';
    };
    fit(Number.isFinite(saved?.width) ? saved.width : Math.min(280, innerWidth - 24),
      Number.isFinite(saved?.height) ? saved.height : Math.min(side === 'left' ? 500 : 460, innerHeight * .6));
    panel.style.resize = 'none';
    host.biliclipLayout?.();
    const style = document.createElement('style');
    style.textContent = `
      :host{container-type:normal}aside,.panel{display:flex;flex-direction:column;overflow:hidden;container-type:inline-size;min-width:0;max-width:calc(100vw - 16px);max-height:calc(100vh - 88px)}
      header{flex:none;position:relative}.body{min-height:0;flex:1;overflow:auto}
      .resize-handle{position:absolute;z-index:10;touch-action:none;user-select:none}
      :host([data-collapsed]) .resize-handle{display:none}
      .resize-n,.resize-s{left:8px;right:8px;height:8px;cursor:ns-resize}.resize-n{top:-4px}.resize-s{bottom:-4px}
      .resize-e,.resize-w{top:8px;bottom:8px;width:8px;cursor:ew-resize}.resize-e{right:-4px}.resize-w{left:-4px}
      .resize-ne,.resize-nw,.resize-se,.resize-sw{width:14px;height:14px}
      .resize-ne{top:-4px;right:-4px;cursor:nesw-resize}.resize-sw{bottom:-4px;left:-4px;cursor:nesw-resize}
      .resize-nw{top:-4px;left:-4px;cursor:nwse-resize}.resize-se{bottom:-4px;right:-4px;cursor:nwse-resize}
      #list{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));align-content:start;gap:0 14px}
      .item{grid-template-columns:64px minmax(0,1fr) auto;grid-template-rows:auto auto auto;align-content:start;gap:3px 8px;padding:10px 0}
      .item>.cover{grid-column:1;grid-row:1 / 3;width:64px;height:42px}
      .item>.title{grid-column:2;grid-row:1;line-height:1.45}
      .item>.bv{grid-column:2;grid-row:2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:0}
      .item>.meta{grid-column:1 / 3;grid-row:3;margin:2px 0 0;gap:4px 10px}
      .item>.actions{grid-column:3!important;grid-row:1 / 4;flex-direction:column;justify-content:center;gap:5px}
      .actions button{padding:5px 9px;font-size:12px;white-space:nowrap;border:1px solid #dceaf1;background:#fff}
      .actions button:first-child{background:#00aeec;color:white;border-color:#00aeec}
      .row{grid-template-columns:58px minmax(0,1fr)}.toggle{min-width:0}.copyright-row{margin-left:66px}
      @container(min-width:480px){.row{grid-template-columns:86px minmax(0,1fr);gap:16px}.copyright-row{margin-left:102px}.body{padding:18px}.hint,.status{font-size:12px}}
    `;
    root.append(style);
    const position = GM_getValue('biliclip_panel_position_v3_' + side, null);
    if (!Number.isFinite(position?.x) || !Number.isFinite(position?.y)) {
      if (side === 'right') host.style.left = Math.max(8,innerWidth-panel.offsetWidth-16)+'px';
      host.style.top = Math.max(76,(innerHeight-panel.offsetHeight)/2)+'px';
    }
    for (const edge of ['n','s','e','w','ne','nw','se','sw']) {
      const handle = document.createElement('div');
      handle.className = 'resize-handle resize-' + edge;
      handle.title = '拖动调整面板大小';
      let start = null;
      handle.addEventListener('pointerdown', event => {
        if (event.button !== 0) return;
        event.preventDefault(); event.stopPropagation();
        host.biliclipUserAdjusted = true;
        const rect = host.getBoundingClientRect();
        start = { rect: {left:rect.left,top:rect.top,width:panel.offsetWidth,height:panel.offsetHeight}, x:event.clientX, y:event.clientY };
        handle.setPointerCapture(event.pointerId);
      });
      handle.addEventListener('pointermove', event => {
        if (!start) return;
        const next = panelResizeBounds(start.rect, edge, event.clientX-start.x, event.clientY-start.y, innerWidth, innerHeight);
        Object.assign(host.style, {left:next.left+'px',top:next.top+'px'});
        fit(next.width,next.height);
        if (side === 'left') constrainManagementLibrary(host,root);
        if (host.biliclipDockToEditor) host.biliclipDockToEditor();
      });
      const end = event => {
        if (!start) return;
        start = null;
        GM_setValue(sizeKey,{width:panel.offsetWidth,height:panel.offsetHeight});
        GM_setValue('biliclip_panel_position_v3_' + side,{x:parseFloat(host.style.left),y:parseFloat(host.style.top)});
        if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
        event.preventDefault();event.stopPropagation();
      };
      handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',end);
      root.append(handle);
    }
    const resize = () => {
      if (!host.isConnected) { window.removeEventListener('resize',resize); return; }
      fit(panel.offsetWidth,panel.offsetHeight);host.biliclipLayout?.();host.biliclipDockToEditor?.();
    };
    window.addEventListener('resize',resize);
  }

  function isManuscriptManagementPage() {
    return isMember && /\/(?:platform\/upload-manager|platform\/archive|platform\/manager)(?:\/|$)/.test(location.pathname);
  }

  function isVideoPickerPage() {
    return (isManuscriptManagementPage() || isUploadPage()) && creatorEditorFrames().some(({frame}) => creatorElementVisible(frame));
  }

  function creatorElementVisible(element) {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== 'hidden';
  }

  const moreSettingsAttempted = new WeakSet();
  function expandCreatorMoreSettings(force = false, enabled = true) {
    if (!isUploadPage() || (!force && GM_getValue('biliclip_expand_more_settings', false) !== true)) return;
    const candidates = uploadQueryAll('button, [role="button"], [aria-expanded], .more-setting-title, .more-settings-title, .more-setting, .more-settings, span, div');
    const control = candidates.find(element => {
      const label = clean(element.textContent);
      return /^(?:展开)?更多设置/.test(label) && label.length < 100 && creatorElementVisible(element) &&
        ![...element.children].some(child => /更多设置/.test(child.textContent));
    });
    if (!control || (!force && moreSettingsAttempted.has(control))) return false;
    const target = control.closest('button, [role="button"], [aria-expanded], .more-setting-title, .more-settings-title') || control.closest('.label') || control;
    const scope = target.parentElement?.parentElement;
    const expanded = target.getAttribute('aria-expanded') === 'true' || /收起/.test(target.textContent) ||
      !!(scope && [...scope.querySelectorAll('button')].some(button => /个性化卡片|上传字幕/.test(button.textContent) && creatorElementVisible(button)));
    if (expanded === enabled) return true;
    moreSettingsAttempted.add(control);
    clickUploadControl(target);
    return true;
  }

  function positionInitialWorkbench(host) {
    if (!host || host.biliclipUserAdjusted) return;
    const fields = uploadQueryAll('input[placeholder="请输入稿件标题"], .desc-container, [editor_id="desc_at_editor"]')
      .filter(creatorElementVisible).map(element => element.getBoundingClientRect());
    if (!fields.length) return;
    const right = Math.max(...fields.map(rect => rect.right));
    const top = Math.max(76, Math.min(...fields.map(rect => rect.top)));
    const gap = innerWidth - right - 24;
    const panel = host.shadowRoot?.querySelector('.panel');
    if (!panel) return;
    if (gap >= 180) {
      panel.style.width = Math.min(280,gap) + 'px';
      host.style.left = (right + 12) + 'px';
    } else {
      host.setAttribute('data-collapsed','');
      host.style.left = Math.max(8,innerWidth-host.offsetWidth-12)+'px';
      host.style.top = Math.max(76,top-42)+'px';
    }
  }

  // Reserve space outside the card dialog instead of falling back to covering it.
  let personalizationDock = null;
  function reservePersonalizationRail(editor, width) {
    if (!editor) {
      if (personalizationDock) {
        Object.assign(personalizationDock.box.style,personalizationDock.style);
        personalizationDock = null;
      }
      return null;
    }
    let box = editor;
    let rect = editor.getBoundingClientRect();
    for (let node=editor.parentElement; node && node!==document.body; node=node.parentElement) {
      const r=node.getBoundingClientRect();
      if (r.width>=rect.width && r.width<innerWidth-12 && r.height>120 && r.left>=0 && r.top>=0) {box=node;rect=r;}
    }
    if (box !== editor && (rect.left < width+8 || personalizationDock?.box===box)) {
      if (personalizationDock?.box!==box) {
        reservePersonalizationRail(null,0);
        personalizationDock={box,style:{width:box.style.width,maxWidth:box.style.maxWidth,minWidth:box.style.minWidth,translate:box.style.translate,boxSizing:box.style.boxSizing}};
      }
      box.style.translate='0px';
      const available=Math.max(200,innerWidth-width-24);
      box.style.width=Math.min(rect.width,available)+'px';
      box.style.maxWidth=available+'px';box.style.minWidth='0';box.style.boxSizing='border-box';
      rect=box.getBoundingClientRect();
      box.style.translate=(width+8-rect.left)+'px 0';
      rect=box.getBoundingClientRect();
    }
    return rect;
  }

  function dockPersonalizationPanels(picker, assistant) {
    const editor = isManuscriptManagementPage() ? null : creatorEditorFrames().map(entry => entry.frame).find(creatorElementVisible);
    if (!editor) reservePersonalizationRail(null,0);
    for (const host of [picker, assistant].filter(Boolean)) {
      if (!editor) {
        host.biliclipDockToEditor = null;
        if (host.biliclipBeforeDock) {
          Object.assign(host.style, host.biliclipBeforeDock);
          host.biliclipBeforeDock = null;
        }
        continue;
      }
      if (!host.biliclipBeforeDock) host.biliclipBeforeDock = { left:host.style.left, top:host.style.top, zIndex:host.style.zIndex };
      if (host === assistant) {
        // The upload assistant belongs to the underlying upload page while editing cards.
        host.style.zIndex = '1';
      } else {
        const dock = () => {
          const rect = reservePersonalizationRail(editor,host.offsetWidth);
          host.style.left = (rect.left-host.offsetWidth) + 'px';
          host.style.top = Math.max(76, Math.min(rect.top, innerHeight - host.offsetHeight - 12)) + 'px';
        };
        host.biliclipDockToEditor = dock;
        dock();
      }
    }
  }

  async function applyCommercialPromotion(enabled) {
    const label = uploadQueryAll('label.bcc-checkbox').find(element => /增加商业推广信息/.test(element.textContent));
    const input = label?.querySelector('input[type="checkbox"]');
    if (!input) return false;
    if (input.checked !== enabled) clickUploadControl(label);
    await new Promise(resolve => setTimeout(resolve, 80));
    return input.checked === enabled;
  }

  function ensureAssociationExpanded() {
    const input = document.querySelector('input[placeholder="支持关联本人投稿或开放的番剧、课程"]');
    if (input && creatorElementVisible(input)) return;
    if (input) {
      let parent = input.parentElement;
      for (let depth = 0; parent && depth < 7; depth++, parent = parent.parentElement) {
        const header = [...parent.querySelectorAll('[class*="header"], [class*="title"]')]
          .find(element => /^关联视频/.test(clean(element.textContent)) && creatorElementVisible(element));
        if (header) { clickUploadControl(header); return; }
      }
    }
    const existingHeader = [...document.querySelectorAll('div, span')].find(element => {
      if (clean(element.textContent) !== '关联视频' || !creatorElementVisible(element)) return false;
      const headerText = clean(element.parentElement?.textContent);
      return headerText.length < 160 && /\d{2}:\d{2}:\d{2}/.test(headerText);
    });
    if (existingHeader) { clickUploadControl(existingHeader); return; }
    // Selecting the video tab should reveal its settings without another manual click.
    const add = [...document.querySelectorAll('button, div, span')].find(element =>
      /^[+＋]?\s*添加关联视频$/.test(clean(element.textContent)) && creatorElementVisible(element) &&
      ![...element.children].some(child => /添加关联视频/.test(child.textContent)));
    if (add) clickUploadControl(add);
  }

  let associationWasOpen = false;
  function syncCreatorPanelContext() {
    const picker = document.getElementById('biliclip-video-picker');
    const assistant = document.getElementById('biliclip-upload-panel');
    if (!picker && !assistant) { associationWasOpen = false; return; }
    const fields = findCreatorFields();
    const associationOpen = !!fields;
    if (associationOpen && !associationWasOpen) picker?.removeAttribute('data-collapsed');
    associationWasOpen = associationOpen;
    // No overlay on the upload landing page (resume/discard/upload controls), or on
    // a native confirmation dialog. Show again automatically once editing begins.
    const editing = !isUploadPage() || !!uploadQueryAll('input[placeholder*="标题"], [editor_id="desc_at_editor"], .desc-container').find(creatorElementVisible);
    const dialogs = uploadQueryAll('[role="dialog"], .bcc-dialog, .bili-dialog, .el-dialog, .bcc-modal').filter(element => creatorElementVisible(element) && /继续编辑|放弃|不用了|确认删除|确认投稿|确认发布|确定删除/.test(element.textContent));
    const critical = uploadQueryAll('button, a, [role="button"]')
      .filter(element => /^(继续编辑|放弃|不用了|上传视频|确认投稿|立即投稿|发布)$/.test(clean(element.textContent)) && creatorElementVisible(element));
    for (const host of [picker, assistant].filter(Boolean)) {
      host.style.display = editing && !dialogs.length ? 'block' : 'none';
      if (host.style.display === 'none') continue;
      host.biliclipLayout?.();
      const rect = host.getBoundingClientRect();
      const blocked = critical.some(element => {
        const r = element.getBoundingClientRect();
        return rect.left < r.right && rect.right > r.left && rect.top < r.bottom && rect.bottom > r.top;
      });
      if (blocked) host.style.display = 'none';
    }
    positionInitialWorkbench(assistant);
    dockPersonalizationPanels(picker, assistant);
    if (assistant) {
      assistant.style.zIndex = '1';
      const popup = uploadQueryAll('[role="dialog"], [aria-modal="true"], dialog[open], [popover], .bcc-dialog, .bcc-modal, .bili-dialog, .el-dialog, .bcc-popover, .bcc-select-dropdown')
        .some(element => element.id !== 'biliclip-walkthrough' && creatorElementVisible(element) && (!element.hasAttribute('popover') || element.matches(':popover-open')));
      const cardOpen = creatorEditorFrames().some(({frame}) => creatorElementVisible(frame));
      if (popup || cardOpen) assistant.style.display = 'none';
    }
    if (picker && isManuscriptManagementPage()) constrainManagementLibrary(picker,picker.shadowRoot);
    expandCreatorMoreSettings();
  }

  document.addEventListener('click', event => {
    if (!isBili || event.composedPath().some(node => node?.id?.startsWith?.('biliclip-'))) return;
    const associationClick = event.composedPath().some(node => /^(?:[+＋]\s*)?(?:添加)?关联视频$/.test(clean(node?.textContent)));
    if (associationClick) {
      // The button guide waits for the user to click Add; do not add a card implicitly.
      setTimeout(() => document.getElementById('biliclip-video-picker')?.removeAttribute('data-collapsed'), 100);
    }
  }, true);

  // FindMyBV inspired workflow: read-only creator archives, account-scoped cache,
  // local title/BV filtering. Implementation is specific to BiliClip's paired fields.
  let pickerState = null;

  function pickerVideos(rows) {
    const videos = new Map();
    for (const row of rows) {
      const item = row?.Archive || row?.archive || row;
      if (!/^BV[0-9A-Za-z]{10}$/.test(item?.bvid || '') || !clean(item.title)) continue;
      videos.set(item.bvid, { bv: item.bvid, aid: String(item.aid || row?.aid || ''), title: clean(item.title), created: Number(item.ptime || item.pubdate || item.ctime || item.created) || 0, cover: pickerCover(item.cover || item.pic), duration: Number(item.duration) || 0, play: Number(row?.stat?.view ?? item.stat?.view ?? item.play) || 0 });
    }
    return [...videos.values()].sort((a, b) => b.created - a.created);
  }

  function pickerCover(value) {
    try {
      const url = new URL(String(value || '').replace(/^\/\//, 'https://'));
      return /^https?:$/.test(url.protocol) && /(^|\.)hdslb\.com$/i.test(url.hostname) ? url.href : '';
    } catch (_) { return ''; }
  }

  function pickerTime(seconds) {
    if (!seconds) return '';
    const date = new Date(seconds * 1000);
    if (!Number.isFinite(date.getTime())) return '';
    const currentYear = new Date().getFullYear();
    return (date.getFullYear() === currentYear ? '' : date.getFullYear() + '年') +
      (date.getMonth() + 1) + '月' + date.getDate() + '日';
  }

  function pickerDuration(seconds) {
    return Math.floor(seconds / 60) + ':' + String(Math.floor(seconds % 60)).padStart(2, '0');
  }

  function pickerPlay(count) {
    return count >= 10000 ? (count / 10000).toFixed(1) + '万' : String(count);
  }

  function pickerCollections(rows) {
    const items = new Map();
    for (const row of rows) {
      const m = row?.meta || row;
      const kind = m?.kind || (m?.season_id ? 'season' : 'series');
      const id = String(m?.id || m?.season_id || m?.series_id || '');
      if (!/^[1-9]\d*$/.test(id) || !['season','series'].includes(kind) || !clean(m?.name || m?.title)) continue;
      items.set(kind + id, {id,kind,title:clean(m.name || m.title),cover:pickerCover(m.cover || row.cover),count:Math.max(0,Number(m.total ?? m.count) || 0)});
    }
    return [...items.values()];
  }

  function pickerApi(path, params) {
    return new Promise((resolve,reject) => {
      GM_xmlhttpRequest({method:'GET',url:'https://api.bilibili.com'+path+'?'+new URLSearchParams(params),
        headers:{Referer:'https://space.bilibili.com/'},timeout:15000,
        onload:response=>{try {
          if(response.status!==200) throw new Error('HTTP '+response.status);
          const json=JSON.parse(response.responseText);
          if(json.code!==0 || !json.data) throw new Error(json.message || '接口返回异常');
          resolve(json.data);
        }catch(error){reject(error);}},
        onerror:()=>reject(new Error('网络请求失败')),ontimeout:()=>reject(new Error('请求超时'))});
    });
  }

  async function loadPickerRecentVideos(onPage = () => {}, alive = () => true) {
    const collected=[];
    for (let page=1;page<=2;page++) {
      if (!alive()) return pickerVideos(collected);
      const response=await fetch('https://member.bilibili.com/x/web/archives?status=pubed&pn='+page+'&ps=50&coop=1&interactive=1',
        {credentials:'include',cache:'no-store',signal:AbortSignal.timeout(15000)});
      if (!response.ok) throw new Error('HTTP '+response.status);
      const json=await response.json();
      if(json.code!==0 || !Array.isArray(json.data?.arc_audits)) throw new Error(json.message || '请确认已登录');
      const rows=json.data.arc_audits;collected.push(...rows);
      onPage(pickerVideos(collected));
      const total=Number(json.data.page?.count)||0;
      if(!rows.length || (total ? page*50>=total : rows.length<50)) break;
    }
    return pickerVideos(collected);
  }

  async function loadPickerCollections(uid, onPage = () => {}, startPage = 1) {
    if (!/^\d+$/.test(String(uid || ''))) throw new Error('请先登录');
    const collected=[];
    for(let page=startPage;page<startPage+2;page++) {
      const data=await pickerApi('/x/polymer/web-space/seasons_series_list',{mid:uid,page_num:page,page_size:20});
      const lists=data.items_lists;
      if(!lists || !Array.isArray(lists.seasons_list) || !Array.isArray(lists.series_list)) throw new Error('合集数据格式变化');
      const rows=[...lists.seasons_list,...lists.series_list];collected.push(...rows);
      onPage(pickerCollections(collected));
      const total=Number(lists.page?.total)||0;
      if(!rows.length || (total ? page*20>=total : rows.length<20)) return pickerCollections(collected);
      if (page < startPage + 1) await new Promise(resolve=>setTimeout(resolve,200));
    }
    return pickerCollections(collected);
  }

  async function loadPickerCollectionVideos(uid, collection, onPage = () => {}, startPage = 1) {
    if (!/^\d+$/.test(String(uid || '')) || !/^[1-9]\d*$/.test(collection.id)) throw new Error('合集或账号无效');
    const collected=[];
    for(let page=startPage;page<startPage+2;page++) {
      const series=collection.kind==='series';
      const data=await pickerApi(series?'/x/series/archives':'/x/polymer/web-space/seasons_archives_list',series?
        {mid:uid,series_id:collection.id,pn:page,ps:30,only_normal:true,sort:'desc'}:
        {mid:uid,season_id:collection.id,page_num:page,page_size:30,sort_reverse:false});
      if(!Array.isArray(data.archives)) throw new Error('合集视频数据格式变化');
      collected.push(...data.archives);
      onPage(pickerVideos(collected));
      const total=Number(data.page?.total ?? data.meta?.total ?? collection.count)||0;
      if(!data.archives.length || (total ? page*30>=total : data.archives.length<30)) return pickerVideos(collected);
      if (page < startPage + 1) await new Promise(resolve=>setTimeout(resolve,200));
    }
    return pickerVideos(collected);
  }

  function pickerScore(title, query) {
    const text = clean(title).toLowerCase();
    const terms = clean(query).toLowerCase().match(/[a-z0-9]+|[\u4e00-\u9fff]{2}|[\u4e00-\u9fff]/g) || [];
    return [...new Set(terms)].reduce((score, term) => score + (text.includes(term) ? term.length : 0), 0);
  }

  function syncVideoPicker() {
    let host = document.getElementById('biliclip-video-picker');
    if (!isVideoPickerPage()) { host?.remove(); pickerState = null; return; }
    if (!document.body) return;
    const account = document.cookie.match(/(?:^|;\s*)DedeUserID=(\d+)/)?.[1] || '';
    if (host && host.dataset.account !== account) { host.remove(); host = null; pickerState = null; }
    if (host) {
      const title = clean(findUploadFields()?.title?.value);
      const draft = currentCreatorDraft();
      if (pickerState && (pickerState.uploadTitle !== title || pickerState.draft.bv !== draft.bv || pickerState.draft.aid !== draft.aid)) {
        pickerState.uploadTitle = title;
        pickerState.draft = draft;
        pickerState.render();
      }
      return;
    }
    host = document.createElement('div');
    host.id = 'biliclip-video-picker';
    host.dataset.account = account;
    host.style.cssText = 'all:initial;position:fixed;left:208px;top:160px;z-index:2147483645;max-width:calc(100vw - 32px)';
    const root = host.attachShadow({ mode: 'open' });
    for (const type of ['mousedown', 'mouseup', 'click']) host.addEventListener(type, event => event.stopPropagation());
    root.innerHTML = `
      <style>
        :host{color-scheme:light}*{box-sizing:border-box}
        ${PANEL_LOGO_CSS}
        aside{width:280px;max-width:calc(100vw - 32px);max-height:calc(100vh - 160px);overflow:auto;background:white;color:#18191c;border:1px solid #e3e8ef;border-radius:14px;box-shadow:0 8px 30px #182a4426;font:13px/1.5 system-ui,"PingFang SC",sans-serif}
        header{position:sticky;top:0;background:#fff;z-index:1;display:flex;align-items:center;justify-content:space-between;padding:12px;border-bottom:1px solid #eef1f5}h2{font-size:14px;margin:0}.body{padding:12px}
        button,input{font:inherit}button{border:0;border-radius:7px;background:#edf7fc;color:#008abc;padding:6px 9px;cursor:pointer}button:disabled{opacity:.5;cursor:wait}input{width:100%;border:1px solid #dce1e8;border-radius:7px;padding:8px;background:white;color:#18191c}
        .tools{display:flex;gap:6px;margin:8px 0}.status,.hint{font-size:11px;color:#61666d;margin:8px 0;overflow-wrap:anywhere}.cover{grid-row:1 / 5;width:76px;height:48px;object-fit:cover;border-radius:6px;background:#f1f4f8}.meta{display:flex;flex-wrap:wrap;gap:4px 8px;align-items:center;font-size:11px;color:#9499a0;margin:5px 0}.meta svg{width:12px;height:12px;vertical-align:-2px;margin-right:3px}.item{display:grid;grid-template-columns:76px minmax(0,1fr);gap:2px 8px;border-top:1px solid #eef1f5;padding:8px 0}.item>.title,.item>.bv,.item>.meta,.item>.actions{grid-column:2;min-width:0}.title{overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.bv{font-size:11px;color:#9499a0;margin:4px 0}.actions{display:flex;gap:6px;flex-wrap:nowrap;grid-column:1 / -1!important;justify-content:flex-end}.actions button{font-size:11px;padding:4px 6px}.tab{display:none}:host([data-collapsed]) aside{display:none}:host([data-collapsed]) .tab{display:block}
        ${ACTION_FEEDBACK_CSS}
        .item{grid-template-columns:clamp(48px,24%,76px) minmax(0,1fr) 70px}
        .cover{grid-row:1 / 3;width:100%}
        .item>.meta{grid-column:1 / 3}
        .item>.actions{grid-column:3!important;grid-row:1 / 4;align-self:center;display:grid;gap:4px}
        ${VIDEO_ACTION_COLORS}
        .item>.actions .action-button,.item>.actions .play-link{display:grid;place-items:center;min-inline-size:70px;
          min-height:30px;padding:4px 8px;border:0;border-radius:7px;font:400 14px/20px system-ui,sans-serif;text-decoration:none}
        .item>.actions .action-button{background:var(--biliclip-video-blue);color:#fff}
        .item>.actions .action-button:hover{background:#008dbf}
        .item>.actions .play-link{background:var(--biliclip-video-pink);color:#fff}
        .item>.actions .play-link:hover{background:#f45f8c}
        .title-tip{position:fixed;z-index:2;max-width:min(320px,calc(100vw - 20px));padding:7px 10px;
          border:1px solid #e3e8ef;border-radius:8px;background:#fff;color:#18191c;
          box-shadow:0 4px 16px #182a4426;font:12px/1.5 system-ui,sans-serif;overflow-wrap:anywhere;pointer-events:none}

        #status:empty{display:none}#back{margin:4px 0} .tools button{white-space:nowrap}
        :focus-visible{outline:2px solid #00aeec;outline-offset:2px}
        aside{width:400px}
        .search-row{display:flex;align-items:center;gap:10px}.search-row label{white-space:nowrap;font-size:13px;color:#18191c}
        .tools{border-bottom:1px solid #e3e5e7;gap:16px;margin:10px 0 0}
        .tools button{background:transparent;border-radius:0;color:#61666d;padding:8px 2px;border-bottom:2px solid transparent}
        .tools button[aria-pressed=true]{color:#0078a3;border-bottom-color:#00aeec;font-weight:600}
        #refresh{margin-left:auto;order:3}.collection{display:flex;align-items:center;gap:10px;width:100%;padding:12px 0;border-bottom:1px solid #e3e5e7;background:white;text-align:left;color:#18191c}
        .collection img{width:72px;height:46px;object-fit:cover;border-radius:4px}.collection span{flex:1;min-width:0;overflow-wrap:anywhere}
        .collection:hover{background:#f1f2f3}
        .item{grid-template-columns:minmax(72px,30%) minmax(0,1fr) 54px;gap:3px 10px;padding:12px 0}
        .cover-wrap{grid-column:1;grid-row:1 / 4;position:relative;align-self:start;aspect-ratio:16/10;background:#f1f2f3;border-radius:6px;overflow:hidden}
        .cover-wrap .cover{width:100%;height:100%;object-fit:cover}
        .duration{position:absolute;bottom:3px;right:4px;padding:0 3px;border-radius:3px;background:#18191ccc;color:white;font-size:11px}
        .item>.title{font-size:14px;font-weight:600}.item>.bv,.item>.meta{grid-column:2;margin:0;font-size:12px}
        .item>.actions{grid-row:1 / 4}.item>.actions .action-button,.item>.actions .play-link{min-inline-size:54px;padding:4px;min-height:30px;font-size:13px;color:#fff}
        .empty{padding:28px 8px;text-align:center;color:#61666d}.library-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;border-top:1px solid #e3e5e7;padding-top:8px;font-size:11px;color:#61666d}
        #load-more{color:#0078a3;background:transparent}.status[data-state=error]{color:#a12650}.status[data-state=loading]::before{content:'◌ ';color:#0078a3}
        #retry{color:#a12650;background:#fff0f4;margin-bottom:8px}
        #back{background:#e5f6fc;color:#0078a3}#breadcrumb{font-size:12px;color:#61666d;padding:6px 0;overflow-wrap:anywhere}
        @media(max-width:900px){aside{width:320px}.item{grid-template-columns:80px minmax(0,1fr) 48px}.item>.actions .action-button,.item>.actions .play-link{min-inline-size:48px}}
        @media(max-width:400px){aside{width:calc(100vw - 32px)}.search-row{gap:6px}.item{gap:3px 6px}}

      
        ${NATIVE_UI_CSS}
      </style>
      <button type="button" class="tab">${PANEL_LOGO}喵贴 · 关联视频库</button>
      <aside aria-label="关联视频库"><header><h2>${PANEL_LOGO}喵贴 · 关联视频库</h2><button type="button" id="collapse" aria-label="收起视频面板">−</button></header>
      <div class="body"><div class="search-row"><label id="search-label" for="query">搜索视频</label><input id="query" type="search" placeholder="搜索我的视频标题 / BV" aria-label="搜索视频标题或 BV"></div>
      <div class="tools"><button type="button" id="refresh">刷新</button><button type="button" id="videos">我的视频</button><button type="button" id="collections">合集</button></div>
      <button type="button" id="back" hidden>← 返回合集</button><div id="breadcrumb" hidden></div><div id="status" class="status" role="status" aria-live="polite"></div><button type="button" id="retry" hidden>重试</button><div id="list"></div><div class="library-foot"><button type="button" id="load-more" hidden>加载更多 ›</button><span>当前稿件自动排除，避免关联自己</span></div></div></aside>
      <div id="title-tip" class="title-tip" aria-hidden="true" hidden></div>`;
    const get = id => root.getElementById(id);
    const titleTip = get('title-tip');
    const hideTitleTip = () => { titleTip.hidden = true; };
    const positionTitleTip = event => {
      if (titleTip.hidden) return;
      const margin = 10;
      const gap = 13;
      const x = Math.max(margin, Math.min(event.clientX + gap, innerWidth - titleTip.offsetWidth - margin));
      const below = event.clientY + gap;
      const y = below + titleTip.offsetHeight <= innerHeight - margin
        ? below
        : Math.max(margin, event.clientY - gap - titleTip.offsetHeight);
      titleTip.style.left = `${x}px`;
      titleTip.style.top = `${y}px`;
    };
    root.querySelector('aside').addEventListener('scroll', hideTitleTip, true);

    const uid = document.cookie.match(/(?:^|;\s*)DedeUserID=(\d+)/)?.[1];
    const cacheKey = uid ? 'biliclip_my_videos_v1_' + uid : null;
    const state = { videos: [], draft: currentCreatorDraft(), uploadTitle: clean(findUploadFields()?.title?.value), busy: false, render: null, mode: 'videos', collections: [], collectionVideos: [], selected: null, collectionBusy: false, request: 0 };
    pickerState = state;
    let statusTimer;
    const status = text => {
      clearTimeout(statusTimer);
      get('status').textContent = text;
      get('status').dataset.state = /失败|未填入|未找到/.test(text) ? 'error' : /正在/.test(text) ? 'loading' : 'ready';
      get('retry').hidden = !/加载失败/.test(text);
      if (text && !document.getElementById('biliclip-walkthrough') && !/正在|失败|未填入|未找到|登录/.test(text)) {
        statusTimer = setTimeout(() => { get('status').textContent = ''; }, 2500);
      }
    };
    state.render = () => {
      hideTitleTip();
      const query = clean(get('query').value).toLowerCase();
      get('back').hidden = state.mode !== 'collection';
      get('breadcrumb').hidden = state.mode !== 'collection';
      get('breadcrumb').textContent = state.mode === 'collection' ? '合集 / ' + state.selected.title : '';
      get('search-label').textContent = state.mode === 'collections' ? '搜索合集' : '搜索视频';
      get('query').placeholder = state.mode === 'collections' ? '搜索合集名称' : '搜索我的视频标题 / BV';
      get('videos').setAttribute('aria-pressed', String(state.mode === 'videos'));
      get('collections').setAttribute('aria-pressed', String(state.mode !== 'videos'));
      get('list').setAttribute('aria-busy', String(!!state.loading?.has(viewKey())));
      get('load-more').hidden = !state.more?.[viewKey()];
      get('refresh').disabled = !!state.loading?.has(viewKey());
      get('back').title = state.mode === 'collection' ? state.selected.title : '';
      get('list').replaceChildren();
      if (state.mode === 'collections') {
        for (const collection of state.collections.filter(c => !query || c.title.toLowerCase().includes(query))) {
          const button = document.createElement('button'); button.type = 'button'; button.className = 'collection';
          if (collection.cover) {
            const image = document.createElement('img'); image.src = collection.cover; image.alt = ''; image.loading = 'lazy'; image.referrerPolicy = 'no-referrer'; button.append(image);
          }
          const label = document.createElement('span'); label.textContent = collection.title + ' · ' + collection.count + ' 个视频';
          button.append(label, document.createTextNode('›'));
          button.onclick = () => openCollection(collection); get('list').append(button);
        }
        if (!get('list').childNodes.length) get('list').textContent = state.collections.length ? '没有匹配的合集' : '暂无合集';
        return;
      }
      const draft = state.draft;
      const currentBV = draft.bv || creatorDraftBVs.get(draft.aid);
      const videos = (state.mode === 'collection' ? state.collectionVideos : state.videos)
        .filter(v => v.bv !== currentBV && (!draft.aid || v.aid !== draft.aid))
        .filter(v => !query || v.title.toLowerCase().includes(query) || v.bv.toLowerCase().includes(query));
      if (!draft.bv && draft.aid && state.resolvingDraftAid !== draft.aid) {
        state.resolvingDraftAid = draft.aid;
        void resolveCreatorDraftBV(draft.aid).then(bv => {
          const active = currentCreatorDraft();
          if (bv && host.isConnected && active.aid === draft.aid) state.render();
        });
      }

      get('list').replaceChildren();
      for (const video of videos.slice(0, 100)) {
        const item = document.createElement('div'); item.className = 'item';
        const title = document.createElement('div'); title.className = 'title'; title.textContent = video.title;
        title.addEventListener('pointerenter', event => {
          if (event.pointerType === 'touch' || title.scrollHeight <= title.clientHeight) return;
          titleTip.textContent = video.title;
          titleTip.hidden = false;
          positionTitleTip(event);
        });
        title.addEventListener('pointermove', positionTitleTip);
        title.addEventListener('pointerleave', hideTitleTip);
        const bv = document.createElement('div'); bv.className = 'bv'; bv.textContent = video.bv;
        const actions = document.createElement('div'); actions.className = 'actions';
        const fill = document.createElement('button');
        fill.type = 'button';
        fill.className = 'action-button';
        fill.innerHTML = actionButtonLabel('填入');
        fill.title = '填入 BV + 标题';
        fill.addEventListener('mousedown', event => event.preventDefault());
        fill.onclick = async () => {
          const active = currentCreatorDraft();
          const bv = active.bv || creatorDraftBVs.get(active.aid);
          if (video.bv === bv || (active.aid && video.aid === active.aid)) {
            setButtonFeedback(fill, '不可自关联', 'error');
            return;
          }
          fill.disabled = true;
          setButtonFeedback(fill, '填入中…', 'pending');
          try {
            const ok = await fillCreatorPair(video);
            setButtonFeedback(fill, ok ? '已填入' : '未填入', ok ? 'success' : 'error');
            if (!ok) status('未填入，请先打开关联视频的链接和描述输入框后重试');
            else status('');
          } catch (_) {
            setButtonFeedback(fill, '填入失败', 'error');
            status('填入失败，请检查关联视频输入框后重试');
          } finally {
            fill.disabled = false;
          }
        };
        const playLink = document.createElement('a');
        playLink.className = 'play-link';
        playLink.href = `https://www.bilibili.com/video/${video.bv}/`;
        playLink.target = '_blank';
        playLink.rel = 'noopener noreferrer';
        playLink.textContent = '播放';
        playLink.setAttribute('aria-label', `在新标签页播放：${video.title}`);
        actions.append(fill, playLink);
        const coverWrap = document.createElement('div'); coverWrap.className = 'cover-wrap';
        if (video.cover) {
          const cover = document.createElement('img'); cover.className = 'cover'; cover.src = video.cover;
          cover.alt = ''; cover.loading = 'lazy'; cover.referrerPolicy = 'no-referrer'; coverWrap.append(cover);
        }
        if (video.duration > 0) { const duration = document.createElement('span'); duration.className = 'duration'; duration.textContent = pickerDuration(video.duration); coverWrap.append(duration); }
        item.append(coverWrap);
        const meta = document.createElement('div'); meta.className = 'meta';
        const time = document.createElement('span'); time.textContent = pickerTime(video.created);
        const play = document.createElement('span');
        play.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1" y="2" width="14" height="12" rx="3" fill="none" stroke="currentColor"/><path d="m6 5 5 3-5 3z" fill="currentColor"/></svg>';
        play.append(document.createTextNode(pickerPlay(video.play) + ' 播放')); meta.append(time, play);
        item.append(title, bv, meta, actions); get('list').append(item);
      }
      if (!videos.length) get('list').textContent = (state.mode === 'collection' ? state.collectionVideos.length : state.videos.length) ? '没有匹配的视频' : '暂无视频，可刷新或选择其他合集';
      if (videos.length > 100) { const hint = document.createElement('div'); hint.textContent = '仅显示前 100 条，请输入关键词缩小范围'; get('list').append(hint); }
    };
    get('query').oninput = state.render;
    const collectionsKey = uid ? 'biliclip_collections_v1_' + uid : null;
    const viewKey = () => state.mode === 'collection' ? state.selected.kind + ':' + state.selected.id : state.mode;
    state.loaded = new Set(); state.loading = new Set(); state.more = {}; state.pages = {}; state.records = new Map();
    const collectionCache = collectionsKey && GM_getValue(collectionsKey, null);
    if (Array.isArray(collectionCache?.items)) {
      state.collections = pickerCollections(collectionCache.items); state.loaded.add('collections');
      state.pages.collections = collectionCache.pages || 2; state.more.collections = collectionCache.more === true;
    }
    const alive = () => host.isConnected && pickerState === state && (document.cookie.match(/(?:^|;\s*)DedeUserID=(\d+)/)?.[1] || '') === account;
    const normalizeVideos = rows => pickerVideos(rows.map(v => ({...v,bvid:v.bv})));
    const readRecord = collection => {
      const key = collection.kind + ':' + collection.id;
      if (!state.records.has(key)) {
        const cached = GM_getValue(collectionsKey + '_' + collection.kind + '_' + collection.id, null);
        const rows = Array.isArray(cached) ? cached : cached?.videos;
        if (Array.isArray(rows)) {
          state.records.set(key,normalizeVideos(rows));state.loaded.add(key);
          state.pages[key] = cached.pages || 2;state.more[key] = cached.more === true;
        }
      }
      return state.records.get(key) || [];
    };
    const refreshCurrent = async (append = false) => {
      const key = viewKey(), mode = state.mode, selected = state.selected;
      if (state.loading.has(key)) return;
      if (!uid) { status('请先登录 B 站账号'); return; }
      state.loading.add(key); state.render(); status('正在加载…');
      const startPage = append ? (state.pages[key] || 0) + 1 : 1;
      const base = append ? (mode === 'collections' ? state.collections : readRecord(selected)) : [];
      const publish = batch => {
        if (!alive()) return;
        const merged = mode === 'collections' ? pickerCollections([...base,...batch]) : normalizeVideos([...base,...batch]);
        if (mode === 'videos') {
          state.videos = merged.slice(0,100);
          if (cacheKey) GM_setValue(cacheKey,{time:Date.now(),videos:state.videos});
        } else if (mode === 'collections') state.collections = merged;
        else state.records.set(key,merged);
        state.loaded.add(key);
        if (viewKey() === key) {
          if (mode === 'collection') state.collectionVideos = merged;
          state.render(); status('');
        }
      };
      try {
        let rows;
        if (mode === 'videos') rows = await loadPickerRecentVideos(publish,alive);
        else if (mode === 'collections') rows = await loadPickerCollections(uid,publish,startPage);
        else rows = await loadPickerCollectionVideos(uid,selected,publish,startPage);
        if (!alive()) return;
        publish(rows);state.pages[key] = startPage + 1;
        state.more[key] = mode !== 'videos' && rows.length >= (mode === 'collections' ? 40 : 60);
        if (mode === 'collections' && collectionsKey) GM_setValue(collectionsKey,{items:state.collections,pages:state.pages[key],more:state.more[key],time:Date.now()});
        if (mode === 'collection') GM_setValue(collectionsKey + '_' + selected.kind + '_' + selected.id,{videos:state.records.get(key),pages:state.pages[key],more:state.more[key]});
      } catch(error) { if(alive() && viewKey()===key) status('加载失败：'+error.message); }
      finally {
        state.loading.delete(key);
        if (alive()) state.render();
      }
    };
    const switchMode = mode => {
      state.mode=mode;get('query').value='';state.render();status('');
      if (!state.loaded.has(mode)) refreshCurrent();
    };
    const openCollection = collection => {
      state.mode='collection';state.selected=collection;get('query').value='';
      state.collectionVideos=readRecord(collection);state.render();status('');
      if (!state.loaded.has(viewKey())) refreshCurrent();
    };
    get('retry').onclick=()=>refreshCurrent();
    get('refresh').onclick=()=>refreshCurrent();
    get('videos').onclick=()=>switchMode('videos');
    get('collections').onclick=()=>switchMode('collections');
    get('back').onclick=()=>switchMode('collections');
    get('load-more').onclick=()=>refreshCurrent(true);

    const collapse = value => { host.toggleAttribute('data-collapsed', value); GM_setValue('biliclip_picker_collapsed', value); };
    get('collapse').onclick = () => collapse(true);
    root.querySelector('.tab').onclick = () => collapse(false);
    host.removeAttribute('data-collapsed');
    const cached = cacheKey && GM_getValue(cacheKey, null);
    if (cached && Array.isArray(cached.videos)) {
      state.videos = pickerVideos(cached.videos.map(v => ({ ...v, bvid: v.bv }))).slice(0,100);
      state.loaded.add('videos');
      status('');
    } else status('');
    document.body.append(host);
    state.render();
    if (!state.loaded.has('videos')) refreshCurrent();
    enablePanelMovement(host, root, 'left');
  }

  function syncUploadPanel() {
    let host = document.getElementById('biliclip-upload-panel');
    if (!isUploadPage()) { host?.remove(); return; }
    if (!document.body || host) return;
    host = document.createElement('div');
    host.id = 'biliclip-upload-panel';
    host.style.cssText = 'all:initial;position:fixed;right:16px;top:160px;z-index:1;max-width:calc(100vw - 24px)';
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <style>
        :host{color-scheme:light}*{box-sizing:border-box}button,input{font:inherit}
        .panel{width:260px;max-width:calc(100vw - 24px);max-height:calc(100vh - 160px);overflow:auto;background:#fff;color:#18191c;border:1px solid #e3e8ef;border-radius:14px;box-shadow:0 8px 30px #182a4426;font:13px/1.5 system-ui,"PingFang SC",sans-serif}
        header{position:sticky;top:0;background:#fff;z-index:1;display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #eef1f5}h2{font-size:14px;margin:0}small{font-size:10px;color:#9499a0;margin-left:5px}
        button{border:0;border-radius:8px;cursor:pointer;padding:7px 10px;background:#f1f4f8;color:#414852}button:disabled{opacity:.6;cursor:wait}button:hover{filter:brightness(.97)}
        ${PANEL_LOGO_CSS}
        .collapse{padding:0 6px;font-size:18px;background:transparent}.body{padding:12px}.primary{width:100%;background:#00aeec;color:#fff;font-weight:600;margin-bottom:10px}
        .row{display:grid;grid-template-columns:50px minmax(0,1fr);gap:8px;align-items:start;margin:9px 0}.name{padding-top:3px;font-weight:600}.toggle{display:flex;gap:5px;align-items:flex-start}input[type=checkbox],input[type=radio]{accent-color:#00aeec;margin:3px 0 0;flex-shrink:0}
        input[type=text]{width:100%;padding:7px 8px;border:1px solid #dce1e8;border-radius:7px;color:#18191c;background:#fafbfc}.hint{font-size:11px;color:#9499a0;margin-top:3px}
        details{position:relative}summary{list-style:none;cursor:pointer;border:1px solid #dce1e8;border-radius:7px;padding:6px 8px}summary::-webkit-details-marker{display:none}summary::after{content:'⌄';float:right;color:#9499a0}
        .declaration-trigger{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;min-height:34px;text-align:left;background:#fff;border:1px solid #dce1e8;padding:6px 9px}.declaration-trigger:hover{border-color:#00aeec;background:#f6fcff}.chevron{color:#9499a0}.declaration-title{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:155px}.copyright-row{margin:3px 0 10px 58px;font-size:11px;line-height:1.65;color:#61666d}.copyright-row input{margin-top:4px}.copyright-row:has(input:disabled){opacity:.5}
        .declaration-menu{position:fixed;inset:auto;margin:0;width:304px;max-width:calc(100vw - 24px);max-height:calc(100vh - 24px);overflow:auto;padding:8px;border:1px solid #e4e9f0;border-radius:14px;background:#fff;color:#262c36;box-shadow:0 16px 56px #152c4d26;font:13px/1.5 system-ui,"PingFang SC",sans-serif}.declaration-menu::backdrop{background:transparent}.menu-heading{display:flex;justify-content:space-between;padding:7px 9px 10px;font-size:14px;font-weight:600}.menu-heading span{font-size:11px;font-weight:400;color:#9499a0}
        .options{display:grid;gap:2px}.option{position:relative;display:flex;align-items:center;gap:6px;min-height:35px;padding:8px 30px 8px 10px;border-radius:7px;cursor:pointer;color:#414852}.option:hover{background:#f5f8fc}.option:has(input:checked){background:#eaf8fe;color:#008abc}.option:has(input:checked)::after{content:'✓';position:absolute;right:11px;font-weight:700}.option input{position:absolute;opacity:0;width:1px;height:1px}.option:has(input:focus-visible){outline:2px solid #00aeec}.option:has(input:disabled){opacity:.45;cursor:not-allowed}
        .auth-heading{border-top:1px solid #edf0f5;margin:7px 2px 0;padding:11px 8px 5px;font-size:11px;color:#61666d}.auth-heading span{display:block;font-size:10px;color:#9499a0;margin-top:2px}.copyright{font-size:12px;line-height:1.7;padding-right:30px}.menu-footer{display:flex;align-items:center;justify-content:space-between;border-top:1px solid #edf0f5;margin-top:8px;padding:8px 7px 0;color:#9499a0;font-size:10px}.menu-footer button{background:#00aeec;color:white;padding:5px 14px;font-size:12px}
        .settings{border-top:1px solid #eef1f5;padding-top:8px;margin-top:8px}.settings summary{border:0;padding:0;font-size:11px;color:#9499a0}.settings label{font-size:12px;margin:7px 0}.status{font-size:11px;color:#008abc;margin:8px 0 0;min-height:16px}.foot{font-size:10px;color:#9499a0;margin-top:3px}
        .tab{display:none;background:#00aeec;color:white;font:600 13px/1.5 system-ui,sans-serif}:host([data-collapsed]) .panel{display:none}:host([data-collapsed]) .tab{display:block}
        :focus-visible{outline:2px solid #00aeec;outline-offset:2px}
      
        ${NATIVE_UI_CSS}
      </style>
      <button class="tab" type="button">${PANEL_LOGO}喵贴助手</button>
      <aside class="panel" aria-label="投稿工作台">
        <header><h2>${PANEL_LOGO}喵贴 · 投稿助手</h2><button class="collapse" type="button" aria-label="收起面板">−</button></header>
        <div class="body">
          <button id="execute" type="button" class="primary">一键执行</button>
          <h3 class="section-title">内容填写</h3>
          <div class="row"><span class="name">标题</span><label class="toggle"><input id="copy-title" type="checkbox" checked>标题写入简介首行</label></div>
          <div class="row"><label class="name" for="preset">简介</label><div><input id="preset" type="text" placeholder="输入简介第二行预设"><div class="hint">保留第三行及后续文字</div></div></div>
          <h3 class="section-title">投稿选项</h3>
          <div class="row"><span class="name">声明</span><button id="declaration-summary" class="declaration-trigger" type="button" popovertarget="declaration-menu" aria-label="选择创作声明"><span id="declaration-label">请选择声明</span><span class="chevron">⌄</span></button></div>
          <div class="copyright-row"><label class="toggle"><input id="copyright" type="checkbox"><span>内容为自制：未经作者允许，禁止转载</span></label></div>
          <div class="row"><span class="name">分区</span><label class="toggle"><input id="knowledge" type="checkbox" checked>知识</label></div>
          <div class="row"><span class="name">推广</span><label class="toggle"><input id="commercial" type="checkbox">增加商业推广信息</label></div>
          <div class="row"><span class="name">更多</span><label class="toggle"><input id="more-auto" type="checkbox">自动展开页面「更多设置」</label></div>
          <details class="settings"><summary>自动执行与更多设置</summary>
            <label class="toggle"><input id="knowledge-auto" type="checkbox">自动选择知识分区</label>
            <label class="toggle"><input id="declaration-auto" type="checkbox">自动选择预设声明</label>
          </details>
          <p class="status" role="status" aria-live="polite">设置自动保存</p>
          <div class="foot">执行后请核对内容，再手动投稿</div>
        </div>
      </aside>
      <div id="declaration-menu" class="declaration-menu" popover="auto" role="dialog" aria-label="创作声明选项">
        <div class="menu-heading">创作声明<span>单选</span></div>
        <div class="options" role="group" aria-label="主声明">
            <label class="option"><input type="radio" name="main" value="">不设置主声明</label>
            <label class="option"><input type="radio" name="main" value="内容无需标注">内容无需标注</label>
            <label class="option"><input type="radio" name="main" value="含AI生成内容">含AI生成内容</label>
            <label class="option"><input type="radio" name="main" value="含虚构演绎内容">含虚构演绎内容</label>
            <label class="option"><input type="radio" name="main" value="内容含营销信息">内容含营销信息</label>
            <label class="option"><input type="radio" name="main" value="个人观点，仅供参考">个人观点，仅供参考</label>
            <label class="option"><input type="radio" name="main" value="内容为转载">内容为转载</label>
        </div>
        <div class="menu-footer"><span>选中后立即应用</span></div>
      </div>`;
    const get = id => root.querySelector('#' + id);
    get('preset').value = uploadPrefs.secondLine;
    get('commercial').checked = GM_getValue('biliclip_commercial', false) === true;
    get('more-auto').checked = GM_getValue('biliclip_expand_more_settings', false) === true;
    get('knowledge-auto').checked = autoKnowledge;
    get('declaration-auto').checked = declarationPrefs.auto;
    get('copy-title').checked = GM_getValue('biliclip_copy_title', true) !== false;
    get('knowledge').checked = GM_getValue('biliclip_choose_knowledge', true) !== false;
    for (const radio of root.querySelectorAll('[name=main]')) radio.checked = radio.value === declarationPrefs.main;
    get('copyright').checked = declarationPrefs.copyright;
    const menu = get('declaration-menu');
    const trigger = get('declaration-summary');
    const positionMenu = () => {
      const rect = trigger.getBoundingClientRect();
      const width = Math.min(304, window.innerWidth - 24);
      menu.style.width = width + 'px';
      const left = rect.left >= width + 22 ? rect.left - width - 10 : Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
      menu.style.left = left + 'px';
      menu.style.top = Math.max(12, Math.min(rect.top - 50, window.innerHeight - menu.offsetHeight - 12)) + 'px';
    };
    menu.addEventListener('toggle', event => {
      if (event.newState === 'open') positionMenu();
    });
    const summary = () => {
      const label = get('declaration-label');
      label.replaceChildren();
      const title = document.createElement('span');
      title.className = 'declaration-title';
      title.textContent = declarationPrefs.main || '请选择主声明';
      title.title = title.textContent;
      label.appendChild(title);
      const incompatible = declarationPrefs.main === '内容为转载';
      get('copyright').disabled = incompatible;
      get('copyright').closest('label').title = incompatible ? 'B 站仅允许非转载稿件添加自制授权声明' : '';
    };
    summary();
    const save = () => {
      uploadPrefs = uploadSettings({secondLine:get('preset').value, autoSecondLine:false});
      const main = root.querySelector('[name=main]:checked')?.value || '';
      if (main === '内容为转载') get('copyright').checked = false;
      declarationPrefs = declarationSettings({main, copyright:get('copyright').checked, auto:get('declaration-auto').checked});
      GM_setValue('biliclip_commercial', get('commercial').checked);
      GM_setValue('biliclip_expand_more_settings', get('more-auto').checked);
      autoKnowledge = get('knowledge-auto').checked;
      GM_setValue(UPLOAD_KEY, uploadPrefs);
      GM_setValue(DECL_KEY, declarationPrefs);
      GM_setValue('biliclip_auto_knowledge', autoKnowledge);
      GM_setValue('biliclip_copy_title', get('copy-title').checked);
      GM_setValue('biliclip_choose_knowledge', get('knowledge').checked);
      summary();
      root.querySelector('.status').textContent = '✓ 设置已保存';
    };
    let declarationQueue = Promise.resolve();
    const applyImmediately = copyrightOnly => {
      const prefs = { ...declarationPrefs };
      declarationPending += 1;
      get('execute').disabled = true;
      root.querySelector('.status').textContent = '正在应用声明…';
      declarationQueue = declarationQueue.then(async () => {
        // 连续切换按顺序执行；不会因上一项尚未结束而丢弃取消操作。
        for (let i = 0; i < 100 && (panelExecuting || declarationBusy || knowledgeBusy); i += 1) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        if (panelExecuting || declarationBusy || knowledgeBusy) throw new Error('页面正忙，请稍后再试');
        const done = await applyDeclaration(false, { prefs, copyrightOnly });
        root.querySelector('.status').textContent = done
          ? (copyrightOnly ? (prefs.copyright ? '✓ 已添加禁止转载' : '✓ 已移除禁止转载') : '✓ 声明已应用')
          : '声明未应用，请检查 B 站选项后重试';
      }).catch(error => {
        root.querySelector('.status').textContent = error.message;
      }).finally(() => {
        declarationPending -= 1;
        get('execute').disabled = panelExecuting || declarationPending > 0;
      });
    };
    root.addEventListener('change', event => {
      save();
      if (event.target.id === 'commercial') {
        applyCommercialPromotion(event.target.checked).then(done => { root.querySelector('.status').textContent = done ? '✓ 商业推广已同步' : '未找到商业推广选项，请在投稿编辑页重试'; });
      }
      if (event.target.id === 'more-auto') {
        const done = expandCreatorMoreSettings(true, event.target.checked);
        root.querySelector('.status').textContent = done ? '已同步更多设置的展开状态，请核对页面' : '未找到更多设置入口，请进入完整投稿编辑页后重试';
      }
      if (event.target.name === 'main') {
        if (menu.matches(':popover-open')) menu.hidePopover();
        applyImmediately(false);
      } else if (event.target.id === 'copyright') {
        applyImmediately(true);
      }
    });
    // 再次点击当前已选的主声明，也收起菜单并重新应用。
    for (const radio of root.querySelectorAll('[name=main]')) {
      radio.addEventListener('click', () => {
        if (radio.value === declarationPrefs.main) {
          save();
          if (menu.matches(':popover-open')) menu.hidePopover();
          applyImmediately(false);
        }
      });
    }
    get('preset').addEventListener('input', save);
    const collapse = value => {if (!value) host.biliclipUserAdjusted = true;if (menu.matches(':popover-open')) menu.hidePopover();host.toggleAttribute('data-collapsed', value);GM_setValue('biliclip_upload_panel_collapsed', value);};
    host.removeAttribute('data-collapsed');
    root.querySelector('.collapse').onclick = () => collapse(true);
    root.querySelector('.tab').onclick = () => collapse(false);
    get('execute').onclick = async () => {
      if (panelExecuting || knowledgeBusy || declarationBusy || declarationPending) return;
      save();
      if (menu.matches(':popover-open')) menu.hidePopover();
      panelExecuting = true;
      get('execute').disabled = true;
      get('execute').dataset.guideResult = 'pending';
      get('execute').textContent = '正在执行…';
      const results = [];
      try {
        results.push(expandCreatorMoreSettings(true, get('more-auto').checked) ? '更多设置✓' : '未找到更多设置入口');
        results.push(await applyCommercialPromotion(get('commercial').checked) ? '商业推广✓' : '商业推广未完成');
        // 按 B 站表单顺序：标题取值 → 创作声明 → 分区 → 简介。
        const title = get('copy-title').checked ? clean(findUploadFields()?.title?.value) : null;
        if (get('copy-title').checked && !title) throw new Error('请先填写视频标题');
        if (declarationPrefs.main || declarationPrefs.copyright) results.push((await applyDeclaration(false)) ? '声明✓' : '声明未完成');
        if (get('knowledge').checked) results.push((await applyKnowledge(false)) ? '知识✓' : '分区未完成');
        if (title !== null || uploadPrefs.secondLine) {
          const fields = findUploadFields();
          if (!fields) throw new Error('未找到简介框');
          const text = descriptionLines(descriptionText(fields.description), title, uploadPrefs.secondLine || null);
          results.push(writeDescription(fields.description,text) ? '简介✓' : '简介未完成');
        }
        root.querySelector('.status').textContent = results.join(' · ') || '请勾选需要执行的项目';
      } catch (error) {
        root.querySelector('.status').textContent = [...results,error.message].join(' · ');
      } finally {
        get('execute').disabled = declarationPending > 0;
        get('execute').dataset.guideResult = results.some(result => result.endsWith('✓')) ? 'success' : 'error';
        get('execute').textContent = '一键执行';
        panelExecuting = false;
      }
    };
    document.body.appendChild(host);
    enablePanelMovement(host, root, 'right');
  }

  /* ==================== 提醒 ==================== */

  function toast(message, color = 'blue', duration = 1800, anchor = null) {
    let host = document.getElementById('biliclip-toast-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'biliclip-toast-host';
      host.style.cssText = 'all:initial;position:fixed;inset:0;width:0;height:0;z-index:2147483647;pointer-events:none';
      const shadow = host.attachShadow({mode:'open'});
      shadow.innerHTML = `<style>
        .toast{position:fixed;top:72px;left:50%;display:none;max-width:calc(100vw - 24px);
          padding:9px 14px;border:1px solid #e3e5e7;border-radius:6px;color:#30343b;background:#fff;
          box-shadow:0 4px 16px #18191c1a;font:13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif;
          opacity:0;transform:translate(-50%,4px);transition:opacity 160ms ease-out,transform 160ms ease-out}
        .toast.blue{border-color:#00aeec47}.toast.pink{border-color:#fb72995c}
        .toast.show{opacity:1;transform:translate(-50%,0)}
        ${NATIVE_UI_CSS}
      </style><div class="toast" role="status" aria-live="polite">${PANEL_LOGO}<svg class="toast-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"></svg><span class="toast-message"></span></div>`;
      (document.body || document.documentElement).appendChild(host);
    }
    const box = host.shadowRoot.querySelector('.toast');
    clearTimeout(host._timer);
    clearTimeout(host._hideTimer);
    if (host._frame) cancelAnimationFrame(host._frame);
    box.querySelector('.toast-message').textContent = message;
    box.querySelector('.toast-icon').innerHTML = color === 'pink'
      ? '<path d="m5 5 10 10M15 5 5 15"/>' : '<path d="m4 10 4 4 8-9"/>';
    const showing = box.classList.contains('show') && box.style.display !== 'none';
    box.className = `toast ${color}${showing ? ' show' : ''}`;
    box.style.display = 'flex';
    box.style.top = '';
    box.style.left = '';
    if (anchor?.isConnected) {
      const rect = anchor.getBoundingClientRect();
      const viewport = document.documentElement.clientWidth;
      const halfWidth = box.offsetWidth / 2;
      const center = Math.max(halfWidth + 12, Math.min(viewport - halfWidth - 12, rect.left + rect.width / 2));
      const gap = 20;
      const above = rect.top - box.offsetHeight - gap;
      const top = above >= 12 ? above : rect.bottom + gap;
      box.style.left = `${center}px`;
      box.style.top = `${Math.max(12, Math.min(window.innerHeight - box.offsetHeight - 12, top))}px`;
    }
    // Establish the initial frame, then fade in without scaling or overshoot.
    if (!showing) {
      box.getBoundingClientRect();
      host._frame = requestAnimationFrame(() => { box.classList.add('show'); host._frame = 0; });
    }
    host._timer = setTimeout(() => {
      box.classList.remove('show');
      host._hideTimer = setTimeout(() => { box.style.display = 'none'; }, 160);
    }, duration);
  }

  /* ==================== B站按钮 ==================== */

  function createBiliUI() {
    if (
      !document.body ||
      ui?.host?.isConnected
    ) {
      return;
    }

    document
      .getElementById(
        'biliclip-ui-host'
      )
      ?.remove();

    const host =
      document.createElement(
        'div'
      );

    host.id =
      'biliclip-ui-host';

    host.style.cssText = [
      'all:initial',
      'position:fixed',
      'inset:0',
      'width:100vw',
      'height:100vh',
      'z-index:2147483646',
      'pointer-events:none'
    ].join(';');

    const shadow =
      host.attachShadow({
        mode: 'open'
      });

    shadow.innerHTML = `
      <style>
        * {
          box-sizing: border-box;
        }

        button {
          font-family:
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            "PingFang SC",
            sans-serif;
        }

        ${ACTION_FEEDBACK_CSS}
        ${VIDEO_ACTION_COLORS}
        .hover-actions {
          position: fixed;
          display: none;
          align-items: center;
          gap: 7px;
          pointer-events: auto;
        }
        .bar { display:flex; flex-wrap:wrap; align-items:center; column-gap:5px; row-gap:4px; padding:5px 0; }
        .bar .group-divider { width:1px; height:17px; margin:0 4px; background:#e3e5e7; }
        .action-button {
          min-inline-size:68px;
          min-height:28px;
          padding:3px 8px;
          border:0;
          border-radius:5px;
          font-size:12px;
          line-height:18px;
          white-space:nowrap;
          cursor:pointer;
        }
        .copy-content { display:inline-grid; grid-template-columns:14px minmax(0,1fr); align-items:center; gap:5px; }
        .copy-icon { display:inline-grid; width:14px; height:14px; place-items:center; }
        .copy-icon svg { width:14px; height:14px; grid-area:1/1; }
        .copy-icon .copy-check { display:none; }
        .action-button[data-feedback="success"] .copy-icon .copy-glyph { display:none; }
        .action-button[data-feedback="success"] .copy-icon .copy-check { display:block; }
        .copy-text { display:inline-grid; place-items:center; }
        .bar .action-button {
          --icon-color:#008db8;
          --feedback-color:#006583;
          --hover-bg:#e2f5fc;
          --press-bg:#cbeaf6;
          min-inline-size:76px;
          min-height:35px;
          padding:4px 10px;
          font-size:13px;
          line-height:20px;
          color:#51565d;
          background:transparent;
          transition:color .12s,background-color .12s,box-shadow .12s;
        }
        .bar .action-button:is([data-action="bv"],[data-action="both"]) {
          --icon-color:#d43f72;
          --feedback-color:#98274d;
          --hover-bg:#fce5ed;
          --press-bg:#f7cddc;
        }
        .bar .copy-content { grid-template-columns:16px minmax(0,1fr); gap:6px; }
        .bar .copy-icon { width:16px; height:16px; color:var(--icon-color); }
        .bar .copy-icon svg { width:16px; height:16px; }
        .bar .action-button:hover { color:#202124; background:var(--hover-bg); }
        .bar .action-button:active { background:var(--press-bg); box-shadow:inset 0 0 0 1px var(--icon-color); }
        .hover-actions .action-button {
          height:32px;
          padding:0 11px;
          border-radius:10px;
          color:#fff;
          --action-color:var(--biliclip-video-blue);
          --action-hover:#008dbf;
          background:var(--action-color);
          box-shadow:0 5px 14px #00aeec38;
          font-weight:600;
        }
        .hover-actions .hover {
          --action-color:var(--biliclip-video-pink);
          --action-hover:#df507c;
          padding-left:8px;
          box-shadow:0 5px 14px #fb729947;
        }
        .hover-actions .hover .copy-content { grid-template-columns:19px minmax(0,1fr); }
        .hover-actions .hover .copy-icon { width:19px; height:19px; border-radius:6px; background:#ffffff2e; }
        .hover-actions .hover .copy-icon svg { width:11px; height:11px; }
        .hover-actions .action-button:hover { background:var(--action-hover); }
        .hover-actions .action-button:active { box-shadow:inset 0 0 0 2px #ffffffa0; }
        .action-button:disabled { cursor:wait; }
        .action-button:focus-visible { outline:2px solid #00a1d6; outline-offset:1px; }
        .bar .action-button[data-feedback] { color:var(--feedback-color); background:var(--hover-bg); }
        .bar .action-button:is([data-feedback="success"],[data-feedback="error"]) {
          background:var(--press-bg);
          box-shadow:inset 0 0 0 1px var(--icon-color);
        }
        .bar .action-button[data-feedback] .copy-icon { color:inherit; }
        .hover-actions .action-button[data-feedback] { background:var(--action-color); }
        .hover-actions .action-button[data-feedback="success"] { box-shadow:inset 0 0 0 1px #ffffffb0; }
        .hover-actions .action-button[data-feedback="error"] { background:var(--action-hover); box-shadow:inset 0 0 0 1px #fff; }
        @media(prefers-reduced-motion:reduce) { .bar .action-button { transition:none; } }
      
        ${NATIVE_UI_CSS}
      </style>

      <div class="hover-actions" aria-label="喵贴 · 复制视频信息">
        ${copyActionButton('both', '复制 BV + 标题')}
        ${copyActionButton('title-link', '复制标题 + 链接', 'hover')}
      </div>

      <div class="bar" role="group" aria-label="复制视频信息">
        ${copyActionButton('title', '复制标题')}
        ${copyActionButton('link', '复制链接')}
        ${copyActionButton('bv', '复制 BV')}
        <span class="group-divider" aria-hidden="true"></span>
        ${copyActionButton('both', '复制 BV + 标题', 'primary')}
        ${copyActionButton('title-link', '复制标题 + 链接')}
      </div>
    `;

    document.body
      .appendChild(host);

    const barHost = document.createElement('div');
    barHost.id = 'biliclip-video-copy-bar';
    const barRoot = barHost.attachShadow({ mode: 'open' });
    const bar = shadow.querySelector('.bar');
    barRoot.append(shadow.querySelector('style').cloneNode(true), bar);

    ui = {
      host,
      barHost,
      bar,
      hoverActions: shadow.querySelector('.hover-actions'),
      active: null,
      frame: 0
    };

    bindBiliUI();
    document.addEventListener('fullscreenchange', syncVideoBar);
    document.addEventListener('webkitfullscreenchange', syncVideoBar);
    ui.nativeMountReady = false;
    const mountNativeRow = () => setTimeout(() => {
      if (ui?.host !== host) return;
      ui.nativeMountReady = true;
      syncVideoBar();
    }, 1500);
    if (document.readyState === 'complete') mountNativeRow();
    else window.addEventListener('load', mountNativeRow, {once:true});

    setInterval(
      syncVideoBar,
      1000
    );

    addEventListener(
      'scroll',
      positionUI,
      true
    );

    addEventListener(
      'resize',
      positionUI
    );
  }

  function actionButtonLabel(label) {
    return `<span class="action-label">${label}</span><span class="action-feedback" role="status"></span>`;
  }

  function setButtonFeedback(button, label, state) {
    clearTimeout(actionFeedbackTimers.get(button));
    button.querySelector('.action-feedback').textContent = label;
    if (!label) {
      delete button.dataset.feedback;
      return;
    }
    button.dataset.feedback = state;
    if (state !== 'pending') {
      actionFeedbackTimers.set(button, setTimeout(() => setButtonFeedback(button, ''), state === 'error' ? 2400 : 1300));
    }
  }

  function copyActionButton(action, label, extraClass = '') {
    const paths = {
      title: '<path d="M3 4h10M8 4v8M6 12h4"/>',
      link: '<path d="M7 5l2-2a3 3 0 0 1 4 4l-2 2M9 11l-2 2a3 3 0 0 1-4-4l2-2m1 3 4-4"/>',
      bv: '<rect x="2.5" y="3.5" width="11" height="9" rx="2"/><path d="m7 6 3 2-3 2z"/>',
      both: '<rect x="6" y="6" width="7.5" height="7.5" rx="1.5"/><path d="M10 3.5H4A1 1 0 0 0 3 4.5V10"/>',
      'title-link': '<path d="M3 4h10M8 4v5m-5 3h3m5 0h2M6 10l-1 2 1 2m4-4 1 2-1 2m-3-2h2"/>'
    };
    const icon = (className, body) => `<svg class="${className}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
    return `<button class="action-button ${extraClass}" type="button" data-action="${action}">
      <span class="copy-content">
        <span class="copy-icon" aria-hidden="true">${icon('copy-glyph', paths[action])}${icon('copy-check', '<path d="m3.5 8 3 3 6-6"/>')}</span>
        <span class="copy-text">${actionButtonLabel(label)}</span>
      </span>
    </button>`;
  }

  function bindBiliUI() {
    document.addEventListener(
      'pointermove',
      event => {
        if(ui?.tutorialCover){positionHover();return;}
        if (
          !ui ||
          ui.frame
        ) {
          return;
        }

        const x =
          event.clientX;

        const y =
          event.clientY;

        ui.frame =
          requestAnimationFrame(
            () => {
              ui.frame = 0;
              if(ui.tutorialCover){positionHover();return;}

              if (
                ui.hoverActions.matches(
                  ':hover'
                )
              ) {
                return;
              }

              const cover =
                findCover(x, y);

              if (!cover) {
                ui.hoverActions.style.display =
                  'none';

                ui.active = null;

                return;
              }

              const bv =
                getBV(
                  cover.href
                );

              if (!bv) return;

              if (ui.active?.cover === cover && ui.active.bv === bv) {
                positionHover();
                return;
              }

              ui.active = {
                cover,
                bv,
                title:
                  cardTitle(
                    cover
                  )
              };

              for (const button of ui.hoverActions.querySelectorAll('button')) setButtonFeedback(button, '');

              ui.hoverActions.style.display =
                'flex';

              positionHover();
            }
          );
      },
      true
    );

    let copyInProgress = false;
    for (const group of [ui.hoverActions, ui.bar]) {
      const hovered = group === ui.hoverActions;
      for (const button of group.querySelectorAll('button[data-action]')) {
        button.addEventListener('click', async event => {
          event.preventDefault();
          event.stopPropagation();
          if (copyInProgress) return;

          const action = button.dataset.action;
          const bv = hovered ? ui.active?.bv : getBV(location.href);
          if (!bv) return setButtonFeedback(button, '复制失败', 'error');

          const link = `https://www.bilibili.com/video/${bv}/`;
          const needsTitle = action !== 'bv' && action !== 'link';
          copyInProgress = true;
          button.disabled = true;
          const feedback = (label, state) => {
            if (!hovered || ui.active?.bv === bv) setButtonFeedback(button, label, state);
          };
          feedback('复制中…', 'pending');
          try {
            let title = needsTitle ? (hovered ? ui.active?.title : currentTitle()) : '';
            if (needsTitle && !title) {
              title = await fetchTitle(bv);
              if (!title) return feedback('无标题', 'error');
            }

            if (action === 'both') {
              await savePair(bv, title);
            } else {
              const text = { bv, title, link, 'title-link': `${title}\n${link}` }[action];
              await writeClipboard(text);
              clearPair();
            }
            feedback('已复制', 'success');
            toast('已复制，去粘贴吧', 'blue', 1800, button);
          } catch (_) {
            feedback('复制失败', 'error');
          } finally {
            copyInProgress = false;
            button.disabled = false;
          }
        });
      }
    }
  }

  function findCover(x, y) {
    const elements =
      document.elementsFromPoint(
        x,
        y
      );

    for (
      const element of elements
    ) {
      if (
        !(element instanceof Element)
      ) {
        continue;
      }

      const anchor =
        element.closest(
          'a[href]'
        );

      if (
        !anchor ||
        !getBV(anchor.href)
      ) {
        continue;
      }

      if (
        !anchor.querySelector(
          [
            'img',
            'picture',
            'video',
            '[class*="cover"]',
            '[class*="pic"]'
          ].join(',')
        )
      ) {
        continue;
      }

      const rect =
        anchor.getBoundingClientRect();

      if (
        rect.width >= 80 &&
        rect.height >= 45
      ) {
        return anchor;
      }
    }

    return null;
  }

  function positionHover() {
    const cover =
      ui?.active?.cover;

    if (!cover) return;

    const rect =
      cover.getBoundingClientRect();

    const width =
      ui.hoverActions.offsetWidth ||
      248;

    ui.hoverActions.style.left =
      `${
        Math.max(
          8,
          Math.min(
            innerWidth -
              width -
              8,
            rect.right -
              width -
              8
          )
        )
      }px`;

    ui.hoverActions.style.top =
      `${
        Math.max(
          8,
          rect.top + 8
        )
      }px`;
  }

  function playerIsFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement ||
      document.querySelector('.bpx-player-container[data-screen="web"], .bpx-player-container[data-screen="full"], .bpx-player-container[data-screen="fullscreen"], .bilibili-player.mode-webfullscreen, .bilibili-player.mode-fullscreen, body.player-mode-webfullscreen, body.player-mode-fullscreen'));
  }

  function syncFullscreenUI() {
    const hidden = playerIsFullscreen();
    if (ui.fullscreen === hidden) return hidden;
    ui.fullscreen = hidden;
    ui.host.style.setProperty('display', hidden ? 'none' : 'block', 'important');
    ui.barHost.hidden = hidden;
    if (hidden) {
      ui.hoverActions.style.display = 'none';
      ui.active = null;
    }
    return hidden;
  }

  function syncVideoBar() {
    if (!ui || !ui.nativeMountReady || syncFullscreenUI()) return;
    const bv = getBV(location.href);
    if (!bv) {
      if (ui.barHost.isConnected) ui.barHost.remove();
      ui.barAnchor = null;
      return;
    }

    // The toolbar can be rebuilt while comments and recommendations load.
    // Keep the row attached to the player instead of following toolbar mutations.
    if (ui.barAnchor?.isConnected && ui.barHost.isConnected &&
        ui.barHost.parentElement === ui.barAnchor.parentElement) return;

    const player = document.querySelector('#bilibili-player, #playerWrap, .bpx-player-container');
    const toolbar = document.querySelector('#arc_toolbar_report, .video-toolbar-container, .video-toolbar');
    const row = toolbar?.closest('.video-toolbar-container') || toolbar;
    const parent = row?.parentElement;
    if (!player || !parent || row.contains(player) || player.contains(row) ||
        !(player.compareDocumentPosition(row) & 4)) return;

    if (parent.contains(player)) {
      let anchor = player;
      while (anchor.parentElement !== parent) anchor = anchor.parentElement;
      ui.barAnchor = anchor;
      anchor.after(ui.barHost);
    } else {
      ui.barAnchor = row;
      row.before(ui.barHost);
    }
  }

  function positionUI() {
    if (ui?.active && ui.hoverActions.style.display !== 'none') positionHover();
  }

  /* ==================== BV与标题 ==================== */

  function getBV(url) {
    try {
      return (
        new URL(
          url,
          location.href
        )
          .pathname
          .match(
            /\/video\/(BV[0-9A-Za-z]{10})/i
          )
          ?.[1] ||
        ''
      );
    } catch (_) {
      return (
        String(url)
          .match(
            /\/video\/(BV[0-9A-Za-z]{10})/i
          )
          ?.[1] ||
        ''
      );
    }
  }

  function currentTitle() {
    const element =
      document.querySelector(
        [
          'h1.video-title',
          'h1[data-title]',
          '.video-info-title h1',
          '.video-title'
        ].join(',')
      );

    return clean(
      element?.getAttribute(
        'title'
      ) ||
      element?.getAttribute(
        'data-title'
      ) ||
      element?.textContent
    );
  }

  function cardTitle(cover) {
    const direct =
      clean(
        cover.getAttribute(
          'title'
        ) ||
        cover.getAttribute(
          'aria-label'
        )
      );

    if (
      direct &&
      !/^BV[0-9A-Za-z]{10}$/i
        .test(direct)
    ) {
      return direct;
    }

    const card =
      cover.closest(
        [
          '.bili-video-card',
          '.video-card',
          '.feed-card',
          '.small-item',
          '[class*="video-card"]',
          '[class*="videoCard"]',
          'article',
          'li'
        ].join(',')
      ) ||
      cover
        .parentElement
        ?.parentElement;

    const element =
      card?.querySelector(
        [
          '.bili-video-card__info--tit a',
          '.bili-video-card__info--tit',
          'h3 a[title]',
          'h3 a',
          'h3',
          'a[class*="title"][title]',
          'a[class*="title"]'
        ].join(',')
      );

    const title =
      clean(
        element?.getAttribute?.(
          'title'
        ) ||
        element?.textContent
      );

    return (
      /^BV[0-9A-Za-z]{10}$/i
        .test(title)
    )
      ? ''
      : title;
  }

  function fetchTitle(bv) {
    return new Promise(
      resolve => {
        GM_xmlhttpRequest({
          method: 'GET',

          url:
            'https://api.bilibili.com/' +
            'x/web-interface/view?bvid=' +
            encodeURIComponent(bv),

          timeout: 8000,

          onload(response) {
            try {
              const data =
                JSON.parse(
                  response.responseText
                );

              resolve(
                clean(
                  data?.data?.title
                )
              );
            } catch (_) {
              resolve('');
            }
          },

          onerror() {
            resolve('');
          },

          ontimeout() {
            resolve('');
          }
        });
      }
    );
  }
  function startBiliClip() {
    const failed = new Set();
    const sync = (...features) => {
      for (const update of features) {
        try {
          update();
          failed.delete(update);
        } catch (error) {
          if (!failed.has(update)) console.warn('BiliClip:', update.name, error);
          failed.add(update);
        }
      }
    };

    if (isMember) {
      const updateCreatorPage = () => sync(
        syncUploadPanel, syncVideoPicker, syncTagPreset, syncCreatorPanelContext, startTutorialOnce
      );
      updateCreatorPage();
      setInterval(() => {
        updateCreatorPage();
        if (panelExecuting || declarationPending) return;
        if (!declarationBusy && autoKnowledge) applyKnowledge(true);
        if (!knowledgeBusy && declarationPrefs.auto) applyDeclaration(true);
      }, 1200);
      return;
    }

    if (isBili && location.pathname !== '/web/player/index.html') {
      const updateVideoPage = () => sync(createBiliUI, startTutorialOnce);
      updateVideoPage();
      setInterval(updateVideoPage, 1500);
    }
  }

  // ready() may run immediately when the userscript is injected into a loaded tab.
  ready(startBiliClip);
})();
