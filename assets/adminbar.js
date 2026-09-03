/*! ChewGumi Admin Bar · MedIT
 *  로그인한 관리자에게만 운영자 표시를 보여줍니다.
 *  고객용 화면(공지·후기·문의)에서는 작게 접어 둡니다.
 */
(function () {
  'use strict';
  var SB = 'https://psynvpuedzjvytsgdhgg.supabase.co';
  var KEY = 'sb_publishable_Tz7vgJXgYHQ3tyUfm87WTw_vV1Dxfuk';
  var OFF = 'cg_adm_off';

  /* 고객이 보는 화면 — 여기서는 접어 둡니다 */
  var SHOP = ['index.html', 'notice.html', 'review.html', 'qna.html',
              'shop.html', 'about.html', 'product.html', 'faq.html',
              'guide.html', 'tracking.html', 'mypage.html', 'cart.html',
              'checkout.html', 'order-lookup.html', ''];

  function here() {
    return (location.pathname.split('/').pop() || '').toLowerCase();
  }
  function isShop() {
    return SHOP.indexOf(here()) > -1;
  }

  function token() {
    try {
      if (window.cgTok) return cgTok();
      var s = JSON.parse(localStorage.getItem('cg_sb') || 'null');
      if (!s || !s.t) return '';
      var ms = s.exp ? s.exp * 1000 : (s.e || 0);
      if (ms && Date.now() > ms) return '';
      return s.t;
    } catch (e) { return ''; }
  }

  function bar() { return document.getElementById('admBar'); }

  function hide() {
    var b = bar();
    if (b) b.hidden = true;
    document.body.classList.remove('is-admin');
    var f = document.getElementById('admFab');
    if (f) f.remove();
  }

  /* 작은 단추만 띄웁니다 */
  function fold(role) {
    var b = bar();
    if (b) b.hidden = true;
    document.body.classList.add('is-admin');
    if (role) document.body.setAttribute('data-role', role);

    if (document.getElementById('admFab')) return;

    var f = document.createElement('button');
    f.id = 'admFab';
    f.className = 'adm-fab';
    f.type = 'button';
    f.title = '관리자 도구 열기';
    f.innerHTML = '<span>운영자</span>';
    f.onclick = function () {
      var b2 = bar();
      if (!b2) return;
      var open = !b2.hidden;
      b2.hidden = open;
      f.classList.toggle('on', !open);
    };
    document.body.appendChild(f);
  }

  function show(role) {
    var b = bar();
    if (b) b.hidden = false;
    document.body.classList.add('is-admin');
    if (role) document.body.setAttribute('data-role', role);
  }

  function check() {
    hide();
    var t = token();
    if (!t) return;

    /* 대표님이 「고객처럼 보기」를 켜두셨으면 아예 안 띄웁니다 */
    try { if (localStorage.getItem(OFF) === '1') return; } catch (e) {}

    /* role.js 가 이미 받아 뒀으면 그걸 씁니다 */
    (window.cgMyRole ? cgMyRole().then(function (v) { return { ok: true, _v: v,
        json: function () { return Promise.resolve(v); }, status: 200 }; })
      : fetch(SB + '/rest/v1/rpc/my_role', {
          method: 'POST',
          headers: {
            apikey: KEY,
            Authorization: 'Bearer ' + t,
            'Content-Type': 'application/json'
          },
          body: '{}'
        }))
      .then(function (r) {
        if (r.status === 401 || r.status === 403) {
          try { localStorage.removeItem('cg_sb'); } catch (e) {}
          return 'guest';
        }
        return r.ok ? r.json() : 'guest';
      })
      .then(function (role) {
        var v = String(role || '').replace(/"/g, '');
        if (!v || v === 'guest' || v === 'null') { hide(); return; }
        if (isShop()) fold(v);      /* 고객 화면 — 작게 */
        else show(v);               /* 관리자 화면 — 그대로 */
      })
      .catch(hide);
  }

  /* 고객처럼 보기 */
  window.cgViewAsGuest = function (on) {
    try {
      if (on === false) localStorage.removeItem(OFF);
      else localStorage.setItem(OFF, '1');
    } catch (e) {}
    location.reload();
  };

  window.cgLogout = function () {
    try {
      localStorage.removeItem('cg_sb');
      localStorage.removeItem('cg_user');
      localStorage.removeItem(OFF);
    } catch (e) {}
    hide();
    location.reload();
  };

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', check);
  else check();

  window.addEventListener('storage', function (e) {
    if (e.key === 'cg_sb') check();
  });
  window.addEventListener('pageshow', check);
})();
