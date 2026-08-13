/*! ChewGumi PWA v1 · MedIT */
(function () {
  'use strict';

  /* 서비스워커 등록 */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js', { scope: './' }).catch(function () {});
    });
  }

  /* 설치 안내 */
  var deferred = null;
  var KEY = 'cg_pwa_hide';
  function hidden() { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
  function hide() { try { localStorage.setItem(KEY, '1'); } catch (e) {} }

  function bar() {
    if (document.getElementById('cgPwa')) return;
    var d = document.createElement('div');
    d.id = 'cgPwa';
    d.className = 'cg-pwa';
    d.innerHTML =
      '<img src="assets/icon-192.png" alt="">' +
      '<div class="t"><b>홈 화면에 추가</b>' +
      '<span>앱처럼 빠르게 열 수 있어요</span></div>' +
      '<button class="go" id="cgPwaGo">추가</button>' +
      '<button class="cl" id="cgPwaNo" aria-label="닫기">&times;</button>';
    document.body.appendChild(d);
    requestAnimationFrame(function () { d.classList.add('on'); });

    d.querySelector('#cgPwaGo').onclick = function () {
      if (!deferred) { d.classList.remove('on'); return; }
      deferred.prompt();
      deferred.userChoice.then(function () {
        deferred = null;
        d.classList.remove('on');
        hide();
      });
    };
    d.querySelector('#cgPwaNo').onclick = function () {
      d.classList.remove('on');
      hide();
    };
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    if (!hidden() && !window.matchMedia('(display-mode: standalone)').matches) {
      setTimeout(bar, 2600);
    }
  });

  window.addEventListener('appinstalled', function () {
    hide();
    var d = document.getElementById('cgPwa');
    if (d) d.classList.remove('on');
  });

  /* 수동 호출용 */
  window.cgInstall = function () {
    if (deferred) { deferred.prompt(); return true; }
    alert('브라우저 메뉴에서 "홈 화면에 추가"를 선택해 주세요.');
    return false;
  };
})();
