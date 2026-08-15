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
    '.qa-toast{position:fixed;left:50%;transform:translateX(-50%);bottom:96px;',
    '  z-index:2147483003;padding:13px 22px;border-radius:14px;background:rgba(23,23,28,.95);',
    '  color:#fff;font-size:13.5px;font-weight:600;font-family:inherit;',
    '  box-shadow:0 8px 24px rgba(0,0,0,.3)}'
  ].join('');
  document.head.appendChild(css);

  var picking = false, hi = null, tip = null, target = null;

  function toast(t, ok) {
    var d = document.createElement('div');
    d.className = 'qa-toast';
    if (ok) d.style.background = 'rgba(26,110,68,.95)';
    d.textContent = t;
    document.body.appendChild(d);
    setTimeout(function () { d.remove(); }, 2400);
  }

  /* 요소를 사람이 알아볼 수 있게 설명 */
  function describe(el) {
    if (!el) return '';
    var parts = [];
    var t = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 34);
    if (t) parts.push('"' + t + '"');
    var tag = el.tagName.toLowerCase();
    var role = { a: '링크', button: '버튼', img: '이미지', input: '입력칸',
      select: '선택칸', textarea: '입력칸', h1: '제목', h2: '제목', h3: '제목' }[tag];
    if (role) parts.push(role);
    else if (el.className && typeof el.className === 'string') {
      var c = el.className.split(/\s+/).filter(Boolean)[0];
      if (c) parts.push(c);
    }
    if (tag === 'img') {
      var src = (el.getAttribute('src') || '').split('/').pop();
      if (src) parts.push(src.slice(0, 30));
    }
    return parts.join(' · ') || tag;
  }

  /* 기술적 위치 — 개발자용 */
  function path(el) {
    var out = [], n = el, d = 0;
    while (n && n.nodeType === 1 && d < 4) {
      var s = n.tagName.toLowerCase();
      if (n.id) { s += '#' + n.id; out.unshift(s); break; }
      if (n.className && typeof n.className === 'string') {
        var c = n.className.split(/\s+/).filter(function (x) {
          return x && x.indexOf('qa-') !== 0;
        })[0];
        if (c) s += '.' + c;
      }
      out.unshift(s); n = n.parentElement; d++;
    }
    return out.join(' > ');
  }

  function clearHi() {
    if (hi) { hi.remove(); hi = null; }
    if (tip) { tip.remove(); tip = null; }
  }

  function showHi(el) {
    clearHi();
    var r = el.getBoundingClientRect();
    hi = document.createElement('div');
    hi.className = 'qa-hi';
    hi.style.left = r.left + 'px'; hi.style.top = r.top + 'px';
    hi.style.width = r.width + 'px'; hi.style.height = r.height + 'px';
    document.body.appendChild(hi);

    tip = document.createElement('div');
    tip.className = 'qa-tip';
    tip.textContent = describe(el);
    var ty = r.top > 40 ? r.top - 30 : r.bottom + 8;
    tip.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 200)) + 'px';
    tip.style.top = ty + 'px';
    document.body.appendChild(tip);
  }

  function onMove(e) {
    if (!picking) return;
    var el = document.elementFromPoint(
      e.touches ? e.touches[0].clientX : e.clientX,
      e.touches ? e.touches[0].clientY : e.clientY);
    if (!el || el.closest('.qa-bar') || el.classList.contains('qa-hi')) return;
    showHi(el);
  }

  function onPick(e) {
    if (!picking) return;
    var x = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    var y = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    var el = document.elementFromPoint(x, y);
    if (!el || el.closest('.qa-bar')) return;
    e.preventDefault(); e.stopPropagation();
    target = { el: el, x: Math.round(x), y: Math.round(y) };
    stopPick();
    openBox();
  }

  function startPick() {
    picking = true;
    document.body.style.cursor = 'crosshair';
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('touchmove', onMove, true);
    document.addEventListener('click', onPick, true);
    document.addEventListener('touchend', onPick, true);
    var b = document.querySelector('.qa-pick');
    if (b) { b.classList.add('hot'); b.textContent = '눌러서 지목'; }
    toast('이상한 곳을 눌러주세요');
  }

  function stopPick() {
    picking = false;
    document.body.style.cursor = '';
    document.removeEventListener('mousemove', onMove, true);
    document.removeEventListener('touchmove', onMove, true);
    document.removeEventListener('click', onPick, true);
    document.removeEventListener('touchend', onPick, true);
    clearHi();
    var b = document.querySelector('.qa-pick');
    if (b) { b.classList.remove('hot'); b.textContent = '콕 집기'; }
  }

  function post(kind, note, status) {
    var where = '';
    if (target) {
      where = describe(target.el) + '  [' + path(target.el) + ']  '
        + target.x + ',' + target.y;
    }
    return fetch(SB + '/rest/v1/qa_reports', {
      method: 'POST',
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY,
        'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({
        page: page, kind: kind,
        note: (where ? '위치 — ' + where + '\n' : '') + note,
        device: navigator.userAgent.slice(0, 110),
        viewport: window.innerWidth + 'x' + window.innerHeight,
        status: status || 'open'
      })
    });
  }

  function openBox() {
    var picked = '';
    var bg = document.createElement('div');
    bg.className = 'qa-bg';
    bg.innerHTML =
      '<div class="qa-box">' +
      '<h3>무엇이 이상한가요</h3>' +
      '<div class="tg">' + page + (target ? ' · <b>' + describe(target.el) + '</b>' : '') + '</div>' +
      '<div class="qa-k">' + KINDS.map(function (k, i) {
        return '<button data-i="' + i + '">' + k + '</button>'; }).join('') + '</div>' +
      '<textarea placeholder="어떻게 보이는지 적어주세요"></textarea>' +
      '<div class="qa-act"><button class="qa-cancel">닫기</button>' +
      '<button class="qa-send">보내기</button></div>' +
      '<div class="qa-msg"></div></div>';
    document.body.appendChild(bg);

    var msg = bg.querySelector('.qa-msg');
    bg.onclick = function (e) { if (e.target === bg) { bg.remove(); target = null; } };
    bg.querySelector('.qa-cancel').onclick = function () { bg.remove(); target = null; };
    bg.querySelectorAll('.qa-k button').forEach(function (b) {
      b.onclick = function () {
        bg.querySelectorAll('.qa-k button').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on'); picked = KINDS[+b.dataset.i];
      };
    });
    bg.querySelector('.qa-send').onclick = function () {
      var note = bg.querySelector('textarea').value.trim();
      if (!picked && !note) {
        msg.style.color = '#C0395C';
        msg.textContent = '항목을 고르거나 내용을 적어주세요'; return;
      }
      msg.style.color = '#8a8a92'; msg.textContent = '보내는 중…';
      post(picked || '기타', note, 'open').then(function (r) {
        if (!r.ok) throw new Error();
        bg.remove(); target = null; toast('접수했습니다');
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
      '<button class="qa-note">적기</button>' +
      '<button class="qa-ok ok">이상 없음</button>';
    document.body.appendChild(bar);

    bar.querySelector('.qa-pick').onclick = function (e) {
      e.stopPropagation();
      picking ? stopPick() : startPick();
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
})();
