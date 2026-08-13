/*! ChewGumi Floating Buttons v1 · MedIT
 *  카카오톡·상담 버튼을 손가락으로 옮길 수 있게 합니다.
 *  - 길게 눌러 드래그 → 놓으면 가까운 쪽 가장자리에 붙습니다
 *  - 위치는 기기에 저장되어 다음에도 유지됩니다
 *  - 짧게 누르면 원래 동작(카톡 열기·상담창)
 */
(function () {
  'use strict';

  var KEY = 'cg_fab_pos';
  var MARGIN = 12;
  var HOLD = 220;      // 이 시간 이상 누르면 옮기기 시작
  var MOVE_MIN = 8;    // 이만큼 움직여야 드래그로 봄

  function isMobile() { return window.innerWidth <= 900; }

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function save(id, p) {
    var all = load(); all[id] = p;
    try { localStorage.setItem(KEY, JSON.stringify(all)); } catch (e) {}
  }

  function apply(el, p) {
    if (!p) return;
    el.style.right = 'auto';
    el.style.bottom = 'auto';
    el.style.left = p.x + 'px';
    el.style.top = p.y + 'px';
    el.style.position = 'fixed';
  }

  function clampPos(el, x, y) {
    var w = el.offsetWidth, h = el.offsetHeight;
    var maxX = window.innerWidth - w - MARGIN;
    var maxY = window.innerHeight - h - MARGIN;
    /* 하단 탭바 영역은 피한다 */
    var tab = document.querySelector('.m-nav');
    if (tab && isMobile()) {
      var t = tab.getBoundingClientRect();
      if (y + h > t.top - 6) y = t.top - h - 6;
    }
    return {
      x: Math.max(MARGIN, Math.min(maxX, x)),
      y: Math.max(MARGIN + 50, Math.min(maxY, y))
    };
  }

  function snap(el, p) {
    /* 좌우 중 가까운 쪽에 붙인다 */
    var w = el.offsetWidth;
    var mid = window.innerWidth / 2;
    var cx = p.x + w / 2;
    p.x = (cx < mid) ? MARGIN : (window.innerWidth - w - MARGIN);
    return p;
  }

  function setup(el, id) {
    if (!el || el.dataset.cgDrag) return;
    el.dataset.cgDrag = '1';

    var saved = load()[id];
    if (saved && isMobile()) apply(el, clampPos(el, saved.x, saved.y));

    var holdT = null, dragging = false, moved = false;
    var sx = 0, sy = 0, ox = 0, oy = 0;

    function begin(e) {
      if (!isMobile()) return;
      var t = e.touches ? e.touches[0] : e;
      sx = t.clientX; sy = t.clientY;
      var r = el.getBoundingClientRect();
      ox = r.left; oy = r.top;
      moved = false;
      holdT = setTimeout(function () {
        dragging = true;
        el.style.transition = 'none';
        el.style.transform = 'scale(1.12)';
        el.style.opacity = '.92';
        el.style.zIndex = '9999';
        if (navigator.vibrate) navigator.vibrate(12);
      }, HOLD);
    }

    function move(e) {
      var t = e.touches ? e.touches[0] : e;
      var dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) > MOVE_MIN || Math.abs(dy) > MOVE_MIN) moved = true;
      if (!dragging) {
        /* 아직 드래그 아님 — 스크롤이면 취소 */
        if (moved) { clearTimeout(holdT); }
        return;
      }
      e.preventDefault();
      apply(el, clampPos(el, ox + dx, oy + dy));
    }

    function end(e) {
      clearTimeout(holdT);
      if (!dragging) return;
      dragging = false;
      el.style.transition = 'left .22s cubic-bezier(.2,.7,.3,1), top .22s cubic-bezier(.2,.7,.3,1), transform .2s';
      el.style.transform = '';
      el.style.opacity = '';
      el.style.zIndex = '';
      var r = el.getBoundingClientRect();
      var p = snap(el, clampPos(el, r.left, r.top));
      apply(el, p);
      save(id, p);
      /* 드래그였으면 클릭 막기 */
      if (moved && e) {
        var stop = function (ev) { ev.preventDefault(); ev.stopPropagation();
          el.removeEventListener('click', stop, true); };
        el.addEventListener('click', stop, true);
        setTimeout(function () { el.removeEventListener('click', stop, true); }, 320);
      }
    }

    el.addEventListener('touchstart', begin, { passive: true });
    el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', end);
    /* PC에서도 옮길 수 있게 (마우스) */
    el.addEventListener('mousedown', function (e) {
      if (!isMobile()) return;
      begin(e);
      var mv = function (ev) { move(ev); };
      var up = function (ev) { end(ev);
        document.removeEventListener('mousemove', mv);
        document.removeEventListener('mouseup', up); };
      document.addEventListener('mousemove', mv);
      document.addEventListener('mouseup', up);
    });
  }

  function init() {
    setup(document.querySelector('.kko-fab'), 'kko');
    setup(document.querySelector('.cgbot-fab'), 'bot');
  }

  /* 화면 크기가 바뀌면 위치 재조정 */
  var rt = null;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      if (!isMobile()) {
        ['kko-fab', 'cgbot-fab'].forEach(function (c) {
          var el = document.querySelector('.' + c);
          if (el) { el.style.left = ''; el.style.top = '';
            el.style.right = ''; el.style.bottom = ''; }
        });
        return;
      }
      var all = load();
      var k = document.querySelector('.kko-fab');
      var b = document.querySelector('.cgbot-fab');
      if (k && all.kko) apply(k, clampPos(k, all.kko.x, all.kko.y));
      if (b && all.bot) apply(b, clampPos(b, all.bot.x, all.bot.y));
    }, 200);
  });

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', init);
  else init();
  setTimeout(init, 800);
})();
