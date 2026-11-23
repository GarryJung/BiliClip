// ==UserScript==
// @name         BiliClip 喵贴  B站一键填充BV码和标题
// @namespace    https://www.bilibili.com/
// @version      7.2.3
// @description  复制B站视频BV码和标题，在创作中心按一次粘贴自动填入两个输入框。
// @author       Garry Jung
// @match        http://*/*
// @match        https://*/*
// @run-at       document-start
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

  ready(() => {
    if (pair) {
      checkReminder();
    }

    if (isBili && !isMember) {
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

      if (fillingCreator) return;
      fillingCreator = true;
      const current = pair;

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
      } finally {
        fillingCreator = false;
      }

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
      ...document.querySelectorAll(
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
      ...document.querySelectorAll(
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

  function syncVideoBar() {
    if (!ui) return;

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
