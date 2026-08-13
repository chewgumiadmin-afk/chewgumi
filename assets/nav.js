/*! ChewGumi Navigation v1 · MedIT
 *  - 모든 페이지에 뒤로가기 제공
 *  - 사이트 내부 링크는 새 창 대신 현재 창에서 이동
 *  적용: </body> 앞에 <script src="assets/nav.js" defer></script>
 */
(function () {
  'use strict';

  var STYLE_ID = 'cg-nav-style';
  var HOME = { admin: 'console.html', user: 'index.html' };

  function isAdmin() {
    return /noindex/.test(document.head.innerHTML) ||
      /console|orders|stock|members|posts|boards|message|campaign|subs-admin|export-ai|dev|grievance|integrations|cafe24|exports|qa|preview|admin/
        .test(location.pathname.split('/').pop() || '');
  }
  function here() { return (location.pathname.split('/').pop() || 'index.html'); }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = [
      '.cg-back{display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 14px 0 11px;',
      '  border-radius:999px;font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;',
      '  color:#4a4a52;background:rgba(255,255,255,.86);border:1px solid rgba(255,255,255,.9);',
      '  box-shadow:inset 0 1px 0 rgba(255,255,255,.95),0 2px 8px rgba(0,0,0,.06);',
      '  transition:transform .16s,background .16s;text-decoration:none;margin-bottom:14px}',
      '.cg-back:hover{background:#fff;transform:translateX(-2px)}',
      '.cg-back svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2;',
      '  stroke-linecap:round;stroke-linejoin:round}',
      '@media(max-width:640px){.cg-back{height:38px;font-size:13px;margin-bottom:12px}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function backLabel() {
    /* 같은 사이트에서 왔으면 "뒤로", 아니면 상위 화면 이름 */
    try {
      if (document.referrer && document.referrer.indexOf(location.origin) === 0) return '뒤로';
    } catch (e) { /* 무시 */ }
    return isAdmin() ? '관리자 홈' : '홈으로';
  }

  function goBack(e) {
    if (e) e.preventDefault();
    var sameSite = false;
    try {
      sameSite = !!document.referrer && document.referrer.indexOf(location.origin) === 0;
    } catch (err) { /* 무시 */ }
    if (sameSite && history.length > 1) history.back();
    else location.href = isAdmin() ? HOME.admin : HOME.user;
  }

  function addBack() {
    var page = here();
    /* 홈 화면 자체에는 붙이지 않는다 */
    if (page === 'console.html' || page === 'index.html' || page === '') return;
    if (document.querySelector('.cg-back')) return;

    var a = document.createElement('a');
    a.className = 'cg-back';
    a.href = isAdmin() ? HOME.admin : HOME.user;
    a.innerHTML = '<svg viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>'
      + backLabel();
    a.addEventListener('click', goBack);

    /* 제목 영역 위에 넣는다 */
    var host = document.querySelector('.wrap') || document.body;
    var top = host.querySelector('.top');
    if (top) host.insertBefore(a, top);
    else host.insertBefore(a, host.firstChild);
  }

  function fixLinks() {
    var links = document.querySelectorAll('a[target="_blank"]');
    for (var i = 0; i < links.length; i++) {
      var h = links[i].getAttribute('href') || '';
      if (!h || h.charAt(0) === '#') continue;
      /* 외부 주소·메일·전화는 그대로 새 창 */
      if (/^(https?:)?\/\//.test(h)) {
        try {
          if (new URL(h, location.href).origin !== location.origin) continue;
        } catch (e) { continue; }
      }
      if (/^(mailto:|tel:)/.test(h)) continue;
      /* 사이트 안이면 현재 창에서 이동 */
      links[i].removeAttribute('target');
      links[i].removeAttribute('rel');
    }
  }

  /* 브라우저 뒤로가기로 돌아왔을 때 캐시된 화면이 뜨면 새로 그린다 */
  function onShow(e) {
    if (e.persisted) location.reload();
  }

  function start() {
    injectStyle();
    addBack();
    fixLinks();
    window.addEventListener('pageshow', onShow);
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', start);
  else start();
})();
