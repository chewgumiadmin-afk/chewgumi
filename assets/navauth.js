/*! ChewGumi 로그인 표시 · MedIT
 *  로그인해 있으면 LOGIN 을 MY PAGE 로 바꿉니다.
 *  화면마다 따로 만들지 않고 한 곳에서 정합니다.
 */
(function () {
  'use strict';
  if (window.cgNavAuth) return;
  window.cgNavAuth = 1;

  function ses() {
    try {
      if (window.cgSession) return cgSession();
      var s = JSON.parse(localStorage.getItem('cg_sb') || 'null');
      if (!s || !s.t) return null;
      var ms = s.exp ? s.exp * 1000 : (s.e || 0);
      if (ms && Date.now() > ms) return null;
      return s;
    } catch (e) { return null; }
  }

  function who(s) {
    return (s && (s.u || (s.em || '').split('@')[0])) || '회원';
  }

  function apply() {
    var s = ses();
    var on = !!s;

    document.body.classList.toggle('cg-in', on);
    document.body.classList.toggle('cg-out', !on);

    /* login.html 로 가는 링크를 바꿉니다 */
    document.querySelectorAll('a[href*="login.html"]').forEach(function (a) {
      /* 로그인 화면 안에서는 건드리지 않습니다 */
      if (/login\.html$/.test(location.pathname)) return;
      if (a.dataset.cgKeep) return;

      var t = (a.textContent || '').trim();
      /* 비밀번호 재설정 같은 링크는 그대로 둡니다 */
      if (t.length > 12) return;

      if (on) {
        if (!a.dataset.cgWas) a.dataset.cgWas = a.getAttribute('href') + '|' + t;
        a.setAttribute('href', 'mypage.html');
        a.textContent = /[A-Z]{3,}/.test(t) ? 'MY PAGE' : '마이페이지';
        a.title = who(s) + ' 님';
      } else if (a.dataset.cgWas) {
        var p = a.dataset.cgWas.split('|');
        a.setAttribute('href', p[0]);
        a.textContent = p[1] || 'LOGIN';
        a.removeAttribute('title');
        delete a.dataset.cgWas;
      }
    });
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', apply);
  else apply();

  setTimeout(apply, 700);
  setTimeout(apply, 1800);
  window.addEventListener('pageshow', apply);
  window.addEventListener('storage', function (e) {
    if (e.key === 'cg_sb') apply();
  });

  window.cgRefreshNav = apply;
})();
