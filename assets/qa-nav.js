/* ChewGumi QA·운영 화면 공용 이동줄 — assets/qa-nav.js  (issues #7)
 *
 * 각 화면은 아래 한 줄만 넣습니다.
 *   <script src="assets/qa-nav.js" defer></script>
 *
 * 왜 만들었나
 *  QA 화면이 넷(시험대·결제점검·QA도구·리포트), 이슈 창구가 둘(이슈보드·수정이력)로
 *  흩어져 있어서, 한 곳에서 다른 곳으로 가려면 주소를 직접 쳐야 했습니다.
 *  화면을 합치는 대신 먼저 '오가는 길'부터 하나로 모읍니다.
 *  각 화면의 내용·기능은 건드리지 않습니다.
 *
 * 안전장치
 *  · 이미 실려 있으면 두 번 그리지 않습니다.
 *  · 화면에 이미 .qa-nav 가 있으면 아무것도 하지 않습니다.
 *  · 크기·모서리는 assets/ui.css 의 토큰(--h-sm 등)을 그대로 씁니다.
 *  · 되돌리려면 각 화면의 script 한 줄만 지우면 됩니다.
 */
(function () {
  'use strict';
  if (window.cgQaNav) return;
  window.cgQaNav = true;

  var LINKS = [
    { href: 'qa-lab.html',        label: '시험대',   note: 'QA 시험대' },
    { href: 'qa-run.html',        label: '결제점검', note: '결제 8단계' },
    { href: 'qa-tool.html',       label: 'QA도구',   note: '화면 검사' },
    { href: 'issue.html',         label: '이슈보드', note: '신고·이슈' },
    { href: 'fixlog.html',        label: '수정이력', note: '고친 기록' },
    { href: 'reports-admin.html', label: '리포트',   note: '고객 리포트' }
  ];

  var CSS =
    '.qa-nav{position:sticky;top:0;z-index:9990;display:flex;gap:6px;' +
    'align-items:center;overflow-x:auto;-webkit-overflow-scrolling:touch;' +
    'padding:8px 12px;background:rgba(255,255,255,.94);' +
    '-webkit-backdrop-filter:saturate(180%) blur(12px);backdrop-filter:saturate(180%) blur(12px);' +
    'border-bottom:1px solid rgba(0,0,0,.07)}' +
    '.qa-nav::-webkit-scrollbar{display:none}' +
    '.qa-nav a{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;' +
    'height:var(--h-sm,36px);padding:0 14px;border-radius:var(--r-pill,999px);' +
    'font-size:var(--fs-sm,12px);font-weight:600;text-decoration:none;white-space:nowrap;' +
    'color:#5a5a63;background:rgba(0,0,0,.04);border:1px solid transparent;' +
    'transition:background .16s,color .16s}' +
    '.qa-nav a:hover{background:rgba(216,37,88,.08);color:#D82558}' +
    '.qa-nav a[aria-current="page"]{background:linear-gradient(135deg,#E95073,#D82558);' +
    'color:#fff;font-weight:700}' +
    '.qa-nav a:focus-visible{outline:2px solid #E95073;outline-offset:2px}' +
    '.qa-nav .qa-nav-t{flex:0 0 auto;margin-right:2px;font-size:10.5px;letter-spacing:1.6px;' +
    'font-weight:700;color:#c9c9d1}' +
    '@media(max-width:640px){.qa-nav{padding:7px 10px}.qa-nav .qa-nav-t{display:none}}' +
    '@media print{.qa-nav{display:none}}';

  function here() {
    var p = (location.pathname || '').split('/').pop();
    return p || 'index.html';
  }

  function build() {
    if (document.querySelector('.qa-nav')) return;
    if (!document.body) return;

    var style = document.createElement('style');
    style.setAttribute('data-qa-nav', '1');
    style.textContent = CSS;
    document.head.appendChild(style);

    var nav = document.createElement('nav');
    nav.className = 'qa-nav';
    nav.setAttribute('aria-label', 'QA 화면 이동');

    var tag = document.createElement('span');
    tag.className = 'qa-nav-t';
    tag.textContent = 'QA';
    nav.appendChild(tag);

    var cur = here();
    for (var i = 0; i < LINKS.length; i++) {
      var it = LINKS[i];
      var a = document.createElement('a');
      a.href = it.href;
      a.textContent = it.label;
      a.title = it.note;
      if (it.href === cur) {
        a.setAttribute('aria-current', 'page');
        a.removeAttribute('href');       /* 지금 보는 화면은 눌러도 다시 가지 않습니다 */
        a.style.cursor = 'default';
      }
      nav.appendChild(a);
    }

    document.body.insertBefore(nav, document.body.firstChild);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
