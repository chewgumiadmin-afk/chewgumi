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

  function alive(s) {
    if (!s || !s.t) return false;
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
    try { localStorage.setItem('cg_sb', JSON.stringify(o)); } catch (e) {}
    return o;
  };

  /* 지우기 */
  window.cgClearSession = function () {
    try {
      localStorage.removeItem('cg_sb');
      localStorage.removeItem('cg_user');
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
