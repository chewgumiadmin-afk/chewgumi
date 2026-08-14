/*! ChewGumi Bottom Sheet v1 · MedIT
 *  모바일 팝업을 아래로 밀어 닫을 수 있게 합니다.
 *  간단한 알림은 팝업 대신 토스트로 띄웁니다.  cgToast('저장했습니다')
 */
(function () {
  'use strict';

  var SEL = '.popup,.cartp,.kko-box,.mo-b,.bl-box,.modal,.pop-bg .detail,.mo .detail,.popup-dim .detail';
  function isMobile() { return window.innerWidth <= 640; }

  /* ── 아래로 밀어서 닫기 ── */
  /* 진짜로 열려 있는 팝업인지 확인 — 숨겨진 요소는 건드리지 않는다 */
  function isOpen(el) {
    if (!el) return false;
    var st = getComputedStyle(el);
    if (st.display === 'none' || st.visibility === 'hidden' || +st.opacity === 0) return false;
    /* 화면을 덮는 배경 위에 있어야 팝업으로 본다 */
    var p = el.parentElement;
    if (!p) return false;
    var ps = getComputedStyle(p);
    if (ps.position !== 'fixed') return false;
    if (ps.display === 'none' || ps.visibility === 'hidden') return false;
    var r = el.getBoundingClientRect();
    return r.height > 60 && r.width > 60;
  }

  function bind(el) {
    if (!el || el.dataset.cgSheet || !isMobile()) return;
    if (!isOpen(el)) return;
    el.dataset.cgSheet = '1';
    var sy = 0, dy = 0, dragging = false, atTop = true;

    el.addEventListener('touchstart', function (e) {
      if (!isOpen(el)) { dragging = false; return; }
      atTop = el.scrollTop <= 0;
      sy = e.touches[0].clientY; dy = 0; dragging = atTop;
      if (dragging) el.style.transition = 'none';
    }, { passive: true });

    el.addEventListener('touchmove', function (e) {
      if (!dragging) return;
      dy = e.touches[0].clientY - sy;
      if (dy < 0) { dy = 0; return; }
      if (el.scrollTop > 0) { dragging = false; el.style.transform = ''; return; }
      e.preventDefault();
      el.style.transform = 'translateY(' + dy + 'px)';
      var bg = el.parentElement;
      if (bg) bg.style.opacity = String(Math.max(.3, 1 - dy / 400));
    }, { passive: false });

    el.addEventListener('touchend', function () {
      if (!dragging) return;
      dragging = false;
      el.style.transition = 'transform .24s cubic-bezier(.2,.8,.3,1)';
      var bg = el.parentElement;
      if (dy > 110) {
        el.style.transform = 'translateY(100%)';
        setTimeout(function () {
          /* 닫기 버튼을 찾아 누른다 */
          var btn = el.querySelector('[data-close],.close,.x,#dc,#fCancel,#kkoCl');
          if (btn) { btn.click(); }
          else if (bg && bg.classList.contains('mo')) bg.remove();
          else if (bg) bg.style.display = 'none';
          el.style.transform = ''; if (bg) bg.style.opacity = '';
        }, 200);
      } else {
        el.style.transform = '';
        if (bg) bg.style.opacity = '';
      }
    });
  }

  function scan() {
    if (!isMobile()) return;
    var list = document.querySelectorAll(SEL);
    for (var i = 0; i < list.length; i++) bind(list[i]);
  }

  /* 새로 생기는 팝업도 감지 */
  var scanT = null;
  if (window.MutationObserver) {
    new MutationObserver(function (list) {
      /* 새 요소가 추가된 경우에만, 그것도 잠시 뒤에 한 번만 */
      var added = false;
      for (var i = 0; i < list.length; i++) {
        if (list[i].addedNodes && list[i].addedNodes.length) { added = true; break; }
      }
      if (!added) return;
      clearTimeout(scanT);
      scanT = setTimeout(scan, 120);
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', scan);
  else scan();

  /* ── 토스트 ── */
  var tT = null;
  window.cgToast = function (msg, kind, ms) {
    if (!msg) return;
    var old = document.querySelector('.cg-toast');
    if (old) old.remove();
    clearTimeout(tT);
    var d = document.createElement('div');
    d.className = 'cg-toast' + (kind ? ' ' + kind : '');
    d.setAttribute('role', 'status');
    d.textContent = msg;
    document.body.appendChild(d);
    tT = setTimeout(function () {
      d.style.transition = 'opacity .25s';
      d.style.opacity = '0';
      setTimeout(function () { d.remove(); }, 260);
    }, ms || 2400);
  };
})();
