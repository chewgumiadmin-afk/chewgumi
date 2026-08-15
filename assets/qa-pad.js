/*! ChewGumi QA Pad · MedIT
 *  ?qa=1 화면에 스티키 메모형 점검판을 띄웁니다.
 *  드래그로 옮기고, 접었다 펼 수 있으며, 위치가 기억됩니다.
 */
(function () {
  'use strict';
  if (!/[?&]qa=1/.test(location.search)) return;
  if (window.__cgPad) return;
  window.__cgPad = 1;

  var SB = 'https://psynvpuedzjvytsgdhgg.supabase.co';
  var KEY = 'sb_publishable_Tz7vgJXgYHQ3tyUfm87WTw_vV1Dxfuk';
  var page = (location.pathname.split('/').pop() || 'index.html');
  var KINDS = ['겹침','밀림','이미지','글씨','버튼','팝업','정렬','기타'];
  var shot = null, picked = '', target = null, picking = false, hi = null;

  var st = {};
  try { st = JSON.parse(localStorage.getItem('cg_pad') || '{}'); } catch (e) {}
  function save() { try { localStorage.setItem('cg_pad', JSON.stringify(st)); } catch (e) {} }

  var css = document.createElement('style');
  css.textContent = [
    '.cgp{position:fixed;z-index:2147483000;width:268px;border-radius:16px;',
    '  background:linear-gradient(160deg,#FFF9DB,#FFF3B8);',
    '  box-shadow:0 10px 30px rgba(0,0,0,.22),inset 0 1px 0 rgba(255,255,255,.8);',
    '  font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif;',
    '  color:#3d3520;overflow:hidden;transition:box-shadow .2s}',
    '.cgp.drag{box-shadow:0 18px 44px rgba(0,0,0,.3);opacity:.96}',
    '.cgp-h{display:flex;align-items:center;gap:7px;padding:9px 11px;cursor:grab;',
    '  background:rgba(0,0,0,.05);user-select:none;touch-action:none}',
    '.cgp-h.drag{cursor:grabbing}',
    '.cgp-h b{flex:1;font-size:12px;font-weight:800;letter-spacing:-.01em;',
    '  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.cgp-h button{width:22px;height:22px;border:0;border-radius:6px;cursor:pointer;',
    '  background:rgba(0,0,0,.08);color:#3d3520;font-size:13px;font-weight:700;',
    '  line-height:1;display:flex;align-items:center;justify-content:center;padding:0}',
    '.cgp-b{padding:11px}',
    '.cgp.fold .cgp-b{display:none}',
    '.cgp-k{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-bottom:8px}',
    '.cgp-k button{height:30px;border:0;border-radius:8px;cursor:pointer;',
    '  background:rgba(255,255,255,.72);font-family:inherit;font-size:11px;',
    '  font-weight:600;color:#5a4f2a;padding:0}',
    '.cgp-k button.on{background:#D82558;color:#fff}',
    '.cgp textarea{width:100%;min-height:62px;padding:8px 10px;border:0;border-radius:9px;',
    '  background:rgba(255,255,255,.78);font-family:inherit;font-size:13px;line-height:1.6;',
    '  resize:vertical;box-sizing:border-box;color:#3d3520}',
    '.cgp textarea::placeholder{color:#a89a6a}',
    '.cgp textarea:focus{outline:2px solid #D82558;outline-offset:-1px}',
    '.cgp-t{display:flex;gap:4px;margin-top:7px}',
    '.cgp-t button{flex:1;height:32px;border:0;border-radius:8px;cursor:pointer;',
    '  background:rgba(255,255,255,.72);font-family:inherit;font-size:11px;',
    '  font-weight:600;color:#5a4f2a;padding:0}',
    '.cgp-t button.hot{background:#17171c;color:#fff}',
    '.cgp-send{width:100%;height:40px;margin-top:7px;border:0;border-radius:10px;',
    '  cursor:pointer;background:#D82558;color:#fff;font-family:inherit;',
    '  font-size:13.5px;font-weight:700}',
    '.cgp-send:disabled{opacity:.55}',
    '.cgp-m{margin-top:6px;font-size:11px;font-weight:600;min-height:15px;color:#7a6a3a}',
    '.cgp-m.ok{color:#1a6e44}.cgp-m.bad{color:#a82042}',
    '.cgp-sh{margin-top:7px;border-radius:9px;overflow:hidden;border:1px solid rgba(0,0,0,.1)}',
    '.cgp-sh img{width:100%;display:block;max-height:96px;object-fit:cover;object-position:top}',
    '.cgp-hi{position:fixed;z-index:2147482999;pointer-events:none;border:2px solid #D82558;',
    '  border-radius:5px;background:rgba(216,37,88,.12)}',
    '.cgp-fab{position:fixed;z-index:2147483000;width:46px;height:46px;border-radius:50%;',
    '  border:0;cursor:pointer;background:linear-gradient(160deg,#FFE923,#FFD84D);',
    '  box-shadow:0 8px 22px rgba(0,0,0,.25);font-size:18px;line-height:1;',
    '  display:flex;align-items:center;justify-content:center}'
  ].join('');
  document.head.appendChild(css);

  var pad;

  function describe(el) {
    if (!el) return '';
    var p = [];
    var t = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28);
    if (t) p.push('"' + t + '"');
    var tag = el.tagName.toLowerCase();
    var role = { a:'링크', button:'버튼', img:'이미지', input:'입력칸',
      select:'선택칸', textarea:'입력칸', h1:'제목', h2:'제목' }[tag];
    if (role) p.push(role);
    if (tag === 'img') {
      var s = (el.getAttribute('src') || '').split('/').pop();
      if (s) p.push(s.slice(0, 28));
    }
    return p.join(' · ') || tag;
  }
  function path(el) {
    var o = [], n = el, d = 0;
    while (n && n.nodeType === 1 && d < 4) {
      var s = n.tagName.toLowerCase();
      if (n.id) { s += '#' + n.id; o.unshift(s); break; }
      if (n.className && typeof n.className === 'string') {
        var c = n.className.split(/\s+/).filter(function (x) {
          return x && x.indexOf('cgp') !== 0; })[0];
        if (c) s += '.' + c;
      }
      o.unshift(s); n = n.parentElement; d++;
    }
    return o.join(' > ');
  }

  function onMove(e) {
    if (!picking) return;
    var t = e.touches ? e.touches[0] : e;
    var el = document.elementFromPoint(t.clientX, t.clientY);
    if (!el || el.closest('.cgp')) return;
    if (hi) hi.remove();
    var r = el.getBoundingClientRect();
    hi = document.createElement('div');
    hi.className = 'cgp-hi';
    hi.style.cssText = 'left:' + r.left + 'px;top:' + r.top + 'px;width:' +
      r.width + 'px;height:' + r.height + 'px';
    document.body.appendChild(hi);
  }
  function onPick(e) {
    if (!picking) return;
    var x = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    var y = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    var el = document.elementFromPoint(x, y);
    if (!el || el.closest('.cgp')) return;
    e.preventDefault(); e.stopPropagation();
    target = { el: el, x: Math.round(x), y: Math.round(y) };
    stopPick();
    var ta = pad.querySelector('textarea');
    ta.placeholder = describe(el) + ' — 무엇이 이상한가요';
    ta.focus();
  }
  function startPick() {
    picking = true;
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('touchmove', onMove, true);
    document.addEventListener('click', onPick, true);
    document.addEventListener('touchend', onPick, true);
    pad.querySelector('.cgp-pick').classList.add('hot');
  }
  function stopPick() {
    picking = false;
    document.removeEventListener('mousemove', onMove, true);
    document.removeEventListener('touchmove', onMove, true);
    document.removeEventListener('click', onPick, true);
    document.removeEventListener('touchend', onPick, true);
    if (hi) { hi.remove(); hi = null; }
    var b = pad.querySelector('.cgp-pick');
    if (b) b.classList.remove('hot');
  }

  function loadLib() {
    if (window.html2canvas) return Promise.resolve();
    return new Promise(function (ok, no) {
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      s.onload = ok; s.onerror = no; document.head.appendChild(s);
    });
  }
  function capture() {
    pad.style.visibility = 'hidden';
    return loadLib().then(function () {
      return html2canvas(document.body, {
        backgroundColor: '#fff', scale: 1, useCORS: true, allowTaint: true,
        logging: false, imageTimeout: 6000,
        width: document.documentElement.clientWidth, height: window.innerHeight,
        x: window.scrollX, y: window.scrollY, scrollX: 0, scrollY: 0,
        ignoreElements: function (el) {
          return el.classList && (el.classList.contains('cgp') ||
            el.classList.contains('cgp-hi') || el.classList.contains('cgm-fab'));
        }
      });
    }).then(function (cv) {
      pad.style.visibility = '';
      shot = cv.toDataURL('image/jpeg', 0.7);
      pad.querySelector('.cgp-sh').innerHTML = '<img src="' + shot + '" alt="캡처">';
      return shot;
    }).catch(function (e) { pad.style.visibility = ''; shot = null; throw e; });
  }

  function send() {
    var ta = pad.querySelector('textarea');
    var note = ta.value.trim();
    var msg = pad.querySelector('.cgp-m');
    var btn = pad.querySelector('.cgp-send');
    if (!picked && !note) {
      msg.className = 'cgp-m bad'; msg.textContent = '항목을 고르거나 적어주세요';
      ta.focus(); return;
    }
    var where = target ? (describe(target.el) + '  [' + path(target.el) + ']  ' +
      target.x + ',' + target.y) : '';
    msg.className = 'cgp-m'; msg.textContent = '보내는 중…';
    btn.disabled = true;

    fetch(SB + '/functions/v1/qa', {
      method: 'POST',
      headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'report', report: {
        page: page, kind: picked || '기타',
        note: (where ? '위치 — ' + where + '\n' : '') + note,
        device: navigator.userAgent.slice(0, 110),
        viewport: window.innerWidth + 'x' + window.innerHeight,
        status: 'open', shot: shot || ''
      }})
    }).then(function (r) { return r.json(); }).then(function (d) {
      btn.disabled = false;
      if (!d || d.error) throw new Error();
      msg.className = 'cgp-m ok';
      msg.textContent = '보냈습니다' + (d.id ? ' #' + d.id : '');
      ta.value = ''; ta.placeholder = '무엇이 이상한가요';
      shot = null; target = null; picked = '';
      pad.querySelector('.cgp-sh').innerHTML = '';
      pad.querySelectorAll('.cgp-k button').forEach(function (x) { x.classList.remove('on'); });
      setTimeout(function () { msg.textContent = ''; }, 2600);
    }).catch(function () {
      btn.disabled = false;
      msg.className = 'cgp-m bad'; msg.textContent = '보내지 못했습니다';
    });
  }

  function build() {
    pad = document.createElement('div');
    pad.className = 'cgp' + (st.fold ? ' fold' : '');
    pad.innerHTML =
      '<div class="cgp-h"><b>점검 · ' + page + '</b>' +
        '<button class="cgp-fold" aria-label="접기">' + (st.fold ? '+' : '−') + '</button>' +
        '<button class="cgp-close" aria-label="숨기기">×</button></div>' +
      '<div class="cgp-b">' +
        '<div class="cgp-k">' + KINDS.map(function (k) {
          return '<button data-k="' + k + '">' + k + '</button>'; }).join('') + '</div>' +
        '<textarea placeholder="무엇이 이상한가요"></textarea>' +
        '<div class="cgp-sh"></div>' +
        '<div class="cgp-t">' +
          '<button class="cgp-pick">콕 집기</button>' +
          '<button class="cgp-cap">캡처</button>' +
          '<button class="cgp-fill">값 채우기</button>' +
        '</div>' +
        '<button class="cgp-send">보내기</button>' +
        '<div class="cgp-m"></div>' +
      '</div>';
    document.body.appendChild(pad);

    /* 위치 복원 */
    var x = st.x, y = st.y;
    if (typeof x !== 'number') x = window.innerWidth - 288;
    if (typeof y !== 'number') y = 88;
    place(x, y);

    pad.querySelectorAll('.cgp-k button').forEach(function (b) {
      b.onclick = function () {
        var was = b.classList.contains('on');
        pad.querySelectorAll('.cgp-k button').forEach(function (x) { x.classList.remove('on'); });
        if (!was) { b.classList.add('on'); picked = b.dataset.k; }
        else picked = '';
      };
    });
    pad.querySelector('.cgp-send').onclick = send;
    pad.querySelector('.cgp-pick').onclick = function () {
      picking ? stopPick() : startPick();
    };
    pad.querySelector('.cgp-cap').onclick = function (e) {
      var b = e.currentTarget; b.textContent = '…'; b.disabled = true;
      capture().then(function () { b.textContent = '캡처'; b.disabled = false; })
        .catch(function () {
          b.textContent = '캡처'; b.disabled = false;
          var m = pad.querySelector('.cgp-m');
          m.className = 'cgp-m bad'; m.textContent = '캡처 실패 — 내용만 보내셔도 됩니다';
        });
    };
    pad.querySelector('.cgp-fill').onclick = function () {
      if (window.cgFill) window.cgFill();
      else {
        var m = pad.querySelector('.cgp-m');
        m.className = 'cgp-m bad'; m.textContent = '이 화면에는 입력칸이 없습니다';
      }
    };
    pad.querySelector('.cgp-fold').onclick = function (e) {
      st.fold = !st.fold; save();
      pad.classList.toggle('fold', st.fold);
      e.currentTarget.textContent = st.fold ? '+' : '−';
    };
    pad.querySelector('.cgp-close').onclick = function () {
      pad.style.display = 'none';
      var f = document.createElement('button');
      f.className = 'cgp-fab'; f.textContent = '✎';
      f.style.right = '16px'; f.style.bottom = '160px';
      f.onclick = function () { pad.style.display = ''; f.remove(); };
      document.body.appendChild(f);
    };

    /* 드래그 */
    var h = pad.querySelector('.cgp-h');
    var dx = 0, dy = 0, moving = false;
    function down(e) {
      if (e.target.tagName === 'BUTTON') return;
      var t = e.touches ? e.touches[0] : e;
      var r = pad.getBoundingClientRect();
      dx = t.clientX - r.left; dy = t.clientY - r.top;
      moving = true; pad.classList.add('drag'); h.classList.add('drag');
    }
    function move(e) {
      if (!moving) return;
      e.preventDefault();
      var t = e.touches ? e.touches[0] : e;
      place(t.clientX - dx, t.clientY - dy);
    }
    function up() {
      if (!moving) return;
      moving = false; pad.classList.remove('drag'); h.classList.remove('drag');
      var r = pad.getBoundingClientRect();
      st.x = r.left; st.y = r.top; save();
    }
    h.addEventListener('mousedown', down);
    h.addEventListener('touchstart', down, { passive: true });
    document.addEventListener('mousemove', move);
    document.addEventListener('touchmove', move, { passive: false });
    document.addEventListener('mouseup', up);
    document.addEventListener('touchend', up);
  }

  function place(x, y) {
    var w = pad.offsetWidth || 268, hh = pad.offsetHeight || 200;
    x = Math.max(6, Math.min(window.innerWidth - w - 6, x));
    y = Math.max(6, Math.min(window.innerHeight - 50, y));
    pad.style.left = x + 'px'; pad.style.top = y + 'px';
  }

  function start() {
    if (document.querySelector('.cgp')) return;
    build();
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', start);
  else start();
  setInterval(function () {
    if (!document.querySelector('.cgp') && !document.querySelector('.cgp-fab')) start();
  }, 1500);
})();
