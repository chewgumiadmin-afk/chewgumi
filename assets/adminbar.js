/*! ChewGumi Admin Bar · MedIT
 *  로그인한 관리자에게만 운영자 표시를 보여줍니다.
 *  토큰이 만료됐거나 없으면 감춥니다.
 */
(function () {
  'use strict';
  var SB = 'https://psynvpuedzjvytsgdhgg.supabase.co';
  var KEY = 'sb_publishable_Tz7vgJXgYHQ3tyUfm87WTw_vV1Dxfuk';

  function token() {
    try {
      var s = JSON.parse(localStorage.getItem('cg_sb') || 'null');
      if (!s || !s.t) return '';
      /* 만료 시각이 있으면 확인 */
      if (s.exp && Date.now() / 1000 > s.exp) return '';
      return s.t;
    } catch (e) { return ''; }
  }

  function hide() {
    var b = document.getElementById('admBar');
    if (b) b.hidden = true;
    document.body.classList.remove('is-admin');
  }

  function show(role) {
    var b = document.getElementById('admBar');
    if (b) b.hidden = false;
    document.body.classList.add('is-admin');
    if (role) document.body.setAttribute('data-role', role);
  }

  function check() {
    hide();                       /* 먼저 감추고 시작합니다 */
    var t = token();
    if (!t) return;

    /* 역할을 물어봅니다 — 로그인하지 않았으면 guest 가 돌아옵니다 */
    fetch(SB + '/rest/v1/rpc/my_role', {
      method: 'POST',
      headers: {
        apikey: KEY,
        Authorization: 'Bearer ' + t,
        'Content-Type': 'application/json'
      },
      body: '{}'
    })
      .then(function (r) {
        if (r.status === 401 || r.status === 403) {
          /* 토큰이 만료됐습니다 — 지웁니다 */
          try { localStorage.removeItem('cg_sb'); } catch (e) {}
          return 'guest';
        }
        return r.ok ? r.json() : 'guest';
      })
      .then(function (role) {
        var r = String(role || '').replace(/"/g, '');
        if (r && r !== 'guest' && r !== 'null') show(r);
        else hide();
      })
      .catch(hide);
  }

  /* 로그아웃 */
  window.cgLogout = function () {
    try {
      localStorage.removeItem('cg_sb');
      localStorage.removeItem('cg_user');
    } catch (e) {}
    hide();
    location.reload();
  };

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', check);
  else check();

  /* 다른 창에서 로그아웃하면 여기도 따라갑니다 */
  window.addEventListener('storage', function (e) {
    if (e.key === 'cg_sb') check();
  });
  window.addEventListener('pageshow', check);
})();
