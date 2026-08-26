/*! ChewGumi 로그인 표시 · MedIT
 *  로그인 여부에 따라 메뉴를 정리합니다.
 *
 *  로그인 안 함   LOGIN · JOIN US · EN · CART
 *  로그인 함      MY PAGE · LOGOUT · EN · CART
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

  function isLoginPage() {
    return /\/(login|join)\.html$/.test(location.pathname);
  }

  function apply() {
    var s = ses();
    var on = !!s;

    document.body.classList.toggle('cg-in', on);
    document.body.classList.toggle('cg-out', !on);

    if (isLoginPage()) return;   /* 로그인·가입 화면은 건드리지 않습니다 */

    document.querySelectorAll('.util, .u-menu, nav .links').forEach(function (box) {
      var login = null, join = null, mypage = null;

      box.querySelectorAll('a').forEach(function (a) {
        var href = (a.getAttribute('href') || '').split('?')[0];
        if (/login\.html$/.test(href)) login = a;
        else if (/join\.html$/.test(href)) join = a;
        else if (/mypage\.html$/.test(href)) mypage = a;
      });

      if (on) {
        /* 로그인했으면 — MY PAGE 하나만 두고 LOGOUT 을 답니다 */
        if (login) login.style.display = 'none';
        if (join) join.style.display = 'none';
        if (mypage) mypage.style.display = '';

        if (!box.querySelector('.cg-out-btn')) {
          var b = document.createElement('a');
          b.className = 'cg-out-btn';
          b.href = '#';
          b.textContent = 'LOGOUT';
          b.title = (s.u || (s.em || '').split('@')[0] || '회원') + ' 님';
          b.onclick = function (e) {
            e.preventDefault();
            if (window.cgClearSession) cgClearSession();
            else { try { localStorage.removeItem('cg_sb'); } catch (x) {} }
            location.reload();
          };
          if (mypage && mypage.nextSibling) box.insertBefore(b, mypage.nextSibling);
          else if (mypage) mypage.parentElement.appendChild(b);
        }
      } else {
        /* 로그인 안 했으면 — LOGIN · JOIN US 만 */
        if (login) login.style.display = '';
        if (join) join.style.display = '';
        if (mypage) mypage.style.display = 'none';
        var old = box.querySelector('.cg-out-btn');
        if (old) old.remove();
      }
    });
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', apply);
  else apply();

  setTimeout(apply, 600);
  setTimeout(apply, 1600);
  window.addEventListener('pageshow', apply);
  window.addEventListener('storage', function (e) {
    if (e.key === 'cg_sb') apply();
  });

  window.cgRefreshNav = apply;
})();
