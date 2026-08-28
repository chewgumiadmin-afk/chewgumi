/*! ChewGumi 로그인 표시 · MedIT
 *  로그인 여부에 따라 메뉴를 정리합니다.
 *
 *  로그인 안 함   LOGIN · JOIN US
 *  로그인 함      MY PAGE · LOGOUT
 */
(function () {
  'use strict';
  if (window.cgNavAuth) return;
  window.cgNavAuth = 1;

  /* 메뉴가 있는 곳들 — 서랍·머리·바닥 모두 */
  var BOXES = '.util, .u-menu, .d-auth, .nav-auth, nav .links, .ft-auth';

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

  function one(box, s) {
    var on = !!s;
    var login = null, join = null, mypage = null;

    box.querySelectorAll('a').forEach(function (a) {
      var href = (a.getAttribute('href') || '').split('?')[0];
      if (/login\.html$/.test(href)) login = a;
      else if (/join\.html$/.test(href)) join = a;
      else if (/mypage\.html$/.test(href)) mypage = a;
    });

    if (!login && !join && !mypage) return;

    if (on) {
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
        else box.appendChild(b);
      }
    } else {
      if (login) login.style.display = '';
      if (join) join.style.display = '';
      if (mypage) mypage.style.display = 'none';
      var old = box.querySelector('.cg-out-btn');
      if (old) old.remove();
    }
  }

  function apply() {
    var s = ses();
    document.body.classList.toggle('cg-in', !!s);
    document.body.classList.toggle('cg-out', !s);
    if (isLoginPage()) return;
    document.querySelectorAll(BOXES).forEach(function (box) { one(box, s); });
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', apply);
  else apply();

  setTimeout(apply, 500);
  setTimeout(apply, 1500);
  setTimeout(apply, 3000);

  window.addEventListener('pageshow', apply);
  window.addEventListener('storage', function (e) {
    if (e.key === 'cg_sb') apply();
  });

  /* 메뉴가 다시 그려져도 따라갑니다 */
  if (window.MutationObserver) {
    var t = null;
    new MutationObserver(function () {
      clearTimeout(t);
      t = setTimeout(apply, 250);
    }).observe(document.body, { childList: true, subtree: true });
  }

  window.cgRefreshNav = apply;
})();
