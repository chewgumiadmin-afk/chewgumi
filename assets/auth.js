/*! ChewGumi Auth v1 · MedIT
 *  로그인 상태를 유지합니다. (기존: 1시간 뒤 자동 로그아웃)
 *  적용: <script src="assets/auth.js"></script>  ← 다른 스크립트보다 먼저
 */
(function () {
  'use strict';

  var SB = 'https://psynvpuedzjvytsgdhgg.supabase.co';
  var KEY = 'sb_publishable_Tz7vgJXgYHQ3tyUfm87WTw_vV1Dxfuk';
  var STORE = 'cg_sb';
  var refreshing = null;

  function read() {
    try { return JSON.parse(localStorage.getItem(STORE) || 'null'); }
    catch (e) { return null; }
  }
  function write(s) {
    try { localStorage.setItem(STORE, JSON.stringify(s)); } catch (e) {}
  }
  function clear() {
    try { localStorage.removeItem(STORE); } catch (e) {}
  }

  /* 토큰 만료 시각 확인 */
  function expSoon(t) {
    if (!t) return true;
    try {
      var p = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      /* 5분 이내면 갱신 */
      return (p.exp * 1000 - Date.now()) < 5 * 60 * 1000;
    } catch (e) { return true; }
  }

  /* 갱신 토큰으로 새 토큰 받기 */
  function refresh() {
    if (refreshing) return refreshing;
    var s = read();
    if (!s || !s.r) return Promise.resolve(null);

    refreshing = fetch(SB + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: s.r })
    }).then(function (r) { return r.json(); })
      .then(function (d) {
        refreshing = null;
        if (d && d.access_token) {
          write({ t: d.access_token, r: d.refresh_token || s.r, u: s.u, e: s.e });
          return d.access_token;
        }
        /* 갱신 실패 = 진짜 만료 */
        clear();
        return null;
      }).catch(function () { refreshing = null; return null; });
    return refreshing;
  }

  /* 지금 쓸 수 있는 토큰 (필요하면 갱신) */
  function token() {
    var s = read();
    if (!s || !s.t) return Promise.resolve(null);
    if (!expSoon(s.t)) return Promise.resolve(s.t);
    return refresh();
  }

  /* 로그인 */
  function login(email, pw) {
    return fetch(SB + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: pw })
    }).then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.access_token) {
          var msg = (d && d.error_description || '').indexOf('confirm') > -1
            ? '이메일 인증을 먼저 완료해 주세요.'
            : '이메일 또는 비밀번호가 올바르지 않습니다.';
          throw new Error(msg);
        }
        write({
          t: d.access_token,
          r: d.refresh_token || '',
          u: email.split('@')[0],
          e: email
        });
        return d.access_token;
      });
  }

  function logout() { clear(); }

  /* 헤더 만들기 — 항상 유효한 토큰 사용 */
  function headers() {
    return token().then(function (t) {
      var h = { apikey: KEY, 'Content-Type': 'application/json' };
      if (t) h.Authorization = 'Bearer ' + t;
      return h;
    });
  }

  /* 토큰을 붙여 호출 (401이면 한 번 갱신 후 재시도) */
  function call(url, body) {
    return headers().then(function (h) {
      return fetch(url, { method: 'POST', headers: h, body: JSON.stringify(body) });
    }).then(function (r) {
      if (r.status !== 401) return r;
      return refresh().then(function (t) {
        if (!t) return r;
        return fetch(url, {
          method: 'POST',
          headers: { apikey: KEY, 'Content-Type': 'application/json',
            Authorization: 'Bearer ' + t },
          body: JSON.stringify(body)
        });
      });
    });
  }

  /* 주기적으로 미리 갱신 (창을 오래 열어둬도 유지) */
  setInterval(function () {
    var s = read();
    if (s && s.t && expSoon(s.t)) refresh();
  }, 4 * 60 * 1000);

  /* 화면으로 돌아왔을 때도 확인 */
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
      var s = read();
      if (s && s.t && expSoon(s.t)) refresh();
    }
  });

  window.CGAuth = {
    login: login, logout: logout, token: token,
    headers: headers, call: call, refresh: refresh,
    user: function () { var s = read(); return s ? { name: s.u, email: s.e } : null; },
    isIn: function () { var s = read(); return !!(s && s.t); }
  };
})();
