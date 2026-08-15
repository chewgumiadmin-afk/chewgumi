/*! ChewGumi QA Reporter v2 · MedIT
 *  ?qa=1 을 붙이면 화면에서 직접 짚어 신고할 수 있습니다.
 *  [콕 집기] → 이상한 부분을 누르면 그 요소를 자동으로 찾아 함께 보냅니다.
 */
(function () {
  'use strict';
  if (!/[?&]qa=1/.test(location.search)) return;
  if (window.__cgQA2) return;
  window.__cgQA2 = 1;

  var SB = 'https://psynvpuedzjvytsgdhgg.supabase.co';
  var KEY = 'sb_publishable_Tz7vgJXgYHQ3tyUfm87WTw_vV1Dxfuk';
  var page = (location.pathname.split('/').pop() || 'index.html') + (location.hash || '');

  var KINDS = ['겹침','좌우 밀림','이미지','글씨 작음','버튼 안됨',
               '팝업','뒤로가기','영문 전환','정렬','기타'];

  var css = document.createElement('style');
  css.textContent = [
    '.qa-bar{position:fixed;left:50%;transform:translateX(-50%);',
    '  bottom:calc(16px + env(safe-area-inset-bottom));z-index:2147483000;',
    '  display:flex;gap:6px;padding:7px;border-radius:999px;',
    '  background:rgba(23,23,28,.94);box-shadow:0 8px 26px rgba(0,0,0,.32);',
    '  font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif;',
    '  -webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);cursor:grab;',
    '  touch-action:none;user-select:none}',
    '.qa-bar.drag{cursor:grabbing;opacity:.9}',
    '.qa-bar button{height:38px;padding:0 14px;border:0;border-radius:999px;cursor:pointer;',
    '  font-family:inherit;font-size:12.5px;font-weight:700;background:rgba(255,255,255,.14);',
    '  color:#fff;white-space:nowrap}',
    '.qa-bar button.hot{background:#D82558}',
    '.qa-bar button.ok{background:#2AA060}',
    '.qa-bar .gp{width:14px;display:flex;align-items:center;justify-content:center;',
    '  color:rgba(255,255,255,.45);font-size:14px;letter-spacing:-2px}',
    '.qa-hi{position:fixed;z-index:2147482999;pointer-events:none;border:2px solid #D82558;',
    '  border-radius:5px;background:rgba(216,37,88,.12);',
    '  box-shadow:0 0 0 9999px rgba(15,10,14,.28)}',
    '.qa-tip{position:fixed;z-index:2147483001;pointer-events:none;padding:5px 10px;',
    '  border-radius:8px;background:#17171c;color:#fff;font-size:11.5px;font-weight:600;',
    '  font-family:inherit;white-space:nowrap;max-width:70vw;overflow:hidden;',
    '  text-overflow:ellipsis}',
    '.qa-bg{position:fixed;inset:0;z-index:2147483002;background:rgba(15,10,14,.5);',
    '  display:flex;align-items:flex-end;justify-content:center;',
    '  -webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}',
    '.qa-box{width:100%;max-width:440px;background:#fff;border-radius:22px 22px 0 0;',
    '  padding:22px 20px calc(22px + env(safe-area-inset-bottom));max-height:84vh;',
    '  overflow-y:auto;color:#17171c;box-shadow:0 -8px 30px rgba(0,0,0,.22);',
    '  font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif}',
    '.qa-box h3{font-size:16px;font-weight:800;margin:0 0 4px;letter-spacing:-.02em}',
    '.qa-box .tg{font-size:11.5px;color:#8a8a92;margin-bottom:14px;line-height:1.5;',
    '  word-break:break-all}',
    '.qa-box .tg b{color:#D82558}',
    '.qa-k{display:grid;grid-template-columns:repeat(2,1fr);gap:7px}',
    '.qa-k button{height:44px;border:1px solid #e6e3e8;border-radius:11px;background:#fff;',
    '  font-family:inherit;font-size:12.5px;font-weight:600;color:#333;cursor:pointer}',
    '.qa-k button.on{background:#D82558;color:#fff;border-color:transparent}',
    '.qa-box textarea{width:100%;min-height:70px;margin-top:11px;padding:11px 13px;',
    '  border:1px solid #e6e3e8;border-radius:11px;font-family:inherit;font-size:14px;',
    '  line-height:1.65;resize:vertical;box-sizing:border-box}',
    '.qa-act{display:flex;gap:8px;margin-top:12px}',
    '.qa-act button{flex:1;height:50px;border:0;border-radius:13px;cursor:pointer;',
    '  font-family:inherit;font-size:14.5px;font-weight:700}',
    '.qa-send{background:#D82558;color:#fff}',
    '.qa-cancel{background:#f2eff3;color:#555}',
    '.qa-msg{margin-top:9px;font-size:12.5px;min-height:17px;font-weight:600}',
    '.qa-shotbox{margin-top:11px}',
    '.qa-shotbox img{width:100%;border-radius:11px;border:1px solid #e6e3e8;display:block;',
    '  max-height:220px;object-fit:cover;object-position:top}',
    '.qa-shotbox span{display:block;margin-top:6px;font-size:11.5px;color:#2AA060;font-weight:600}',
    '.qa-grab{width:100%;height:44px;border:1px dashed #c9c4ce;border-radius:11px;',
    '  background:#fafafa;font-family:inherit;font-size:12.5px;font-weight:600;',
    '  color:#555;cursor:pointer}',
    '.qa-toast{position:fixed;left:50%;transform:translateX(-50%);bottom:96px;',
    '  z-index:2147483003;padding:13px 22px;border-radius:14px;background:rgba(23,23,28,.95);',
    '  color:#fff;font-size:13.5px;font-weight:600;font-family:inherit;',
    '  box-shadow:0 8px 24px rgba(0,0,0,.3)}'
  ].join('');
  document.head.appendChild(css);

  var picking = false, hi = null, tip = null, target = null;

  /* ── 화면 캡처 ── */
  var shot = null;   /* dataURL */

  function loadLib() {
    if (window.html2canvas) return Promise.resolve();
    return new Promise(function (ok, no) {
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      s.onload = ok; s.onerror = no;
      document.head.appendChild(s);
    });
  }

  function capture() {
    var bar = document.querySelector('.qa-bar');
    if (bar) bar.style.visibility = 'hidden';
    return loadLib().then(function () {
      var vw = document.documentElement.clientWidth;
      var vh = window.innerHeight;
      return html2canvas(document.body, {
        backgroundColor: '#ffffff',
        scale: 1,
        useCORS: true,
        allowTaint: true,
        logging: false,
        foreignObjectRendering: false,
        imageTimeout: 6000,
        width: vw,
        height: vh,
        x: window.scrollX,
        y: window.scrollY,
        scrollX: 0,
        scrollY: 0,
        windowWidth: vw,
        windowHeight: vh,
        ignoreElements: function (el) {
          return el.classList && (
            el.classList.contains('qa-bar') ||
            el.classList.contains('qa-hi') ||
            el.classList.contains('qa-tip') ||
            el.classList.contains('qa-bg') ||
            el.classList.contains('qa-toast'));
        }
      });
    }).then(function (cv) {
      if (bar) bar.style.visibility = '';
      shot = cv.toDataURL('image/jpeg', 0.72);
      if (shot.length < 3000) throw new Error('빈 이미지');
      return shot;
    }).catch(function (e) {
      if (bar) bar.style.visibility = '';
      shot = null;
      throw e;
    });
  }

  function post(kind, note, status) {
    var where = '';
    if (target) {
      where = describe(target.el) + '  [' + path(target.el) + ']  '
        + target.x + ',' + target.y;
    }
    return fetch(SB + '/functions/v1/qa', {
      method: 'POST',
      headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'report',
        report: {
          page: page, kind: kind,
          note: (where ? '위치 — ' + where + '\n' : '') + note,
          device: navigator.userAgent.slice(0, 110),
          viewport: window.innerWidth + 'x' + window.innerHeight,
          status: status || 'open',
          shot: shot || ''
        }
      })
    });
  }

  function openBox(withShot) {
    var picked = '';
    var bg = document.createElement('div');
    bg.className = 'qa-bg';
    bg.innerHTML =
      '<div class="qa-box">' +
      '<h3>' + (withShot ? '무엇이 이상한지 적어주세요' : '무엇이 이상한가요') + '</h3>' +
      '<div class="tg">' + page + (target ? ' · <b>' + describe(target.el) + '</b>' : '') + '</div>' +
      '<div class="qa-k">' + KINDS.map(function (k, i) {
        return '<button data-i="' + i + '">' + k + '</button>'; }).join('') + '</div>' +
      '<textarea placeholder="어떻게 보이는지 적어주세요. 짧아도 괜찮습니다."></textarea>' +
      '<div class="qa-shotbox">' +
        (shot ? '<img src="' + shot + '" alt="캡처"><span>화면이 함께 전송됩니다</span>'
              : '<button class="qa-grab">이 화면 캡처해서 함께 보내기</button>') +
      '</div>' +
      '<div class="qa-act"><button class="qa-cancel">닫기</button>' +
      '<button class="qa-send">보내기</button></div>' +
      '<div class="qa-msg"></div></div>';
    document.body.appendChild(bg);

    var msg = bg.querySelector('.qa-msg');
    var ta = bg.querySelector('textarea');
    if (withShot && ta) setTimeout(function () { ta.focus(); }, 250);
    bg.onclick = function (e) {
      if (e.target !== bg) return;
      var t = bg.querySelector('textarea');
      if (shot || picked || (t && t.value.trim())) {
        msg.style.color = '#C0395C';
        msg.textContent = '적으신 내용이 있습니다. 보내거나 닫기를 눌러주세요';
        return;
      }
      bg.remove(); target = null;
    };
    bg.querySelector('.qa-cancel').onclick = function () { bg.remove(); target = null; };
    bg.querySelectorAll('.qa-k button').forEach(function (b) {
      b.onclick = function () {
        bg.querySelectorAll('.qa-k button').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on'); picked = KINDS[+b.dataset.i];
      };
    });
    var grab = bg.querySelector('.qa-grab');
    if (grab) grab.onclick = function () {
      grab.textContent = '담는 중…'; grab.disabled = true;
      bg.style.display = 'none';
      capture().then(function (d) {
        bg.style.display = '';
        bg.querySelector('.qa-shotbox').innerHTML =
          '<img src="' + d + '" alt="캡처"><span>화면이 함께 전송됩니다</span>';
      }).catch(function () {
        bg.style.display = '';
        grab.textContent = '다시 시도'; grab.disabled = false;
      });
    };

    bg.querySelector('.qa-send').onclick = function () {
      var note = bg.querySelector('textarea').value.trim();
      if (!picked && !note) {
        msg.style.color = '#C0395C';
        msg.textContent = '항목을 고르거나 내용을 적어주세요';
        bg.querySelector('textarea').focus();
        return;
      }
      msg.style.color = '#8a8a92'; msg.textContent = '보내는 중…';
      post(picked || '기타', note, 'open').then(function (r) {
        if (!r.ok) throw new Error();
        bg.remove(); target = null; shot = null; toast('접수했습니다');
      }).catch(function () {
        msg.style.color = '#C0395C';
        msg.textContent = '보내지 못했습니다. 다시 시도해 주세요';
      });
    };
  }

  function start() {
    var bar = document.createElement('div');
    bar.className = 'qa-bar';
    bar.innerHTML =
      '<span class="gp">⣿</span>' +
      '<button class="qa-pick">콕 집기</button>' +
      '<button class="qa-shot">캡처</button>' +
      '<button class="qa-note">적기</button>' +
      '<button class="qa-ok ok">이상 없음</button>';
    document.body.appendChild(bar);

    bar.querySelector('.qa-pick').onclick = function (e) {
      e.stopPropagation();
      picking ? stopPick() : startPick();
    };
    bar.querySelector('.qa-shot').onclick = function (e) {
      e.stopPropagation();
      var b = e.currentTarget;
      b.textContent = '담는 중…'; b.disabled = true;
      target = null;
      capture().then(function () {
        b.textContent = '캡처'; b.disabled = false;
        openBox(true);
      }).catch(function () {
        b.textContent = '캡처'; b.disabled = false;
        toast('캡처는 실패했지만 내용은 적으실 수 있습니다');
        openBox(true);
      });
    };
    bar.querySelector('.qa-note').onclick = function (e) {
      e.stopPropagation(); target = null; openBox();
    };
    bar.querySelector('.qa-ok').onclick = function (e) {
      e.stopPropagation();
      post('', '', 'ok').then(function () {
        toast('이상 없음으로 기록했습니다', true);
      }).catch(function () { toast('기록하지 못했습니다'); });
    };

    /* 막대 옮기기 */
    var dx = 0, dy = 0, moving = false;
    function down(e) {
      if (e.target.tagName === 'BUTTON') return;
      var t = e.touches ? e.touches[0] : e;
      var r = bar.getBoundingClientRect();
      dx = t.clientX - r.left; dy = t.clientY - r.top;
      moving = true; bar.classList.add('drag');
      bar.style.transform = 'none';
      bar.style.left = r.left + 'px'; bar.style.top = r.top + 'px';
      bar.style.bottom = 'auto';
    }
    function move(e) {
      if (!moving) return;
      e.preventDefault();
      var t = e.touches ? e.touches[0] : e;
      var w = bar.offsetWidth, h = bar.offsetHeight;
      bar.style.left = Math.max(6, Math.min(window.innerWidth - w - 6, t.clientX - dx)) + 'px';
      bar.style.top = Math.max(6, Math.min(window.innerHeight - h - 6, t.clientY - dy)) + 'px';
    }
    function up() { moving = false; bar.classList.remove('drag'); }
    bar.addEventListener('mousedown', down);
    bar.addEventListener('touchstart', down, { passive: true });
    document.addEventListener('mousemove', move);
    document.addEventListener('touchmove', move, { passive: false });
    document.addEventListener('mouseup', up);
    document.addEventListener('touchend', up);
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', start);
  else start();

  /* 화면이 바뀌어도 막대가 사라지지 않도록 */
  function ensure() {
    if (!document.querySelector('.qa-bar')) start();
  }
  setInterval(ensure, 1200);
  window.addEventListener('pageshow', ensure);
  window.addEventListener('popstate', function () { setTimeout(ensure, 200); });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') setTimeout(ensure, 200);
  });

  /* 다른 화면으로 넘어갈 때 ?qa=1 유지 */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var h = a.getAttribute('href') || '';
    if (!h || h.charAt(0) === '#' || /^(https?:|mailto:|tel:|javascript:)/.test(h)) {
      if (h.indexOf(location.origin) !== 0) return;
    }
    if (h.indexOf('qa=1') > -1) return;
    if (!/\.html/.test(h)) return;
    e.preventDefault();
    var sep = h.indexOf('?') > -1 ? '&' : '?';
    var hash = '', hi = h.indexOf('#');
    var base = h;
    if (hi > -1) { hash = h.slice(hi); base = h.slice(0, hi); }
    location.href = base + sep + 'qa=1' + hash;
  }, true);
})();
