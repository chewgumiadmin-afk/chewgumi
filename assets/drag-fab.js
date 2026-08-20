/*! ChewGumi — 떠 있는 버튼 드래그 이동 v1
    대상: 챗봇 버튼(.cgbot-fab) · 카톡 버튼(.kko-fab) · 홈화면 추가 배너(.cg-pwa)
    · 꾹 눌러 끌면 이동, 짧게 누르면 원래 동작(클릭)
    · 위치는 기기에 저장되어 다음 방문에도 유지
    · 화면 밖으로 나가지 않도록 항상 안쪽으로 붙잡음 */
(function () {
  'use strict';
  var KEY = 'cg_fab_pos';
  var SEL = ['.cgbot-fab', '.kko-fab', '.cg-pwa'];
  var MOVE_LIMIT = 6;      /* 이만큼 움직이면 '끌기'로 봅니다 */

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; }
  }
  function save(p) {
    try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {}
  }
  var POS = load();

  function keyOf(el) {
    if (el.classList.contains('cgbot-fab')) return 'bot';
    if (el.classList.contains('kko-fab')) return 'kko';
    return 'pwa';
  }

  /* 화면 안으로 붙잡기 */
  function clamp(el, left, top) {
    var w = el.offsetWidth, h = el.offsetHeight;
    var m = 6;
    var maxL = Math.max(m, window.innerWidth - w - m);
    var maxT = Math.max(m, window.innerHeight - h - m);
    return {
      left: Math.min(Math.max(m, left), maxL),
      top: Math.min(Math.max(m, top), maxT)
    };
  }

  function place(el, left, top) {
    var c = clamp(el, left, top);
    el.style.setProperty('left', c.left + 'px', 'important');
    el.style.setProperty('top', c.top + 'px', 'important');
    el.style.setProperty('right', 'auto', 'important');
    el.style.setProperty('bottom', 'auto', 'important');
    el.style.setProperty('position', 'fixed', 'important');
    return c;
  }

  function restore(el) {
    var p = POS[keyOf(el)];
    if (!p) return;
    /* 화면 크기가 바뀌었어도 안쪽으로 들어오게 */
    place(el, p.left, p.top);
  }

  function attach(el) {
    if (!el || el.dataset.cgDrag) return;
    el.dataset.cgDrag = '1';
    el.style.touchAction = 'none';
    restore(el);

    var sx = 0, sy = 0, ox = 0, oy = 0, moved = false, dragging = false;

    function down(e) {
      /* 배너의 닫기·추가 버튼은 그대로 눌리게 둡니다 */
      if (e.target.closest('.go, .cl, button, a') && el.classList.contains('cg-pwa')) return;
      var r = el.getBoundingClientRect();
      sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
      moved = false; dragging = true;
      el.setPointerCapture && el.setPointerCapture(e.pointerId);
      el.style.transition = 'none';
    }
    function move(e) {
      if (!dragging) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (!moved && Math.abs(dx) + Math.abs(dy) < MOVE_LIMIT) return;
      moved = true;
      el.classList.add('cg-dragging');
      place(el, ox + dx, oy + dy);
      e.preventDefault();
    }
    function up(e) {
      if (!dragging) return;
      dragging = false;
      el.style.transition = '';
      el.classList.remove('cg-dragging');
      if (moved) {
        var r = el.getBoundingClientRect();
        POS[keyOf(el)] = { left: r.left, top: r.top };
        save(POS);
        /* 끌어서 옮긴 직후의 클릭은 무시 */
        var block = function (ev) { ev.stopPropagation(); ev.preventDefault(); };
        el.addEventListener('click', block, { capture: true, once: true });
        setTimeout(function () {
          el.removeEventListener('click', block, { capture: true });
        }, 350);
      }
    }

    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }

  function scan() { SEL.forEach(function (s) {
    document.querySelectorAll(s).forEach(attach);
  }); }

  function boot() {
    scan();
    /* 배너는 나중에 만들어지므로 계속 지켜봅니다 */
    if (window.MutationObserver) {
      new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
    }
    window.addEventListener('resize', function () {
      SEL.forEach(function (s) {
        document.querySelectorAll(s).forEach(function (el) {
          if (POS[keyOf(el)]) restore(el);
        });
      });
    });
  }

  /* 처음 위치로 되돌리기 — 콘솔이나 버튼에서 호출 */
  window.cgFabReset = function () {
    POS = {}; save(POS);
    SEL.forEach(function (s) {
      document.querySelectorAll(s).forEach(function (el) {
        ['left', 'top', 'right', 'bottom', 'position'].forEach(function (k) {
          el.style.removeProperty(k);
        });
      });
    });
  };

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
