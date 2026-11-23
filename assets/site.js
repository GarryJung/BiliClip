(() => {
  'use strict';
  document.documentElement.classList.add('js');
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  $$('[data-browser-installer]').forEach(installer => {
    const tabs = $$('[role=tab]', installer), panels = $$('[role=tabpanel]', installer);
    const select = index => tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index)); tab.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
    });
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(i));
      tab.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (i + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        select(next); tabs[next].focus();
      });
    });
  });

  const menu = $('.menu-toggle'), nav = $('#main-nav');
  menu?.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? '收起导航' : '展开导航');
    nav.classList.toggle('open', open);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav?.classList.contains('open')) {
      menu.click(); menu.focus();
    }
  });
  $$('[data-description-demo]').forEach(demo => {
    const field = $('[data-demo-description]', demo);
    const original = field.value;
    const choices = () => $$('[data-demo-description-choice]', demo);
    $('[data-demo-clear]', demo).onclick = () => choices().forEach(input => { input.checked = false; });
    $('[data-demo-execute]', demo).onclick = () => {
      const lines = field.value.split('\n');
      const useTitle = $('[data-demo-copy-title]', demo).checked;
      const title = $('[data-demo-title]', demo).value.trim();
      if (useTitle && !title) { $('[data-demo-result]', demo).textContent = '请先填写示例标题'; return; }
      if (useTitle) lines[0] = title;
      const selected = choices().filter(input => input.checked).map(input => input.value);
      const originalText = lines.join('\n');
      field.value = originalText + (selected.length ? (originalText && !originalText.endsWith('\n') ? '\n' : '') + selected.join('\n') : '');
      $('[data-demo-result]', demo).textContent = useTitle || selected.length ? '示例执行完成，请核对简介；重复执行会再次追加。' : '未选择执行项目，示例简介保持不变。';
    };
    $('[data-demo-reset]', demo).onclick = () => {field.value = original; $('[data-demo-result]', demo).textContent = '示例已还原，不修改你的 B 站页面。';};
  });
  $$('[data-tags-demo]').forEach(demo => {
    const result = $('[data-demo-tags-result]', demo), status = $('[data-demo-tags-status]', demo);
    $('[data-demo-add-tags]', demo).onclick = () => {result.textContent = '生活记录、学习'; status.textContent = '示例执行完成：已添加 1 个标签，跳过已有的「生活记录」。';};
    $('[data-demo-delete-tags]', demo).onclick = () => {const row = $('.current-tag-entry', demo); row.hidden = true;status.textContent = '已删除示例预设组，当前稿件的示例标签保留。';};
  });
  const articles = $$('.doc-article');
  if (articles.length) {
    const selectArticle = (scroll = false) => {
      const hash = decodeURIComponent(location.hash.slice(1));
      if (hash === 'top' || hash === 'main') return;
      const target = document.getElementById(hash);
      const article = target?.closest('.doc-article') || articles.find(a => hash === a.id || hash.startsWith(a.id + '-step-')) || articles[0];
      articles.forEach(a => a.classList.toggle('active', a === article));
      $$('[data-doc-link]').forEach(a => {
        const active = a.dataset.docLink === article.id;
        a.classList.toggle('active', active);
        if (active) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
      });
      const toc = $('[data-doc-toc]'); toc.replaceChildren();
      $$('section',article).forEach(section => {
        const a = document.createElement('a'); a.href = '#' + section.id; a.textContent = $('h2',section).textContent; toc.append(a);
      });
      if (scroll) requestAnimationFrame(() => {
        const section = document.getElementById(hash);
        (section && section !== article ? section : $('.docs-content')).scrollIntoView({block:'start',behavior:'instant'});
      });
    };
    selectArticle(Boolean(location.hash));
    window.addEventListener('hashchange', () => selectArticle(true));
    $('#docs-search').addEventListener('input', e => {
      const term = e.target.value.trim().toLowerCase(); let matches = 0;
      $$('[data-doc-link]').forEach(a => {
        const article = articles.find(article => article.id === a.dataset.docLink);
        a.hidden = !article.textContent.toLowerCase().includes(term);
        if (!a.hidden) matches++;
      });
      $('.search-no-result').hidden = matches > 0;
    });
    document.addEventListener('keydown', e => {
      if (e.key === '/' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); $('#docs-search').focus(); }
    });
  }
  $$('[data-version-filter]').forEach(button => button.addEventListener('click', () => {
    $$('[data-version-filter]').forEach(b => { b.classList.toggle('active',b === button); b.setAttribute('aria-pressed',String(b === button)); });
    $$('[data-release-group]').forEach(entry => { entry.hidden = button.dataset.versionFilter !== 'all' && entry.dataset.releaseGroup !== button.dataset.versionFilter; });
  }));
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), {threshold:.08});
    $$('.feature-row,.guide-section,.project-row').forEach(el => { el.classList.add('reveal-ready'); observer.observe(el); });
  }
})();

// Automatically cycle the real scenes, with pause and reduced-motion support.
document.querySelectorAll('[data-scene-gallery]').forEach(gallery => {
  const tabs = [...gallery.querySelectorAll('[role=tab]')];
  const panels = [...gallery.querySelectorAll('[role=tabpanel]')];
  const play = gallery.querySelector('.scene-play');
  let current = 0, timer;
  const show = index => {
    current = (index + tabs.length) % tabs.length;
    tabs.forEach((tab, i) => { tab.setAttribute('aria-selected', String(i === current)); tab.tabIndex = i === current ? 0 : -1; panels[i].hidden = i !== current; });
  };
  const stop = () => { clearInterval(timer); timer = null; play.textContent = '播放演示'; play.setAttribute('aria-pressed', 'false'); };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => { stop(); show(i); });
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault(); stop(); show(event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : current + (event.key === 'ArrowRight' ? 1 : -1)); tabs[current].focus();
    });
  });
  const start = () => { if (timer || document.hidden) return; play.textContent = '暂停演示'; play.setAttribute('aria-pressed', 'true'); timer = setInterval(() => show(current + 1), 5000); };
  play.addEventListener('click', () => { if (timer) stop(); else start(); });
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) start();
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', stop);
});
