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

  /* ── 새 토큰을 기존 로그인 정보 '위에' 얹습니다 ──
     예전에는 갱신할 때 t·r·u·e 네 가지만 다시 써서
     em(이메일) · exp(만료시각) · role 이 통째로 사라졌습니다.
     그러면 한 시간쯤 뒤에 마이페이지·주문 화면이 로그인 상태를 못 알아보고,
     상담 대화 기록도 다른 이름으로 저장돼 끊겼습니다.
     여기서 한 곳에 모아 두고 갱신하는 세 곳이 모두 이것을 씁니다. */
  function stamp(s, d) {
    s = s || {};
    var sec = Number(d && d.expires_in) > 0 ? Number(d.expires_in) : 3600;
    s.t = d.access_token;
    if (d.refresh_token) s.r = d.refresh_token;
    if (!s.r) s.r = '';
    s.e = Date.now() + sec * 1000;               /* 밀리초 — 화면들이 보는 값 */
    s.exp = Math.floor(Date.now() / 1000) + sec; /* 초 — 화면들이 먼저 보는 값 */
    return s;
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
          write(stamp(s, d));   /* 이메일·권한·만료를 지우지 않고 그대로 둡니다 */
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
        /* 예전에는 e 칸에 이메일을 넣었는데, 다른 화면들은 e 를 '만료시각' 으로
           읽고 있어 서로 어긋났습니다. 이메일은 em, 만료는 e·exp 로 맞춥니다. */
        write(stamp({ u: String(email || '').split('@')[0], em: email }, d));
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
    user: function () { var s = read(); if (!s) return null;
      /* em 이 정식 자리. 예전 저장값은 e 에 이메일이 들어 있어 그것도 받아 줍니다 */
      return { name: s.u, email: s.em || (typeof s.e === 'string' ? s.e : '') }; },
    isIn: function () { var s = read(); return !!(s && s.t); }
  };

  /* ── 로그인 유지 ──
     뒤로가기·새로고침·탭 복귀 때 토큰이 만료됐으면 조용히 연장합니다. */
  function keepAlive() {
    var st = read();
    if (!st || !st.t) return Promise.resolve(null);

    /* 아직 넉넉하면 그대로 */
    if (st.e && Date.now() < st.e - 120000) return Promise.resolve(st.t);
    if (!st.r) return Promise.resolve(st.t);

    if (refreshing) return refreshing;
    refreshing = fetch(SB + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: st.r })
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        refreshing = null;
        if (!d || !d.access_token) return st.t;
        st = stamp(st, d);
        write(st);
        return st.t;
      })
      .catch(function () { refreshing = null; return st.t; });
    return refreshing;
  }

  /* 화면이 돌아올 때마다 확인 */
  window.addEventListener('pageshow', function () { keepAlive(); });
  window.addEventListener('focus', function () { keepAlive(); });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') keepAlive();
  });
  /* 20분마다 미리 연장 */
  setInterval(keepAlive, 20 * 60 * 1000);

  window.cgKeepAlive = keepAlive;
  window.cgRole = function () {
    var st = read();
    return (st && st.role) || 'guest';
  };
  window.cgEmail = function () {
    var st = read();
    return (st && st.em) || '';
  };

})();
