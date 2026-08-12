/*! ChewGumi Lite Mode v1 · MedIT
 *  느린 연결을 감지해 자동으로 경량 모드를 켜고, 빨라지면 되돌립니다.
 *  적용: 각 페이지 </body> 앞에 아래 한 줄만 넣으면 됩니다.
 *    <script src="assets/lite.js" defer></script>
 */
(function () {
  'use strict';

  var KEY = 'cg_lite';        // '1' 켬 / '0' 끔 / 'auto' 자동
  var STYLE_ID = 'cg-lite-style';

  /* ── 경량 모드 스타일 (한 번만 주입) ── */
  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = [
      '.lite *{animation:none !important;transition:none !important}',
      '.lite .glass,.lite .panel,.lite .card,.lite .tri-card,.lite header,',
      '.lite .cartp,.lite .drawer,.lite .cgbot-win{',
      '  backdrop-filter:none !important;-webkit-backdrop-filter:none !important;',
      '  background:rgba(255,255,255,.94) !important}',
      '.lite .tri-card{background:rgba(255,255,255,.10) !important}',
      '.lite .tri-bg,.lite .tri-marquee,.lite .ripple,.lite .orb{display:none !important}',
      '.lite .tri-sec::before{background:linear-gradient(165deg,#2A1220,#3A1128) !important}',
      '.lite iframe{display:none !important}',
      '.lite .film,.lite .video-card{display:flex;align-items:center;justify-content:center;',
      '  background:#F3E6EA;border-radius:16px;min-height:150px}',
      '.lite .film::after,.lite .video-card::after{',
      '  content:"영상 · 경량 모드에서는 재생하지 않습니다";',
      '  font-size:12px;color:#8a6a74;padding:16px;text-align:center}',
      '.lite .slide:not(.on){display:none !important}',
      '.lite img{image-rendering:auto}',
      /* 안내 바 */
      '.cg-lite-bar{position:fixed;left:0;right:0;bottom:0;z-index:1300;',
      '  padding:9px 16px calc(9px + env(safe-area-inset-bottom));',
      '  background:rgba(27,11,20,.94);color:#fff;font-size:12px;line-height:1.5;',
      '  display:none;align-items:center;justify-content:space-between;gap:10px}',
      '.cg-lite-bar.show{display:flex}',
      '.cg-lite-bar b{color:#FFE923;font-weight:700}',
      '.cg-lite-bar .bt{display:flex;gap:6px;flex:none}',
      '.cg-lite-bar button{height:32px;padding:0 13px;border-radius:999px;border:0;',
      '  font-family:inherit;font-size:11.5px;font-weight:700;cursor:pointer;',
      '  background:#fff;color:#1B0B14}',
      '.cg-lite-bar button.g{background:rgba(255,255,255,.18);color:#fff}'
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ── 안내 바 ── */
  function bar() {
    var b = document.getElementById('cgLiteBar');
    if (b) return b;
    b = document.createElement('div');
    b.id = 'cgLiteBar';
    b.className = 'cg-lite-bar';
    b.innerHTML =
      '<span id="cgLiteTxt"></span>' +
      '<span class="bt">' +
      '<button id="cgLiteYes"></button>' +
      '<button class="g" id="cgLiteNo">닫기</button>' +
      '</span>';
    document.body.appendChild(b);
    b.querySelector('#cgLiteNo').onclick = function () { b.classList.remove('show'); };
    b.querySelector('#cgLiteYes').onclick = function () { window.cgToggleLite(); };
    return b;
  }

  function pref() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function setPref(v) {
    try { localStorage.setItem(KEY, v); } catch (e) { /* 저장 불가해도 동작 */ }
  }

  /* ── 연결 상태 판단 ── */
  var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  function isSlow() {
    if (!conn) return false;
    var t = conn.effectiveType || '';
    return conn.saveData === true || t === 'slow-2g' || t === '2g' || t === '3g';
  }

  var on = false;

  function apply(next, why) {
    on = !!next;
    document.documentElement.classList.toggle('lite', on);
    document.body.classList.toggle('lite', on);

    var b = bar();
    var txt = b.querySelector('#cgLiteTxt');
    var yes = b.querySelector('#cgLiteYes');

    if (on) {
      txt.innerHTML = why === 'auto'
        ? '연결이 느려 <b>경량 모드</b>로 전환했습니다.'
        : '<b>경량 모드</b>가 켜져 있습니다. 영상과 효과를 줄였습니다.';
      yes.textContent = '해제';
      b.classList.add('show');
    } else if (why === 'offer') {
      txt.innerHTML = '연결이 느립니다. <b>경량 모드</b>로 빠르게 볼 수 있어요.';
      yes.textContent = '켜기';
      b.classList.add('show');
    } else if (why === 'back') {
      txt.innerHTML = '연결이 회복되어 <b>일반 모드</b>로 돌아왔습니다.';
      yes.textContent = '경량 유지';
      b.classList.add('show');
      setTimeout(function () { b.classList.remove('show'); }, 5000);
    } else {
      b.classList.remove('show');
    }
  }

  /* 사용자가 직접 켜고 끄면 그 선택을 기억한다 */
  window.cgToggleLite = function () {
    var next = !on;
    setPref(next ? '1' : '0');
    apply(next, 'manual');
  };
  /* 자동 판단으로 되돌리기 */
  window.cgAutoLite = function () {
    setPref('auto');
    decide(true);
  };

  var lastAuto = null;
  function decide(force) {
    var p = pref();
    if (p === '1') { apply(true, 'manual'); return; }
    if (p === '0') { apply(false, ''); return; }

    /* auto 또는 미설정 — 연결 상태를 따라간다 */
    var slow = isSlow();
    if (slow === lastAuto && !force) return;
    lastAuto = slow;
    if (slow) apply(true, 'auto');
    else apply(false, on ? 'back' : '');
  }

  function start() {
    injectStyle();
    bar();
    decide(true);
    if (conn && conn.addEventListener) {
      conn.addEventListener('change', function () { decide(false); });
    }
    /* 오프라인 → 온라인 전환 시에도 재판단 */
    window.addEventListener('online', function () { decide(false); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
