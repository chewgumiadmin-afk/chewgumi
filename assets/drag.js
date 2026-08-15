/*! ChewGumi Draggable Popups · MedIT
 *  팝업을 끌어서 옮길 수 있게 합니다.
 *  제목 부분을 잡고 움직이면 되고, 위치는 기억되지 않습니다(닫으면 초기화).
 */
(function () {
  'use strict';
  if (window.__cgDrag) return;
  window.__cgDrag = 1;

  /* 옮길 수 있는 팝업들 */
  var SEL = '.detail, .popup, .cartp, .bl-box, .kko-box, .modal';

  var css = document.createElement('style');
  css.textContent = [
    '[data-mv]{cursor:default}',
    '[data-mv].moving{transition:none !important;user-select:none}',
    /* 잡는 손잡이 — 팝업 위쪽 */
    '.cg-grip{position:absolute;top:0;left:0;right:0;height:44px;z-index:4;',
    '  cursor:grab;touch-action:none}',
    '.cg-grip.hold{cursor:grabbing}',
    '.cg-grip::before{content:"";position:absolute;top:9px;left:50%;',
    '  width:36px;height:4px;margin-left:-18px;border-radius:99px;',
    '  background:rgba(0,0,0,.14);opacity:0;transition:opacity .18s}',
    '[data-mv]:hover .cg-grip::before{opacity:1}',
    /* 닫기 버튼은 손잡이 위로 */
    '[data-mv] .d-x,[data-mv] .p-close,[data-mv] .close,[data-mv] .x{z-index:6 !important}',
    '@media(max-width:640px){ .cg-grip{height:38px} }'
  ].join('');
  document.head.appendChild(css);

  function bind(el) {
    if (!el || el.dataset.mv) return;
    /* 화면에 실제로 떠 있는 것만 */
    var r = el.getBoundingClientRect();
    if (r.width < 120 || r.height < 100) return;
    var p = el.parentElement;
    if (!p) return;
    var ps = getComputedStyle(p);
    if (ps.position !== 'fixed') return;

    el.dataset.mv = '1';
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';

    var grip = document.createElement('div');
    grip.className = 'cg-grip';
    grip.setAttribute('aria-hidden', 'true');
    el.insertBefore(grip, el.firstChild);

    var dx = 0, dy = 0, ox = 0, oy = 0, on = false;

    function down(e) {
      /* 버튼·입력칸 위에서는 안 잡는다 */
      var t = e.target;
      if (t.closest('button, a, input, select, textarea, .d-x')) return;
      var pt = e.touches ? e.touches[0] : e;
      var b = el.getBoundingClientRect();
      dx = pt.clientX; dy = pt.clientY;
      ox = parseFloat(el.style.left || 0) || 0;
      oy = parseFloat(el.style.top || 0) || 0;
      on = true;
      el.classList.add('moving');
      grip.classList.add('hold');
    }
    function move(e) {
      if (!on) return;
      e.preventDefault();
      var pt = e.touches ? e.touches[0] : e;
      var nx = ox + (pt.clientX - dx);
      var ny = oy + (pt.clientY - dy);
      /* 화면 밖으로 완전히 나가지 않게 */
      var b = el.getBoundingClientRect();
      var maxX = window.innerWidth - 80, maxY = window.innerHeight - 60;
      if (b.left + (nx - ox) > maxX) nx = ox + (maxX - b.left);
      if (b.right + (nx - ox) < 80) nx = ox + (80 - b.right);
      if (b.top + (ny - oy) > maxY) ny = oy + (maxY - b.top);
      if (b.top + (ny - oy) < -b.height + 60) ny = oy + (-b.height + 60 - b.top);
      el.style.left = nx + 'px';
      el.style.top = ny + 'px';
    }
    function up() {
      if (!on) return;
      on = false;
      el.classList.remove('moving');
      grip.classList.remove('hold');
    }

    grip.addEventListener('mousedown', down);
    grip.addEventListener('touchstart', down, { passive: true });
    document.addEventListener('mousemove', move);
    document.addEventListener('touchmove', move, { passive: false });
    document.addEventListener('mouseup', up);
    document.addEventListener('touchend', up);
    document.addEventListener('touchcancel', up);
  }

  function scan() {
    var list = document.querySelectorAll(SEL);
    for (var i = 0; i < list.length; i++) bind(list[i]);
  }

  /* 닫히면 위치 초기화 */
  function reset() {
    var list = document.querySelectorAll('[data-mv]');
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      var p = el.parentElement;
      if (!p) continue;
      var hidden = p.classList.contains('hide') ||
        getComputedStyle(p).display === 'none';
      if (hidden) { el.style.left = ''; el.style.top = ''; }
    }
  }

  if (window.MutationObserver) {
    var t = null;
    new MutationObserver(function () {
      clearTimeout(t);
      t = setTimeout(function () { scan(); reset(); }, 150);
    }).observe(document.body, { childList: true, subtree: true, attributes: true,
      attributeFilter: ['class', 'style'] });
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', scan);
  else scan();
  setInterval(function () { scan(); reset(); }, 1200);
})();
