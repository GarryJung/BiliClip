// ==UserScript==
// @name         BiliClip 喵贴  B站一键填充BV码和标题
// @namespace    https://www.bilibili.com/
// @version      8.0.0
// @description  复制B站视频BV码和标题，在创作中心按一次粘贴自动填入两个输入框。
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

  const KEY = 'biliclip_pair_v72';
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
  const UPLOAD_KEY = 'biliclip_upload_settings_v1';
  let uploadPrefs = uploadSettings(GM_getValue(UPLOAD_KEY, null));
  let autoFilledDescriptions = new WeakSet();

  const isBili =
    /(^|\.)bilibili\.com$/i.test(location.hostname);

  const isMember =
    /(^|\.)member\.bilibili\.com$/i.test(location.hostname);

  let pair = validPair(
    GM_getValue(KEY, null)
  );

  let step = 0;
  let ui = null;
  let writingClipboard = false;
  let reminderKey = '';
  let creatorFields = null;
  let fillingCreator = false;

  GM_addValueChangeListener(
    KEY,
    (_key, _old, value) => {
      pair = validPair(value);
      step = 0;

      if (pair) {
        setTimeout(
          checkReminder,
          500
        );
      }
    }
  );

  document.addEventListener(
    'paste',
    onPaste,
    true
  );

  // 在 paste 时核对实际剪贴板内容。删除、剪切或按快捷键本身
  // 不应提前丢弃配对，否则无法在清空表单后重新填充。

  if (isBili) {
    GM_registerMenuCommand('喵贴 · 上传简介设置', () => ready(openUploadSettings));
    GM_registerMenuCommand('喵贴 · 标题填入简介第一行（含第二行预设）', () => ready(() => fillUploadDescription(true)));
    GM_registerMenuCommand('喵贴 · 填入简介第二行预设', () => ready(() => fillUploadDescription(false)));
  }
  GM_addValueChangeListener(UPLOAD_KEY, (_key, _old, value) => {
    uploadPrefs = uploadSettings(value);
    autoFilledDescriptions = new WeakSet();
  });

  ready(() => {
    if (isMember) {
      syncUploadPanel();
      syncVideoPicker();
      syncCreatorPanelContext();
      setInterval(() => {
        syncUploadPanel();
        syncVideoPicker();
        syncCreatorPanelContext();
        if (panelExecuting || declarationPending) return;
        autoFillSecondLine();
        if (!declarationBusy && autoKnowledge) applyKnowledge(true);
        if (!knowledgeBusy && declarationPrefs.auto) applyDeclaration(true);
      }, 1200);
    }
    if (pair) {
      checkReminder();
    }

    if (isBili && !isMember && location.pathname !== '/web/player/index.html') {
      createBiliUI();

      setInterval(
        createBiliUI,
        1500
      );
    }
  });

  setInterval(
    checkReminder,
    1000
  );

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

  function savePair(bv, title) {
    const value = {
      bv,
      title: clean(title),
      savedAt: Date.now()
    };

    GM_setValue(KEY, value);

    pair = validPair(value);
    step = 0;

    writeClipboard(bv);
  }

  function clearPair() {
    if (!pair) return;

    pair = null;
    step = 0;

    GM_setValue(KEY, null);
  }

  function writeClipboard(text) {
    writingClipboard = true;

    try {
      GM_setClipboard(
        text,
        'text'
      );
    } catch (_) {
      navigator.clipboard
        ?.writeText(text)
        .catch(() => {});
    }

    setTimeout(() => {
      writingClipboard = false;
    }, 200);
  }

  /* ==================== 粘贴与自动填充 ==================== */

  async function onPaste(event) {
    // 键盘、右键菜单和浏览器菜单均通过同一个 paste 事件处理。
    if (!isBili || !pair) return;
    if (event.composedPath().some(node => node?.id === 'biliclip-video-picker' || node?.id === 'biliclip-upload-panel')) return;

    const editor = getEventEditor(event);
    if (!editor) return;

    // 其他页面或程序复制的新内容优先，避免旧配对覆盖普通粘贴。
    const clipboardText = event.clipboardData?.getData('text/plain');
    if (
      clipboardText &&
      clean(clipboardText) !== pair.bv &&
      clean(clipboardText) !== pair.title
    ) {
      clearPair();
      return;
    }

    const fields =
      findCreatorFields();

    if (fields) {
      event.preventDefault();
      event.stopImmediatePropagation();

      await fillCreatorPair(pair);

      return;
    }

    if (isCreatorPage()) {
      event.preventDefault();
      event.stopImmediatePropagation();

      toast(
        '请先打开「关联视频」，等两个输入框出现后再粘贴',
        'pink',
        2300
      );

      return;
    }

    const text =
      step === 0
        ? pair.bv
        : pair.title;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (
      !insertAtCursor(
        editor,
        text
      )
    ) {
      return;
    }

    step =
      step === 0
        ? 1
        : 0;

    writeClipboard(
      step === 0
        ? pair.bv
        : pair.title
    );

    toast(
      step === 1
        ? '✓ BV 已粘贴 · 下次标题'
        : '✓ 标题已粘贴 · 下次 BV'
    );
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
  window.addEventListener('message', event => {
    if (!isMember || event.data?.type !== 'biliclip-editor-state') return;
    const entry = creatorEditorFrames().find(({frame, origin}) => frame.contentWindow === event.source && origin === event.origin);
    if (!entry) return;
    if (event.data.open === true) {
      if (!openEditorFrames.has(entry.frame)) document.getElementById('biliclip-video-picker')?.removeAttribute('data-collapsed');
      openEditorFrames.add(entry.frame);
    } else openEditorFrames.delete(entry.frame);
  });
  if (isBili && location.pathname === '/web/player/index.html' && window.parent !== window) {
    ready(() => {
      let lastOpen = null;
      setInterval(() => {
        const open = !!findCreatorFields();
        if (open === lastOpen) return;
        lastOpen = open;
        window.parent.postMessage({type:'biliclip-editor-state', open}, 'https://member.bilibili.com');
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
    const fields = findCreatorFields();
    if (!fields) {
      if (isMember && await fillCreatorFrame(current)) return true;
      toast('未找到关联视频输入框：请在个性化卡片中选择「关联视频」并点击「添加关联视频」；更新脚本后请刷新整个页面', 'pink', 5000);
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

      if (complete) {
        finalFields.title.focus();
        // 保留配对；清空后再次粘贴仍同时填充两个字段。
        toast('✓ 已自动填充「关联视频ID/链接」和「描述文案」', 'blue', 2200);
      } else {
        toast('自动填充未完成，请等两个输入框出现后再粘贴', 'pink', 2300);
      }
      return !!complete;
    } finally {
      fillingCreator = false;
    }

  }


  function isCreatorPage() {
    if (isMember) {
      return true;
    }

    const heading =
      document.querySelector(
        'h1, [class*="page-title"]'
      );

    const pageText = clean(
      `${document.title} ${
        heading?.textContent || ''
      }`
    );

    return /创作中心/.test(pageText);
  }

  function checkReminder() {
    if (
      !pair ||
      !document.body ||
      !isCreatorPage()
    ) {
      return;
    }

    const key =
      `${pair.savedAt}:${location.href}`;

    if (key === reminderKey) {
      return;
    }

    reminderKey = key;

    toast(
      '已复制 BV + 标题｜打开「关联视频」后，在任一输入框按 Ctrl+V 或右键粘贴，自动填充两个输入框',
      'blue',
      4300
    );
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

    // 同一组输入框清空后继续使用，避免标签或提示变化导致退回交替粘贴。
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

  function getEventEditor(event) {
    const path =
      event.composedPath
        ? event.composedPath()
        : [event.target];

    const editors =
      visibleEditors();

    for (
      const node of path
    ) {
      if (
        !(node instanceof Element)
      ) {
        continue;
      }

      const editor =
        node.closest(
          [
            'input',
            'textarea',
            '[contenteditable="true"]',
            '[contenteditable=""]',
            '[role="textbox"]'
          ].join(',')
        );

      if (
        editor &&
        editors.includes(editor)
      ) {
        return editor;
      }
    }

    return null;
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

  function insertAtCursor(
    editor,
    text
  ) {
    if (
      editor instanceof
        HTMLInputElement ||
      editor instanceof
        HTMLTextAreaElement
    ) {
      const start =
        editor.selectionStart ??
        editor.value.length;

      const end =
        editor.selectionEnd ??
        start;

      const value =
        editor.value.slice(
          0,
          start
        ) +
        text +
        editor.value.slice(end);

      nativeValue(
        editor,
        value
      );

      editor.setSelectionRange(
        start + text.length,
        start + text.length
      );

      fireInput(
        editor,
        text
      );

      return true;
    }

    editor.focus();

    const selection =
      getSelection();

    if (!selection) {
      return false;
    }

    if (
      !selection.rangeCount ||
      !editor.contains(
        selection.anchorNode
      )
    ) {
      const range =
        document.createRange();

      range.selectNodeContents(
        editor
      );

      range.collapse(false);

      selection.removeAllRanges();
      selection.addRange(range);
    }

    if (
      document.execCommand?.(
        'insertText',
        false,
        text
      )
    ) {
      return true;
    }

    const range =
      selection.getRangeAt(0);

    range.deleteContents();

    const node =
      document.createTextNode(text);

    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);

    selection.removeAllRanges();
    selection.addRange(range);

    fireInput(
      editor,
      text
    );

    return true;
  }

  /* ==================== 上传简介与菜单 ==================== */

  function uploadSettings(value) {
    return {
      secondLine: String(value?.secondLine || '').replace(/[\r\n]+/g, ' ').trim(),
      autoSecondLine: value?.autoSecondLine === true
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
    if (!fields) return toast(isUploadPage() ? '未识别到简介编辑器，请在视频上传完成、简介框出现后重试（简介直连修复）' : '请先进入 B 站视频上传页（简介直连修复）', 'pink', 3200);
    const title = withTitle ? clean(fields.title?.value) : null;
    if (withTitle && !title) return toast('请先填写上传视频的标题', 'pink');
    if (!withTitle && !uploadPrefs.secondLine) return toast('请先在「上传简介设置」中保存第二行预设', 'pink');
    const preset = uploadPrefs.secondLine || null;
    const text = descriptionLines(descriptionText(fields.description), title, preset);
    const done = writeDescription(fields.description, text);
    toast(done ? '✓ 简介已填入，请检查后再投稿' : '简介填入未完成，请检查编辑器内容', done ? 'blue' : 'pink', 2600);
  }

  function autoFillSecondLine() {
    if (!uploadPrefs.autoSecondLine || !uploadPrefs.secondLine || document.hidden) return;
    const fields = findUploadFields();
    if (!fields || fields.description === document.activeElement || fields.description.contains(document.activeElement)) return;
    const editor = fields.description;
    if (autoFilledDescriptions.has(editor)) return;
    const text = descriptionText(editor);
    // 自动模式只补空白第二行，已有内容由用户通过菜单主动替换。
    if (text.split('\n')[1]?.trim()) return;
    autoFilledDescriptions.add(editor);
    const next = descriptionLines(text, null, uploadPrefs.secondLine);
    writeDescription(editor, next, true); // 自动补充每个框只尝试一次，失败也不循环插入。
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
      </style>
      <section role="dialog" aria-modal="true" aria-labelledby="heading">
        <form><h2 id="heading">喵贴 · 上传简介设置</h2>
          <p>一键填入会将上传页标题写入简介第一行，并填入已保存的第二行预设。第三行及以后的文字保留。</p>
          <label>简介第二行预设<input type="text" name="preset" placeholder="例如：关注我，获取更多精彩内容"></label>
          <label><input type="checkbox" name="auto"> 自动补充空白的简介第二行</label>
          <p>自动模式不替换已有第二行；每个简介框补充一次，删除后不会反复补回。菜单操作可再次主动填入。</p>
          <footer><button type="button" id="cancel">取消</button><button type="submit">保存设置</button></footer>
        </form>
      </section>`;
    const input = root.querySelector('[name=preset]');
    const checkbox = root.querySelector('[name=auto]');
    input.value = uploadPrefs.secondLine;
    checkbox.checked = uploadPrefs.autoSecondLine;
    root.querySelector('#cancel').onclick = () => host.remove();
    host.addEventListener('keydown', event => { if (event.key === 'Escape') host.remove(); });
    root.querySelector('form').onsubmit = event => {
      event.preventDefault();
      uploadPrefs = uploadSettings({ secondLine: input.value, autoSecondLine: checkbox.checked });
      GM_setValue(UPLOAD_KEY, uploadPrefs);
      autoFilledDescriptions = new WeakSet();
      host.remove();
      toast('✓ 上传简介设置已保存');
      autoFillSecondLine();
    };
    document.body.appendChild(host);
    input.focus();
  }

  /* ==================== 8.0.0 上传页右侧悬浮面板 ==================== */

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
    return isManuscriptManagementPage() || (isUploadPage() && creatorEditorFrames().some(({frame}) => creatorElementVisible(frame)));
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
    if (picker && isManuscriptManagementPage()) constrainManagementLibrary(picker,picker.shadowRoot);
    expandCreatorMoreSettings();
  }

  document.addEventListener('click', event => {
    if (!isBili || event.composedPath().some(node => node?.id?.startsWith?.('biliclip-'))) return;
    const associationClick = event.composedPath().some(node => /^(?:[+＋]\s*)?(?:添加)?关联视频$/.test(clean(node?.textContent)));
    if (associationClick) {
      if (location.pathname === '/web/player/index.html') setTimeout(ensureAssociationExpanded, 120);
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
      videos.set(item.bvid, { bv: item.bvid, title: clean(item.title), created: Number(item.ptime || item.pubdate || item.ctime || item.created) || 0, cover: pickerCover(item.cover || item.pic), duration: Number(item.duration) || 0, play: Number(row?.stat?.view ?? item.stat?.view ?? item.play) || 0 });
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
    if (!seconds) return '时间未知';
    return new Date(seconds * 1000).toLocaleDateString('zh-CN');
  }

  function pickerDuration(seconds) {
    return Math.floor(seconds / 60) + ':' + String(Math.floor(seconds % 60)).padStart(2, '0');
  }

  function pickerPlay(count) {
    return count >= 10000 ? (count / 10000).toFixed(1) + '万' : String(count);
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
      if (pickerState && pickerState.uploadTitle !== title) {
        pickerState.uploadTitle = title;
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
        aside{width:280px;max-width:calc(100vw - 32px);max-height:calc(100vh - 160px);overflow:auto;background:white;color:#18191c;border:1px solid #e3e8ef;border-radius:14px;box-shadow:0 8px 30px #182a4426;font:13px/1.5 system-ui,"PingFang SC",sans-serif}
        header{position:sticky;top:0;background:#fff;z-index:1;display:flex;align-items:center;justify-content:space-between;padding:12px;border-bottom:1px solid #eef1f5}h2{font-size:14px;margin:0}.body{padding:12px}
        button,input{font:inherit}button{border:0;border-radius:7px;background:#edf7fc;color:#008abc;padding:6px 9px;cursor:pointer}button:disabled{opacity:.5;cursor:wait}input{width:100%;border:1px solid #dce1e8;border-radius:7px;padding:8px;background:white;color:#18191c}
        .tools{display:flex;gap:6px;margin:8px 0}.status,.hint{font-size:11px;color:#61666d;margin:8px 0;overflow-wrap:anywhere}.cover{grid-row:1 / 5;width:76px;height:48px;object-fit:cover;border-radius:6px;background:#f1f4f8}.meta{display:flex;flex-wrap:wrap;gap:4px 8px;align-items:center;font-size:11px;color:#9499a0;margin:5px 0}.meta svg{width:12px;height:12px;vertical-align:-2px;margin-right:3px}.item{display:grid;grid-template-columns:76px minmax(0,1fr);gap:2px 8px;border-top:1px solid #eef1f5;padding:8px 0}.item>.title,.item>.bv,.item>.meta,.item>.actions{grid-column:2;min-width:0}.title{overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.bv{font-size:11px;color:#9499a0;margin:4px 0}.actions{display:flex;gap:6px;flex-wrap:nowrap;grid-column:1 / -1!important;justify-content:flex-end}.actions button{font-size:11px;padding:4px 6px}.tab{display:none}:host([data-collapsed]) aside{display:none}:host([data-collapsed]) .tab{display:block}
        :focus-visible{outline:2px solid #00aeec;outline-offset:2px}
        @media(max-width:900px){aside{width:240px}} 
      </style>
      <button type="button" class="tab">喵贴 · 关联视频库</button>
      <aside aria-label="关联视频库"><header><h2>喵贴 · 关联视频库</h2><button type="button" id="collapse" aria-label="收起视频面板">−</button></header>
      <div class="body"><input id="query" type="search" placeholder="搜索我的视频标题 / BV" aria-label="搜索视频标题或 BV">
      <div class="tools"><button type="button" id="refresh">刷新我的视频</button><button type="button" id="recommend">相关推荐</button></div>
      <div class="hint">按当前投稿标题推荐；无匹配时显示最新稿件。填入前请展开「关联视频」。</div>
      <div id="status" class="status" role="status"></div><div id="list"></div></div></aside>`;
    const get = id => root.getElementById(id);
    const uid = document.cookie.match(/(?:^|;\s*)DedeUserID=(\d+)/)?.[1];
    const cacheKey = uid ? 'biliclip_my_videos_v1_' + uid : null;
    const state = { videos: [], uploadTitle: clean(findUploadFields()?.title?.value), busy: false, render: null };
    pickerState = state;
    const status = text => { get('status').textContent = text; };
    state.render = () => {
      const query = clean(get('query').value).toLowerCase();
      let videos = state.videos.filter(v => !query || v.title.toLowerCase().includes(query) || v.bv.toLowerCase().includes(query));
      if (!query && state.uploadTitle) videos = [...videos].sort((a, b) => pickerScore(b.title, state.uploadTitle) - pickerScore(a.title, state.uploadTitle) || b.created - a.created);
      get('list').replaceChildren();
      for (const video of videos.slice(0, 100)) {
        const item = document.createElement('div'); item.className = 'item';
        const title = document.createElement('div'); title.className = 'title'; title.textContent = video.title;
        const bv = document.createElement('div'); bv.className = 'bv'; bv.textContent = video.bv;
        const actions = document.createElement('div'); actions.className = 'actions';
        for (const [label, action] of [
          ['填入', async () => { status('正在填入关联视频…'); try { const ok = await fillCreatorPair(video); status(ok ? '✓ BV 和标题已填入，请检查后提交组件' : '未填入：请先在个性化卡片中添加关联视频。更新脚本后需刷新整个页面'); } catch (error) { status('填入失败：' + error.message); } }],
          ['复制', () => { savePair(video.bv, video.title); status('已复制，在关联视频任一输入框粘贴即可填入 BV 和标题'); }]
        ]) {
          const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
          button.title = label === '填入' ? '填入 BV + 标题' : '复制 BV + 标题';
          button.addEventListener('mousedown', event => event.preventDefault());
          button.onclick = action; actions.append(button);
        }
        if (video.cover) {
          const cover = document.createElement('img'); cover.className = 'cover'; cover.src = video.cover;
          cover.alt = ''; cover.loading = 'lazy'; cover.referrerPolicy = 'no-referrer'; item.append(cover);
        }
        const meta = document.createElement('div'); meta.className = 'meta';
        const time = document.createElement('span'); time.textContent = pickerTime(video.created);
        const play = document.createElement('span');
        play.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1" y="2" width="14" height="12" rx="3" fill="none" stroke="currentColor"/><path d="m6 5 5 3-5 3z" fill="currentColor"/></svg>';
        play.append(document.createTextNode(pickerPlay(video.play) + ' 播放')); meta.append(time, play);
        item.append(title, bv, meta, actions); get('list').append(item);
      }
      if (!videos.length) get('list').textContent = state.videos.length ? '没有匹配的视频' : '暂无视频，点击刷新读取已发布稿件';
      if (videos.length > 100) { const hint = document.createElement('div'); hint.textContent = '仅显示前 100 条，请输入关键词缩小范围'; get('list').append(hint); }
    };
    get('query').oninput = state.render;
    get('recommend').onclick = () => { get('query').value = ''; state.uploadTitle = clean(findUploadFields()?.title?.value); state.render(); };
    const collapse = value => { host.toggleAttribute('data-collapsed', value); GM_setValue('biliclip_picker_collapsed', value); };
    get('collapse').onclick = () => collapse(true);
    root.querySelector('.tab').onclick = () => collapse(false);
    host.removeAttribute('data-collapsed');
    get('refresh').onclick = async () => {
      if (state.busy) return;
      state.busy = true; get('refresh').disabled = true;
      const collected = [];
      try {
        for (let page = 1; page <= 40; page++) {
          if (!host.isConnected || pickerState !== state) return;
          status('正在读取第 ' + page + ' 页…');
          const response = await fetch('https://member.bilibili.com/x/web/archives?status=pubed&pn=' + page + '&ps=50&coop=1&interactive=1', { credentials: 'include', cache: 'no-store', signal: AbortSignal.timeout(15000) });
          if (!response.ok) throw new Error('请求失败 HTTP ' + response.status);
          const json = await response.json();
          if (json.code !== 0 || !Array.isArray(json.data?.arc_audits)) throw new Error(json.message || '稿件读取失败，请确认已登录');
          const rows = json.data.arc_audits;
          collected.push(...rows);
          const total = Number(json.data.page?.count) || 0;
          if (!rows.length || (total ? page * 50 >= total : rows.length < 50) || page === 40) {
            state.videos = pickerVideos(collected); state.render();
            if (cacheKey) GM_setValue(cacheKey, { time: Date.now(), videos: state.videos });
            status('已读取 ' + state.videos.length + ' 个视频' + (total > 2000 ? '（最新 2000 条）' : '')); break;
          }
          await new Promise(resolve => setTimeout(resolve, 1200));
        }
      } catch (error) { status('刷新失败：' + error.message + '。已保留之前的列表，请稍后重试'); }
      finally { state.busy = false; get('refresh').disabled = false; }
    };
    const cached = cacheKey && GM_getValue(cacheKey, null);
    if (cached && Array.isArray(cached.videos)) {
      state.videos = pickerVideos(cached.videos.map(v => ({ ...v, bvid: v.bv })));
      status('已载入本账号缓存' + (Date.now() - cached.time > 86400000 ? '，建议刷新' : ''));
    } else status('点击刷新读取自己的已发布视频');
    document.body.append(host);
    state.render();
    enablePanelMovement(host, root, 'left');
  }

  function syncUploadPanel() {
    let host = document.getElementById('biliclip-upload-panel');
    if (!isUploadPage()) { host?.remove(); return; }
    if (!document.body || host) return;
    host = document.createElement('div');
    host.id = 'biliclip-upload-panel';
    host.style.cssText = 'all:initial;position:fixed;right:16px;top:160px;z-index:2147483646;max-width:calc(100vw - 24px)';
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <style>
        :host{color-scheme:light}*{box-sizing:border-box}button,input{font:inherit}
        .panel{width:260px;max-width:calc(100vw - 24px);max-height:calc(100vh - 160px);overflow:auto;background:#fff;color:#18191c;border:1px solid #e3e8ef;border-radius:14px;box-shadow:0 8px 30px #182a4426;font:13px/1.5 system-ui,"PingFang SC",sans-serif}
        header{position:sticky;top:0;background:#fff;z-index:1;display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #eef1f5}h2{font-size:14px;margin:0}small{font-size:10px;color:#9499a0;margin-left:5px}
        button{border:0;border-radius:8px;cursor:pointer;padding:7px 10px;background:#f1f4f8;color:#414852}button:disabled{opacity:.6;cursor:wait}button:hover{filter:brightness(.97)}
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
      </style>
      <button class="tab" type="button">喵贴 · 投稿工作台</button>
      <aside class="panel" aria-label="投稿工作台">
        <header><h2>喵贴 · 投稿工作台<small>8.0.0</small></h2><button class="collapse" type="button" aria-label="收起面板">−</button></header>
        <div class="body">
          <button id="execute" type="button" class="primary">一键执行</button>
          <div class="row"><span class="name">标题</span><label class="toggle"><input id="copy-title" type="checkbox" checked>抄录到简介第一行</label></div>
          <div class="row"><span class="name">声明</span><button id="declaration-summary" class="declaration-trigger" type="button" popovertarget="declaration-menu" aria-label="选择创作声明"><span id="declaration-label">请选择声明</span><span class="chevron">⌄</span></button></div>
          <div class="copyright-row"><label class="toggle"><input id="copyright" type="checkbox"><span>内容为自制：未经作者允许，禁止转载</span></label></div>
          <div class="row"><span class="name">分区</span><label class="toggle"><input id="knowledge" type="checkbox" checked>知识</label></div>
          <div class="row"><label class="name" for="preset">简介</label><div><input id="preset" type="text" placeholder="第二行引导话术"><div class="hint">保留第三行及后续文字</div></div></div>
          <div class="row"><span class="name">推广</span><label class="toggle"><input id="commercial" type="checkbox">增加商业推广信息</label></div>
          <div class="row"><span class="name">更多</span><label class="toggle"><input id="more-auto" type="checkbox">自动展开页面「更多设置」</label></div>
          <details class="settings"><summary>自动执行设置</summary>
            <label class="toggle"><input id="knowledge-auto" type="checkbox">自动选择知识分区</label>
            <label class="toggle"><input id="declaration-auto" type="checkbox">自动选择预设声明</label>
            <label class="toggle"><input id="auto" type="checkbox">自动补充空白第二行</label>
          </details>
          <p class="status" role="status" aria-live="polite">设置自动保存</p><div class="foot">执行后请核对内容，再手动投稿</div>
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
    get('auto').checked = uploadPrefs.autoSecondLine;
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
      uploadPrefs = uploadSettings({secondLine:get('preset').value, autoSecondLine:get('auto').checked});
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
        get('execute').textContent = '一键执行';
        panelExecuting = false;
      }
    };
    document.body.appendChild(host);
    enablePanelMovement(host, root, 'right');
  }

  /* ==================== 提醒 ==================== */

  function toast(
    message,
    color = 'blue',
    duration = 1800
  ) {
    let host =
      document.getElementById(
        'biliclip-toast-host'
      );

    if (!host) {
      host =
        document.createElement(
          'div'
        );

      host.id =
        'biliclip-toast-host';

      host.style.cssText = [
        'all:initial',
        'position:fixed',
        'inset:0',
        'width:0',
        'height:0',
        'z-index:2147483647',
        'pointer-events:none'
      ].join(';');

      const shadow =
        host.attachShadow({
          mode: 'open'
        });

      shadow.innerHTML = `
        <style>
          .toast {
            position: fixed;
            top: 72px;
            left: 50%;
            max-width:
              calc(100vw - 24px);
            padding: 9px 14px;
            border:
              1px solid
              rgba(255,255,255,.75);
            border-radius: 11px;
            color: #30343b;
            background:
              rgba(255,255,255,.96);
            box-shadow:
              0 9px 28px
              rgba(24,25,28,.15);
            backdrop-filter:
              blur(18px);
            font:
              13px/1.5
              -apple-system,
              BlinkMacSystemFont,
              "Segoe UI",
              "PingFang SC",
              sans-serif;
            white-space: nowrap;
            opacity: 0;
            transform:
              translate(-50%,-7px)
              scale(.97);
            transition:
              .22s
              cubic-bezier(
                .2,.9,.25,1.15
              );
          }

          .toast.blue {
            border-color:
              rgba(0,174,236,.28);
          }

          .toast.pink {
            border-color:
              rgba(251,114,153,.36);
          }

          .toast.show {
            opacity: 1;
            transform:
              translate(-50%,0)
              scale(1);
          }
        </style>

        <div
          class="toast"
          role="status"
        ></div>
      `;

      (
        document.body ||
        document.documentElement
      ).appendChild(host);
    }

    const box =
      host.shadowRoot
        .querySelector(
          '.toast'
        );

    box.textContent = message;
    box.className =
      `toast ${color}`;
    box.style.display =
      'block';

    requestAnimationFrame(
      () => {
        box.classList.add(
          'show'
        );
      }
    );

    clearTimeout(
      host._timer
    );

    host._timer =
      setTimeout(() => {
        box.classList.remove(
          'show'
        );

        setTimeout(() => {
          box.style.display =
            'none';
        }, 220);
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

        .hover,
        .bar {
          position: fixed;
          display: none;
          align-items: center;
          pointer-events: auto;
        }

        .hover {
          gap: 5px;
          height: 32px;
          padding:
            0 11px 0 8px;
          border: 0;
          border-radius: 10px;
          color: #ffffff;
          background: #fb7299;
          box-shadow:
            0 6px 17px
            rgba(251,114,153,.28);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: .18s;
        }

        .hover:hover,
        .primary:hover {
          background: #ff83a7;
          transform:
            translateY(-1px);
        }

        .hover:active,
        .btn:active {
          transform:
            scale(.95);
        }

        .hover:disabled {
          opacity: .72;
          cursor: wait;
        }

        .icon {
          display: grid;
          place-items: center;
          width: 19px;
          height: 19px;
          border-radius: 6px;
          background:
            rgba(255,255,255,.18);
        }

        .icon svg {
          width: 11px;
          height: 11px;
        }

        .bar {
          gap: 7px;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          height: 32px;
          padding: 0 11px;
          border: 0;
          border-radius: 10px;
          color: #ffffff;
          background: #00aeec;
          box-shadow:
            0 6px 16px
            rgba(0,174,236,.22);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: .18s;
        }

        .btn:hover {
          background: #20baef;
          transform:
            translateY(-1px);
        }

        .btn.primary {
          background: #fb7299;
          box-shadow:
            0 6px 16px
            rgba(251,114,153,.24);
        }

        .mini,
        .mini svg {
          display: grid;
          width: 14px;
          height: 14px;
        }

        .tip {
          position: fixed;
          display: none;
          padding: 6px 10px;
          border:
            1px solid
            rgba(0,174,236,.2);
          border-radius: 9px;
          color: #30343b;
          background:
            rgba(255,255,255,.95);
          box-shadow:
            0 7px 20px
            rgba(24,25,28,.13);
          font:
            11px/1.45
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            "PingFang SC",
            sans-serif;
          white-space: nowrap;
          opacity: 0;
          transform:
            translateY(5px);
          transition: .2s;
        }

        .tip.show {
          opacity: 1;
          transform:
            translateY(0);
        }
      </style>

      <button
        class="hover"
        type="button"
      >
        <span class="icon">
          ${copyIcon()}
        </span>

        <span class="hover-text">
          复制 BV + 标题
        </span>
      </button>

      <div class="bar">
        <button
          class="btn"
          data-action="title"
        >
          <span class="mini">
            ${copyIcon()}
          </span>
          复制标题
        </button>

        <button
          class="btn"
          data-action="bv"
        >
          <span class="mini">
            ${copyIcon()}
          </span>
          复制 BV
        </button>

        <button
          class="btn primary"
          data-action="both"
        >
          <span class="mini">
            ${copyIcon()}
          </span>
          复制 BV+标题
        </button>
      </div>

      <div class="tip"></div>
    `;

    document.body
      .appendChild(host);

    ui = {
      host,
      hover:
        shadow.querySelector(
          '.hover'
        ),
      hoverText:
        shadow.querySelector(
          '.hover-text'
        ),
      bar:
        shadow.querySelector(
          '.bar'
        ),
      tip:
        shadow.querySelector(
          '.tip'
        ),
      active: null,
      title: null,
      frame: 0,
      tipTimer: 0
    };

    bindBiliUI();
    const modeObserver = new MutationObserver(syncVideoBar);
    modeObserver.observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['class', 'data-screen'] });
    document.addEventListener('fullscreenchange', syncVideoBar);
    document.addEventListener('webkitfullscreenchange', syncVideoBar);
    syncVideoBar();

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

  function copyIcon() {
    return [
      '<svg ',
      'viewBox="0 0 24 24" ',
      'fill="none" ',
      'stroke="currentColor" ',
      'stroke-width="2.2">',
      '<rect ',
      'x="8" y="8" ',
      'width="11" height="11" ',
      'rx="2"/>',
      '<path ',
      'd="M16 8V6a2 2 0 0 0-2-2H6',
      'a2 2 0 0 0-2 2v8',
      'a2 2 0 0 0 2 2h2"/>',
      '</svg>'
    ].join('');
  }

  function bindBiliUI() {
    document.addEventListener(
      'pointermove',
      event => {
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

              if (
                ui.hover.matches(
                  ':hover'
                )
              ) {
                return;
              }

              const cover =
                findCover(x, y);

              if (!cover) {
                ui.hover.style.display =
                  'none';

                ui.active = null;

                return;
              }

              const bv =
                getBV(
                  cover.href
                );

              if (!bv) return;

              ui.active = {
                cover,
                bv,
                title:
                  cardTitle(
                    cover
                  )
              };

              ui.hoverText
                .textContent =
                '复制 BV + 标题';

              ui.hover.disabled =
                false;

              ui.hover.style.display =
                'flex';

              positionHover();
            }
          );
      },
      true
    );

    ui.hover.addEventListener(
      'click',
      async event => {
        event.preventDefault();
        event.stopPropagation();

        const video =
          ui.active;

        if (!video) return;

        ui.hover.disabled =
          true;

        ui.hoverText
          .textContent =
          '读取中…';

        const title =
          video.title ||
          await fetchTitle(
            video.bv
          );

        if (!title) {
          ui.hover.disabled =
            false;

          ui.hoverText
            .textContent =
            '读取失败';

          buttonTip(
            ui.hover,
            '读取失败，请重试'
          );

          return;
        }

        savePair(
          video.bv,
          title
        );

        ui.hover.disabled =
          false;

        ui.hoverText
          .textContent =
          '已复制';

        buttonTip(
          ui.hover,
          '✓ 已复制 · 创作中心一次粘贴'
        );

        setTimeout(() => {
          if (ui?.hover) {
            ui.hoverText
              .textContent =
              '复制 BV + 标题';
          }
        }, 1600);
      }
    );

    ui.bar.addEventListener(
      'click',
      async event => {
        const button =
          event.target.closest(
            'button[data-action]'
          );

        if (!button) return;

        event.preventDefault();
        event.stopPropagation();

        const bv =
          getBV(
            location.href
          );

        const title =
          currentTitle() ||
          (
            bv
              ? await fetchTitle(bv)
              : ''
          );

        if (
          button.dataset.action ===
          'bv'
        ) {
          if (!bv) {
            return buttonTip(
              button,
              'BV 读取失败'
            );
          }

          clearPair();
          writeClipboard(bv);

          return buttonTip(
            button,
            '✓ BV 已复制'
          );
        }

        if (
          button.dataset.action ===
          'title'
        ) {
          if (!title) {
            return buttonTip(
              button,
              '标题读取失败'
            );
          }

          clearPair();
          writeClipboard(title);

          return buttonTip(
            button,
            '✓ 标题已复制'
          );
        }

        if (
          !bv ||
          !title
        ) {
          return buttonTip(
            button,
            '读取失败'
          );
        }

        savePair(
          bv,
          title
        );

        buttonTip(
          button,
          '✓ 已复制 · 创作中心一次粘贴'
        );
      }
    );
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
      ui.hover.offsetWidth ||
      145;

    ui.hover.style.left =
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

    ui.hover.style.top =
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
    if (!ui) return;
    const hidden = playerIsFullscreen();
    ui.host.style.setProperty('display', hidden ? 'none' : 'block', 'important');
    if (hidden) {
      ui.hover.style.display = 'none';
      ui.bar.style.display = 'none';
      ui.active = null;
    }
  }

  function syncVideoBar() {
    if (!ui) return;
    syncFullscreenUI();
    if (playerIsFullscreen()) return;

    if (
      !/^\/video\/BV[0-9A-Za-z]{10}/i
        .test(
          location.pathname
        )
    ) {
      ui.title = null;

      ui.bar.style.display =
        'none';

      return;
    }

    ui.title =
      document.querySelector(
        [
          'h1.video-title',
          'h1[data-title]',
          '.video-info-title h1',
          '.video-title'
        ].join(',')
      );

    if (!ui.title) {
      ui.bar.style.display =
        'none';

      return;
    }

    ui.bar.style.display =
      'flex';

    positionBar();
  }

  function positionUI() {
    if (!ui) return;

    if (
      ui.active &&
      ui.hover.style.display !==
        'none'
    ) {
      positionHover();
    }

    if (ui.title) {
      positionBar();
    }
  }

  function positionBar() {
    if (
      !ui?.title?.isConnected
    ) {
      return;
    }

    const titleRect =
      ui.title
        .getBoundingClientRect();

    const rows = [
      ...document.querySelectorAll(
        [
          '.video-info-detail-list',
          '.video-info-detail',
          '.video-data'
        ].join(',')
      )
    ];

    const row =
      rows.find(element => {
        const rect =
          element.getBoundingClientRect();

        return (
          rect.width > 40 &&
          rect.top >=
            titleRect.top &&
          rect.top <=
            titleRect.bottom + 100
        );
      });

    if (
      !row ||
      titleRect.bottom < 58
    ) {
      ui.bar.style.display =
        'none';

      return;
    }

    ui.bar.style.display =
      'flex';

    const rowRect =
      row.getBoundingClientRect();

    const datePattern =
      /\d{4}\s*[-/.]\s*\d{1,2}\s*[-/.]\s*\d{1,2}/;

    const dateElements = [
      ...row.querySelectorAll('*')
    ]
      .filter(element => {
        const text =
          clean(
            element.textContent
          );

        if (
          !datePattern.test(text)
        ) {
          return false;
        }

        const rect =
          element.getBoundingClientRect();

        if (
          rect.width <= 1 ||
          rect.height <= 1
        ) {
          return false;
        }

        return ![
          ...element.children
        ].some(child =>
          datePattern.test(
            clean(
              child.textContent
            )
          )
        );
      })
      .sort((a, b) => {
        const aRect =
          a.getBoundingClientRect();

        const bRect =
          b.getBoundingClientRect();

        return (
          aRect.width *
            aRect.height -
          bRect.width *
            bRect.height
        );
      });

    const dateElement =
      row.querySelector(
        [
          '.pubdate-ip-text',
          '.pubdate-text',
          '.pubdate-ip',
          '[class*="pubdate"]'
        ].join(',')
      ) ||
      dateElements[0];

    const anchorRect =
      dateElement
        ?.getBoundingClientRect() ||
      rowRect;

    const width =
      ui.bar.offsetWidth ||
      275;

    const height =
      ui.bar.offsetHeight ||
      32;

    ui.bar.style.left =
      `${
        Math.max(
          12,
          Math.min(
            innerWidth -
              width -
              12,
            anchorRect.right +
              18
          )
        )
      }px`;

    ui.bar.style.top =
      `${
        Math.max(
          62,
          anchorRect.top +
          (
            anchorRect.height -
            height
          ) / 2
        )
      }px`;
  }

  function buttonTip(
    button,
    message
  ) {
    const tip = ui.tip;

    const rect =
      button.getBoundingClientRect();

    tip.textContent =
      message;

    tip.style.display =
      'block';

    tip.classList.remove(
      'show'
    );

    requestAnimationFrame(
      () => {
        const width =
          tip.offsetWidth;

        tip.style.left =
          `${
            Math.max(
              10,
              Math.min(
                innerWidth -
                  width -
                  10,
                rect.left +
                rect.width / 2 -
                width / 2
              )
            )
          }px`;

        tip.style.top =
          `${
            Math.max(
              10,
              rect.top -
              tip.offsetHeight -
              7
            )
          }px`;

        tip.classList.add(
          'show'
        );
      }
    );

    clearTimeout(
      ui.tipTimer
    );

    ui.tipTimer =
      setTimeout(() => {
        tip.classList.remove(
          'show'
        );

        setTimeout(() => {
          tip.style.display =
            'none';
        }, 200);
      }, 1100);
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
})();
