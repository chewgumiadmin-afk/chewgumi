/* ══════════════════════════════════════════════
   내 권한 한 번만 받아 나눠 쓰기

   화면마다 guard.js · adminbar.js · pagelist.js · 화면 자체 스크립트가
   각각 rpc/my_role 을 불러서, 한 화면에서 권한을 네 번씩 물어보고
   있었습니다. (브라우저 검사 live-check 에서 발견)

   여기서 한 번만 받고, 부르는 곳들이 같은 약속(Promise)을 나눠 씁니다.
   30초 안에는 다시 묻지 않습니다.

   쓰는 법
     cgMyRole().then(function(role){ ... })   'ceo' 'dev' 'qa' 'guest' …
     cgMyPages().then(function(pages){ ... })
     cgRoleReset()                            로그인·로그아웃 뒤 초기화
   ══════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.cgMyRole) return;

  var SB = 'https://psynvpuedzjvytsgdhgg.supabase.co';
  var KEY = 'sb_publishable_Tz7vgJXgYHQ3tyUfm87WTw_vV1Dxfuk';

  var cache = { role: null, pages: null, at: 0, tok: '' };
  var TTL = 30000;

  function tok() {
    try {
      if (window.cgSession) { var s = cgSession(); return (s && s.t) || ''; }
      var j = JSON.parse(localStorage.getItem('cg_sb') || 'null');
      return (j && j.t) || '';
    } catch (e) { return ''; }
  }

  function fresh(t) {
    return cache.at && cache.tok === t && (Date.now() - cache.at) < TTL;
  }

  function ask(what, t) {
    return fetch(SB + '/rest/v1/rpc/' + what, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' },
      body: '{}'
    })
    .then(function (r) { return r.ok ? r.json() : null; })
    .catch(function () { return null; });
  }

  window.cgMyRole = function () {
    var t = tok();
    if (!t) return Promise.resolve('guest');
    if (fresh(t) && cache.role) return cache.role;

    cache.tok = t;
    cache.at = Date.now();
    cache.role = ask('my_role', t).then(function (v) {
      return String(v == null ? 'guest' : v).replace(/"/g, '') || 'guest';
    });
    return cache.role;
  };

  window.cgMyPages = function () {
    var t = tok();
    if (!t) return Promise.resolve([]);
    if (fresh(t) && cache.pages) return cache.pages;

    cache.tok = t;
    cache.at = Date.now();
    cache.pages = ask('my_pages', t).then(function (v) {
      return Array.isArray(v) ? v : [];
    });
    return cache.pages;
  };

  window.cgRoleReset = function () {
    cache = { role: null, pages: null, at: 0, tok: '' };
  };

  /* 로그인 상태가 바뀌면 다시 묻습니다 */
  window.addEventListener('storage', function (e) {
    if (e.key === 'cg_sb') window.cgRoleReset();
  });
})();
