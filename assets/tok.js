/*! ChewGumi 토큰 읽기 · MedIT
 *  저장 방식이 화면마다 달라 로그인이 안 남던 것을 한 곳으로 모읍니다.
 *   e   = 밀리초 (Date.now 기준)
 *   exp = 초 (유닉스 시각)
 *  둘 중 무엇이 들어 있어도 바르게 읽습니다.
 */
(function () {
  'use strict';
  if (window.cgTok) return;

  function raw() {
    try { return JSON.parse(localStorage.getItem('cg_sb') || 'null'); }
    catch (e) { return null; }
  }

  /* '로그인 유지'를 고르지 않았으면 브라우저를 닫을 때 끝냅니다.
     sessionStorage 는 탭마다 따로라, 그것만 보면 새 탭을 열었을 뿐인데도
     로그아웃돼 버렸습니다. 그래서 살아 있는 탭이 남긴 맥박(cg_beat)을 함께 봅니다.
     맥박이 최근이면 브라우저는 아직 열려 있는 것이므로 유지합니다. */
  var BEAT = 'cg_beat';
  var BEAT_MS = 90 * 1000;

  function beat() {
    try { localStorage.setItem(BEAT, String(Date.now())); } catch (e) {}
  }

  function keptOff() {
    try {
      if (localStorage.getItem('cg_keep_off') !== '1') return false;
      if (sessionStorage.getItem('cg_alive') === '1') return false;
      /* 다른 탭이 아직 뛰고 있으면 브라우저를 닫은 게 아닙니다 */
      var last = Number(localStorage.getItem(BEAT) || 0);
      if (last && Date.now() - last < BEAT_MS) {
        try { sessionStorage.setItem('cg_alive', '1'); } catch (e) {}
        return false;
      }
      return true;
    } catch (e) { return false; }
  }

  /* 이 탭이 살아 있다는 표시를 남깁니다 */
  beat();
  try {
    setInterval(beat, 30 * 1000);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) beat();
    });
  } catch (e) {}

  function alive(s) {
    if (!s || !s.t) return false;
    if (keptOff()) {
      try {
        localStorage.removeItem('cg_sb');
        localStorage.removeItem('cg_keep_off');
      } catch (e) {}
      return false;
    }
    var ms = 0;
    if (s.exp) ms = Number(s.exp) * 1000;
    else if (s.e) ms = Number(s.e);
    if (!ms) return true;             /* 만료 정보가 없으면 살아있다고 봅니다 */
    return Date.now() < ms;
  }

  /* 토큰만 */
  window.cgTok = function () {
    var s = raw();
    return alive(s) ? s.t : '';
  };

  /* 전체 */
  window.cgSession = function () {
    var s = raw();
    return alive(s) ? s : null;
  };

  /* 저장 — 두 이름을 함께 씁니다 */
  window.cgSaveSession = function (d, email, role) {
    var sec = d.expires_in || 3600;
    var o = {
      t: d.access_token,
      r: d.refresh_token || '',
      e: Date.now() + sec * 1000,
      exp: Math.floor(Date.now() / 1000) + sec,
      u: String(email || '').split('@')[0],
      em: email || ''
    };
    if (role) o.role = role;
    try {
      localStorage.setItem('cg_sb', JSON.stringify(o));
      sessionStorage.setItem('cg_alive', '1');
    } catch (e) {}
    return o;
  };

  /* 지우기 */
  window.cgClearSession = function () {
    try {
      localStorage.removeItem('cg_sb');
      localStorage.removeItem('cg_user');
      localStorage.removeItem('cg_keep_off');
      sessionStorage.removeItem('cg_alive');
    } catch (e) {}
  };

  /* 저장된 역할 */
  window.cgRole = function () {
    var s = window.cgSession();
    return (s && s.role) || '';
  };

  /* 만료가 가까우면 미리 늘립니다 */
  window.cgKeepAlive = function () {
    var s = raw();
    if (!s || !s.t || !s.r) return Promise.resolve(s ? s.t : '');

    var ms = s.exp ? s.exp * 1000 : (s.e || 0);
    if (!ms || Date.now() < ms - 5 * 60000) return Promise.resolve(s.t);

    var SB = 'https://psynvpuedzjvytsgdhgg.supabase.co';
    var KEY = 'sb_publishable_Tz7vgJXgYHQ3tyUfm87WTw_vV1Dxfuk';

    return fetch(SB + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: s.r })
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !d.access_token) return s.t;
        var o = window.cgSaveSession(d, s.em, s.role);
        return o.t;
      })
      .catch(function () { return s.t; });
  };
})();
