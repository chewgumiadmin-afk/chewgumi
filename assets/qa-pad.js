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
    '  overflow-y:auto;overscroll-behavior:contain;',
    '  -webkit-overflow-scrolling:touch;',
    '  min-width:220px;max-width:min(92vw,520px);resize:none;',
    '  background:linear-gradient(160deg,#FFF9DB,#FFF3B8);',
    '  box-shadow:0 10px 30px rgba(0,0,0,.22),inset 0 1px 0 rgba(255,255,255,.8);',
    '  font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif;',
    '  color:#3d3520;transition:box-shadow .2s}',
    '.cgp.drag{box-shadow:0 18px 44px rgba(0,0,0,.3);opacity:.96}',
    '.cgp-h{display:flex;align-items:center;gap:7px;padding:9px 11px;cursor:grab;',
    '  background:rgba(250,244,200,.97);user-select:none;touch-action:none;',
    '  position:sticky;top:0;z-index:3;',
    '  -webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);',
    '  box-shadow:0 1px 0 rgba(0,0,0,.06)}',
    '.cgp-h.drag{cursor:grabbing}',
    '.cgp-h b{flex:1;font-size:12px;font-weight:800;letter-spacing:-.01em;',
    '  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.cgp-h button{width:22px;height:22px;border:0;border-radius:6px;cursor:pointer;',
    '  background:rgba(0,0,0,.08);color:#3d3520;font-size:13px;font-weight:700;',
    '  line-height:1;display:flex;align-items:center;justify-content:center;padding:0}',
    '.cgp-b{padding:11px}',
    '.cgp::-webkit-scrollbar{width:7px}',
    '.cgp::-webkit-scrollbar-track{background:transparent}',
    '.cgp::-webkit-scrollbar-thumb{background:rgba(0,0,0,.2);border-radius:4px;',
    '  border:2px solid transparent;background-clip:content-box}',
    '.cgp::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.32);',
    '  border:2px solid transparent;background-clip:content-box}',
    '.cgp.fold .cgp-b{display:none}',
    '.cgp-guide{margin-bottom:9px;border-radius:10px;overflow:hidden;',
    '  background:rgba(255,255,255,.72);display:none}',
    '.cgp-guide.on{display:block}',
    '.cgp-gh{display:flex;align-items:center;gap:6px;padding:8px 10px;cursor:pointer;',
    '  font-size:11.5px;font-weight:700;color:#5a4f2a;user-select:none}',
    '.cgp-gh span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.cgp-gb{padding:0 10px 10px;font-size:11.5px;line-height:1.7;color:#4d442a}',
    '.cgp-guide.fold .cgp-gb{display:none}',
    '.cgp-gs{margin-top:7px}',
    '.cgp-gs b{display:block;font-size:10px;letter-spacing:.6px;color:#8a7b45;',
    '  margin-bottom:3px}',
    '.cgp-gs div{padding-left:9px;text-indent:-9px;margin-bottom:2px}',
    '.cgp-warn{background:rgba(216,37,88,.1);border-radius:7px;padding:6px 8px;margin-top:7px}',
    '.cgp-warn b{color:#a82042}',
    '.cgp-sec{font-size:9.5px;letter-spacing:1.3px;color:#9a8b55;font-weight:800;',
    '  margin:11px 0 5px}',
    '.cgp-sec:first-of-type{margin-top:0}',
    '.cgp-k{display:grid;grid-template-columns:repeat(auto-fit,minmax(56px,1fr));',
    '  gap:4px;margin-bottom:8px}',

    '.cgp-k button{height:30px;border:0;border-radius:8px;cursor:pointer;',
    '  background:rgba(255,255,255,.72);font-family:inherit;font-size:11px;',
    '  font-weight:600;color:#5a4f2a;padding:0}',
    '.cgp-k button.on{background:#D82558;color:#fff}',
    '.cgp textarea{width:100%;min-height:62px;padding:8px 10px;border:0;border-radius:9px;',
    '  background:rgba(255,255,255,.78);font-family:inherit;font-size:13px;line-height:1.6;',
    '  resize:vertical;box-sizing:border-box;color:#3d3520}',
    '.cgp textarea::placeholder{color:#a89a6a}',
    '.cgp textarea:focus{outline:2px solid #D82558;outline-offset:-1px}',
    '.cgp-t{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:4px;',
    '  align-items:stretch;margin-top:7px}',
    '.cgp-t button{height:34px;min-height:34px;line-height:1;padding:0 2px;',
    '  border:0;border-radius:8px;cursor:pointer;box-sizing:border-box;',
    '  display:flex;align-items:center;justify-content:center;text-align:center;',
    '  background:rgba(255,255,255,.72);font-family:inherit;font-size:11px;',
    '  font-weight:600;color:#5a4f2a;white-space:nowrap;overflow:hidden;',
    '  text-overflow:ellipsis;vertical-align:top;margin:0;letter-spacing:-.02em}',
    '.cgp-t button.hot{background:#17171c;color:#fff}',
    '.cgp-send{width:100%;height:40px;margin-top:7px;border:0;border-radius:10px;',
    '  cursor:pointer;background:#D82558;color:#fff;font-family:inherit;',
    '  font-size:13.5px;font-weight:700}',
    '.cgp-send:disabled{opacity:.55}',
    '.cgp-run{width:100%;height:34px;margin-top:6px;border:0;border-radius:9px;',
    '  cursor:pointer;background:rgba(0,0,0,.72);color:#fff;font-family:inherit;',
    '  font-size:11.5px;font-weight:700}',
    '.cgp-run:disabled{opacity:.55}',
    '.cgp-res{max-height:180px;overflow-y:auto;font-size:11px;',
    '  line-height:1.65;display:none}',
    '.cgp-res.on{display:block}',
    '.cgp-res .v{padding:6px 8px;border-radius:7px;font-weight:700;margin-bottom:5px}',
    '.cgp-res .v.ok{background:rgba(26,110,68,.14);color:#14562f}',
    '.cgp-res .v.bad{background:rgba(168,32,66,.13);color:#8a1a35}',
    '.cgp-res .r{display:flex;gap:5px;padding:3px 2px;align-items:flex-start}',
    '.cgp-res .r i{flex:none;width:12px;font-style:normal;font-weight:800}',
    '.cgp-res .r i.y{color:#1a6e44}.cgp-res .r i.n{color:#a82042}',
    '.cgp-res .r i.q{color:#8a7b45}',
    '.cgp-res .r b{font-weight:700;color:#3d3520}',
    '.cgp-res .r span{color:#6a5f3a;word-break:break-all}',
    '.cgp-m{margin-top:6px;font-size:11px;font-weight:600;min-height:15px;color:#7a6a3a}',
    '.cgp-m.ok{color:#1a6e44}.cgp-m.bad{color:#a82042}',
    '.cgp-sh{margin-top:7px;border-radius:9px;overflow:hidden;border:1px solid rgba(0,0,0,.1)}',
    '.cgp-sh img{width:100%;display:block;max-height:96px;object-fit:cover;object-position:top}',
    '.cgp-rz{position:fixed;width:20px;height:20px;z-index:2147483002;',
    '  cursor:nwse-resize;touch-action:none;display:none}',
    '.cgp-rz.on{display:block}',
    '  z-index:2;touch-action:none}',
    '.cgp-rz::after{content:"";position:absolute;right:4px;bottom:4px;width:8px;height:8px;',
    '  border-right:2px solid rgba(0,0,0,.28);border-bottom:2px solid rgba(0,0,0,.28);',
    '  border-radius:0 0 2px 0}',
    '.cgp-rzx{position:fixed;width:10px;z-index:2147483002;cursor:ew-resize;',
    '  touch-action:none;display:none}',
    '.cgp-rzx.on{display:block}',
    '.cgp-rzx::after{content:"";position:absolute;top:50%;left:3px;',
    '  width:4px;height:26px;margin-top:-13px;border-radius:2px;',
    '  background:rgba(0,0,0,.16)}',
    '.cgp-hi{position:fixed;z-index:2147482999;pointer-events:none;border:2px solid #D82558;',
    '  border-radius:5px;background:rgba(216,37,88,.12)}',
    '.cgp{overflow-y:auto !important;overflow-x:hidden !important}',
    '.cgp.fold{overflow:hidden !important}',
    '.cgp-fab{position:fixed;z-index:2147483000;width:46px;height:46px;border-radius:50%;',
    '  border:0;cursor:pointer;background:linear-gradient(160deg,#FFE923,#FFD84D);',
    '  box-shadow:0 8px 22px rgba(0,0,0,.25);font-size:18px;line-height:1;',
    '  display:flex;align-items:center;justify-content:center}',
    /* 버튼 줄 정렬 확정 */
    '.cgp-t{display:grid !important;grid-auto-flow:column !important;',
    '  grid-auto-columns:1fr !important;gap:4px !important;',
    '  align-items:stretch !important;margin-top:7px !important}',
    '.cgp-t > button{height:34px !important;min-height:34px !important;',
    '  max-height:34px !important;padding:0 !important;margin:0 !important;',
    '  line-height:34px !important;border:0 !important;border-radius:8px !important;',
    '  display:block !important;text-align:center !important;',
    '  font-family:inherit !important;font-size:11px !important;font-weight:600 !important;',
    '  white-space:nowrap !important;overflow:hidden !important;',
    '  text-overflow:ellipsis !important;letter-spacing:-.03em !important;',
    '  vertical-align:top !important;box-sizing:border-box !important;',
    '  align-self:stretch !important;background:rgba(255,255,255,.72);color:#5a4f2a}',
    '.cgp-t > button.hot{background:#17171c !important;color:#fff !important}'
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
      s.onload = ok;
      s.onerror = function () { no(new Error('도구를 못 불러왔습니다')); };
      document.head.appendChild(s);
      setTimeout(function () { if (!window.html2canvas) no(new Error('도구 로딩 시간 초과')); }, 9000);
    });
  }
  function capture() {
    pad.setAttribute('data-skip', '1');

    /* 다른 사이트 이미지가 섞이면 브라우저가 캡처를 막습니다.
       잠시 우리 쪽 이미지로 바꿔 찍고, 끝나면 되돌립니다. */
    var swapped = [];
    var imgs = document.querySelectorAll('img');
    for (var i = 0; i < imgs.length; i++) {
      var im = imgs[i];
      var src = im.getAttribute('src') || '';
      if (!src) continue;
      if (src.indexOf('data:') === 0) continue;
      var sameHost = src.indexOf('http') !== 0 ||
        src.indexOf(location.origin) === 0;
      if (sameHost) continue;
      swapped.push([im, src]);
      im.setAttribute('src', 'assets/logo-rainbow.png');
    }

    function restore() {
      pad.removeAttribute('data-skip');
      for (var j = 0; j < swapped.length; j++) {
        swapped[j][0].setAttribute('src', swapped[j][1]);
      }
      swapped = [];
    }

    return loadLib().then(function () {
      return html2canvas(document.body, {
        backgroundColor: '#ffffff',
        scale: 1,
        useCORS: false,
        allowTaint: false,
        foreignObjectRendering: false,
        logging: false,
        imageTimeout: 4000,
        width: document.documentElement.clientWidth,
        height: window.innerHeight,
        x: window.scrollX,
        y: window.scrollY,
        scrollX: 0,
        scrollY: 0,
        ignoreElements: function (el) {
          if (el.getAttribute && el.getAttribute('data-skip')) return true;
          if (el.tagName === 'IFRAME' || el.tagName === 'VIDEO') return true;
          return el.classList && (el.classList.contains('cgp') ||
            el.classList.contains('cgp-hi') || el.classList.contains('cgm-fab'));
        }
      });
    }).then(function (cv) {
      var d;
      try {
        d = cv.toDataURL('image/jpeg', 0.7);
      } catch (e) {
        restore();
        throw new Error('보안 제한');
      }
      restore();
      if (!d || d.length < 3000) throw new Error('빈 이미지');
      shot = d;
      pad.querySelector('.cgp-sh').innerHTML = '<img src="' + shot + '" alt="캡처">';
      return shot;
    }).catch(function (e) {
      restore();
      shot = null;
      /* 무엇 때문인지 남긴다 */
      try { console.warn('[QA] 캡처 실패:', e && (e.message || e)); } catch (x) {}
      throw e;
    });
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


  /* 화면에 들어오면 코드를 읽고 안내를 띄운다 */
  function loadGuide() {
    var box = pad.querySelector('.cgp-guide');
    if (!box) return;
    fetch(SB + '/functions/v1/qa-guide', {
      method: 'POST',
      headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: page })
    }).then(function (r) { return r.json(); }).then(function (d) {
      var g = d && d.guide;
      if (!g) return;
      var fold = st.gfold ? ' fold' : '';
      var html = '<div class="cgp-gh"><span>' + esc(g.what || '이 화면') +
        '</span><i>' + (st.gfold ? '+' : '−') + '</i></div><div class="cgp-gb">';
      function sec(title, arr, warn) {
        if (!arr || !arr.length) return '';
        return '<div class="cgp-gs' + (warn ? ' cgp-warn' : '') + '"><b>' + title + '</b>' +
          arr.map(function (t) { return '<div>· ' + esc(t) + '</div>'; }).join('') + '</div>';
      }
      html += sec('실제로 전송됩니다', g.send, true);
      html += sec('점검 순서', g.steps);
      html += sec('확인할 것', g.check);
      html += sec('주의', g.watch, true);
      html += '</div>';
      box.innerHTML = html;
      box.className = 'cgp-guide on' + fold;
      box.querySelector('.cgp-gh').onclick = function () {
        st.gfold = !st.gfold; save();
        box.classList.toggle('fold', st.gfold);
        box.querySelector('i').textContent = st.gfold ? '+' : '−';
      };
    }).catch(function () {});
  }
  function esc(t) {
    return String(t == null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }


  /* 화면별 자동 검증 */
  function runFlow() {
    var btn = pad.querySelector('.cgp-run');
    var box = pad.querySelector('.cgp-res');
    var no = new URLSearchParams(location.search).get('no') || '';

    btn.disabled = true; btn.textContent = '검증 중…';
    box.className = 'cgp-res on';
    box.innerHTML = '<div class="r"><i class="q">.</i><span>확인하고 있습니다…</span></div>';

    fetch(SB + '/functions/v1/qa-flow', {
      method: 'POST',
      headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: page, no: no, keep: false })
    }).then(function (r) { return r.json(); }).then(function (d) {
      btn.disabled = false; btn.textContent = '자동 검증';
      if (!d || !d.steps) throw new Error();
      var bad = d.steps.filter(function (x) { return x.ok === false; }).length;
      box.innerHTML =
        '<div class="v ' + (bad ? 'bad' : 'ok') + '">' +
          esc(d.name || '') + ' · ' + esc(d.verdict || '') + '</div>' +
        d.steps.map(function (x) {
          var mk = x.ok === true ? 'y' : (x.ok === false ? 'n' : 'q');
          var ch = x.ok === true ? '\u2713' : (x.ok === false ? '\u2715' : '\u00b7');
          return '<div class="r"><i class="' + mk + '">' + ch + '</i>' +
            '<span><b>' + esc(x.n) + '</b> · ' + esc(x.m) + '</span></div>';
        }).join('') +
        (bad ? '<button class="cgp-put" style="width:100%;height:30px;margin-top:7px;' +
          'border:0;border-radius:8px;cursor:pointer;background:#D82558;color:#fff;' +
          'font-family:inherit;font-size:11px;font-weight:700">이 내용으로 신고 준비</button>' : '');
      var put = box.querySelector('.cgp-put');
      if (put) put.onclick = function () {
        var ta = pad.querySelector('textarea');
        ta.value = '[' + (d.name || '') + ' 자동 검증]\n' +
          d.steps.filter(function (x) { return x.ok === false; })
            .map(function (x) { return '· ' + x.n + ' — ' + x.m; }).join('\n');
        ta.focus();
      };
      fitHeight();
    }).catch(function () {
      btn.disabled = false; btn.textContent = '자동 검증';
      box.innerHTML = '<div class="v bad">검증하지 못했습니다</div>';
    });
  }


  /* ── 배포 감시 ──
     내가 보고 있는 화면이 새로 배포되면 알려주고, 눌러서 바로 새로고침 */
  var myTag = null, bar = null;

  function checkDeploy() {
    fetch(location.pathname + '?_c=' + Date.now(), { method: 'HEAD', cache: 'no-store' })
      .then(function (r) {
        var tag = r.headers.get('etag') || r.headers.get('last-modified') || '';
        if (!tag) return;
        if (myTag === null) { myTag = tag; return; }
        if (tag !== myTag) { myTag = tag; showUpdate(); }
      }).catch(function () {});
  }

  function showUpdate() {
    if (bar) return;
    bar = document.createElement('div');
    bar.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);' +
      'top:calc(14px + env(safe-area-inset-top));z-index:2147483005;' +
      'display:flex;align-items:center;gap:10px;padding:11px 14px 11px 18px;' +
      'border-radius:999px;background:#17171c;color:#fff;' +
      'box-shadow:0 10px 28px rgba(0,0,0,.32);' +
      'font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif;' +
      'font-size:13px;font-weight:600;animation:cgDrop .3s cubic-bezier(.2,.8,.3,1)';
    bar.innerHTML = '<span style="width:7px;height:7px;border-radius:50%;' +
      'background:#4ADE80;flex:none;animation:cgBlink 1.4s infinite"></span>' +
      '<span>수정이 반영되었습니다</span>' +
      '<button style="height:32px;padding:0 14px;border:0;border-radius:999px;' +
      'background:#D82558;color:#fff;font-family:inherit;font-size:12.5px;' +
      'font-weight:700;cursor:pointer">새로고침</button>' +
      '<button aria-label="닫기" style="width:26px;height:26px;border:0;border-radius:50%;' +
      'background:rgba(255,255,255,.14);color:#fff;font-size:15px;line-height:1;' +
      'cursor:pointer;padding:0">×</button>';
    var bs = bar.querySelectorAll('button');
    bs[0].onclick = function () { reloadKeep(); };
    bs[1].onclick = function () { bar.remove(); bar = null; };
    document.body.appendChild(bar);

    var st2 = document.createElement('style');
    st2.textContent = '@keyframes cgDrop{from{opacity:0;transform:translateX(-50%) translateY(-14px)}' +
      'to{opacity:1;transform:translateX(-50%)}}' +
      '@keyframes cgBlink{0%,100%{opacity:1}50%{opacity:.35}}';
    document.head.appendChild(st2);

    /* 자동 새로고침이 켜져 있으면 3초 뒤 */
    if (st.auto) setTimeout(function () { if (bar) reloadKeep(); }, 3000);
  }

  function reloadKeep() {
    /* 스크롤 위치를 기억했다 돌아온다 */
    try { sessionStorage.setItem('cg_scroll', String(window.scrollY)); } catch (e) {}
    var u = new URL(location.href);
    u.searchParams.set('_r', Date.now());
    location.replace(u.toString());
  }

  /* 돌아오면 원래 보던 자리로 */
  (function () {
    var y = null;
    try { y = sessionStorage.getItem('cg_scroll'); } catch (e) {}
    if (y === null) return;
    try { sessionStorage.removeItem('cg_scroll'); } catch (e) {}
    setTimeout(function () { window.scrollTo(0, +y); }, 250);
  })();

  setInterval(checkDeploy, 12000);
  setTimeout(checkDeploy, 1500);


  /* ── 화면 읽기 ── */
  function readScreen() {
    var bad = [], stat = { t: 0, i: 0, b: 0, f: 0 }, seen = {};

    var tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    var n, c = 0;
    while ((n = tw.nextNode()) && c < 150) {
      var t = (n.nodeValue || '').trim();
      if (t.length < 2 || seen[t]) continue;
      var p = n.parentElement;
      if (!p || p.closest('.cgp')) continue;
      var r = p.getBoundingClientRect();
      if (!r.width || r.bottom < 0 || r.top > window.innerHeight) continue;
      seen[t] = 1; stat.t++; c++;
      var sz = parseFloat(getComputedStyle(p).fontSize);
      if (sz < 11) bad.push('작은 글씨 ' + Math.round(sz) + 'px : ' + t.slice(0, 22));
    }

    var imgs = document.querySelectorAll('img');
    for (var i = 0; i < imgs.length && i < 40; i++) {
      var im = imgs[i];
      if (im.closest('.cgp')) continue;
      var ir = im.getBoundingClientRect();
      if (!ir.width) continue;
      stat.i++;
      var src = (im.getAttribute('src') || '').split('/').pop().slice(0, 28);
      if (!im.complete || !im.naturalWidth) { bad.push('안 뜨는 이미지 : ' + src); continue; }
      if (im.getAttribute('alt') === null) bad.push('alt 없음 : ' + src);
      var nr = im.naturalWidth / im.naturalHeight, dr = ir.width / ir.height;
      var fit = getComputedStyle(im).objectFit;
      if (Math.abs(nr - dr) / nr > 0.18 && (fit === 'fill' || fit === 'none'))
        bad.push('찌그러짐 : ' + src);
      if (im.naturalWidth > ir.width * 3)
        bad.push('원본 너무 큼 : ' + src + ' ' + im.naturalWidth + 'px');
    }

    var bs = document.querySelectorAll('button, a[href], [role=button]');
    for (var j = 0; j < bs.length && j < 60; j++) {
      var b = bs[j];
      if (b.closest('.cgp')) continue;
      var br = b.getBoundingClientRect();
      if (!br.width || br.bottom < 0 || br.top > window.innerHeight) continue;
      stat.b++;
      var lb = (b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 26) ||
        b.getAttribute('aria-label') || '';
      if (!lb) bad.push('이름 없는 버튼');
      else if (br.height < 36 && br.width < 120)
        bad.push('누르기 작음 ' + Math.round(br.height) + 'px : ' + lb.slice(0, 16));
    }

    var fs = document.querySelectorAll('input:not([type=hidden]), textarea, select');
    for (var k = 0; k < fs.length && k < 30; k++) {
      var f = fs[k];
      if (f.closest('.cgp') || f.offsetParent === null) continue;
      stat.f++;
      var fl = (f.closest('label') && f.closest('label').textContent.trim()) ||
        f.getAttribute('aria-label') || f.placeholder || '';
      var prev = f.previousElementSibling;
      if (!fl && prev && /LABEL|SPAN/.test(prev.tagName)) fl = prev.textContent.trim();
      if (!fl) bad.push('안내 없는 입력칸 : ' + (f.name || f.id || f.type));
      if (/INPUT|TEXTAREA/.test(f.tagName) &&
          parseFloat(getComputedStyle(f).fontSize) < 16)
        bad.push('입력칸 16px 미만 — 아이폰에서 확대됨');
    }

    var over = 0, all = document.body.querySelectorAll('*');
    for (var q = 0; q < all.length && q < 500; q++) {
      var e = all[q];
      if (e.closest('.cgp')) continue;
      var er = e.getBoundingClientRect();
      if (er.width && er.right > window.innerWidth + 2) over++;
    }
    if (over > 2) bad.push('화면 밖으로 나간 요소 ' + over + '개 — 좌우 밀림');

    var uniq = [], mark = {};
    for (var z = 0; z < bad.length; z++) {
      if (mark[bad[z]]) continue;
      mark[bad[z]] = 1; uniq.push(bad[z]);
    }
    return { bad: uniq, stat: stat };
  }

  function paintRead(d, auto) {
    var box = pad.querySelector('.cgp-res');
    if (!box) return;
    box.className = 'cgp-res on';
    var sum = '<div class="r"><i class="q">.</i><span>글자 ' + d.stat.t +
      ' · 이미지 ' + d.stat.i + ' · 버튼 ' + d.stat.b +
      ' · 입력칸 ' + d.stat.f + '</span></div>';
    if (!d.bad.length) {
      box.innerHTML = '<div class="v ok">화면 읽음 · 문제 없음</div>' + sum;
      fitHeight(); return;
    }
    var rows = '';
    for (var i = 0; i < d.bad.length && i < 14; i++) {
      rows += '<div class="r"><i class="n">!</i><span>' + esc(d.bad[i]) + '</span></div>';
    }
    box.innerHTML = '<div class="v bad">' + d.bad.length + '건 발견</div>' + rows + sum +
      '<button class="cgp-put" style="width:100%;height:30px;margin-top:7px;border:0;' +
      'border-radius:8px;cursor:pointer;background:#D82558;color:#fff;font-family:inherit;' +
      'font-size:11px;font-weight:700">이 내용으로 신고 준비</button>';
    var put = box.querySelector('.cgp-put');
    if (put) put.onclick = function () {
      var ta = pad.querySelector('textarea');
      var lines = [];
      for (var j = 0; j < d.bad.length && j < 12; j++) lines.push('· ' + d.bad[j]);
      ta.value = '[화면 읽기]\n' + lines.join('\n');
      ta.focus();
    };
    if (auto && st.fold) {
      st.fold = false; save();
      pad.classList.remove('fold');
      var fb = pad.querySelector('.cgp-fold');
      if (fb) fb.textContent = '−';
    }
    fitHeight();
  }

  function runRead() { paintRead(readScreen(), false); }

  var autoDone = false;
  function autoRead() {
    if (autoDone || !pad) return;
    autoDone = true;
    paintRead(readScreen(), true);
  }

  function waitImages(cb) {
    var imgs = [].slice.call(document.images).filter(function (im) {
      return !im.closest('.cgp') && im.getBoundingClientRect().width;
    });
    var left = imgs.filter(function (im) { return !im.complete; }).length;
    if (!left) { setTimeout(cb, 500); return; }
    var done = 0, fired = false;
    function tick() {
      done++;
      if (!fired && done >= left) { fired = true; setTimeout(cb, 350); }
    }
    imgs.forEach(function (im) {
      if (im.complete) return;
      im.addEventListener('load', tick, { once: true });
      im.addEventListener('error', tick, { once: true });
    });
    setTimeout(function () { if (!fired) { fired = true; cb(); } }, 4500);
  }

  function build() {
    pad = document.createElement('div');
    pad.className = 'cgp' + (st.fold ? ' fold' : '');
    pad.innerHTML =
      '<div class="cgp-h"><b>점검 · ' + page + '</b>' +
        '<button class="cgp-fold" aria-label="접기">' + (st.fold ? '+' : '−') + '</button>' +
        '<button class="cgp-close" aria-label="숨기기">×</button></div>' +
      '<div class="cgp-b">' +
        '<div class="cgp-guide"></div>' +
        '<div class="cgp-res"></div>' +
        '<div class="cgp-sec">검사</div>' +
        '<div class="cgp-t">' +
          '<button class="cgp-read">화면 읽기</button>' +
          '<button class="cgp-run">자동 검증</button>' +
          '<button class="cgp-fill">값 채우기</button>' +
        '</div>' +
        '<div class="cgp-sec">신고</div>' +
        '<div class="cgp-k">' + KINDS.map(function (k) {
          return '<button data-k="' + k + '">' + k + '</button>'; }).join('') + '</div>' +
        '<textarea placeholder="무엇이 이상한가요"></textarea>' +
        '<div class="cgp-sh"></div>' +
        '<div class="cgp-t" style="margin-top:6px">' +
          '<button class="cgp-pick">콕 집기</button>' +
          '<button class="cgp-cap">캡처</button>' +
        '</div>' +
        '<button class="cgp-send">보내기</button>' +
        '<div class="cgp-m"></div>' +
      '</div>' +
      '';
    document.body.appendChild(pad);

    /* 크기 복원 */
    if (st.w) pad.style.width = st.w + 'px';

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
    pad.querySelector('.cgp-run').onclick = runFlow;
    pad.querySelector('.cgp-read').onclick = runRead;
    pad.querySelector('.cgp-pick').onclick = function () {
      picking ? stopPick() : startPick();
    };
    pad.querySelector('.cgp-cap').onclick = function (e) {
      var b = e.currentTarget; b.textContent = '…'; b.disabled = true;
      capture().then(function () { b.textContent = '캡처'; b.disabled = false; })
        .catch(function (err) {
          b.textContent = '캡처'; b.disabled = false;
          var m = pad.querySelector('.cgp-m');
          m.className = 'cgp-m bad';
          var msg = (err && (err.message || String(err))) || '알 수 없음';
          m.textContent = msg === '보안 제한'
            ? '외부 이미지 때문에 못 찍었습니다'
            : (msg === '빈 이미지' ? '화면이 비어 담기지 않았습니다'
               : '캡처 실패 — ' + msg.slice(0, 30));
        });
    };
    pad.querySelector('.cgp-fill').onclick = function () {
      if (window.cgFill) window.cgFill();
      else {
        var m = pad.querySelector('.cgp-m');
        m.className = 'cgp-m bad'; m.textContent = '이 화면에는 입력칸이 없습니다';
      }
    };
    var ab = pad.querySelector('.cgp-auto');
    if (ab) {
      ab.style.color = st.auto ? '#1a6e44' : '#3d3520';
      ab.style.background = st.auto ? 'rgba(26,110,68,.16)' : 'rgba(0,0,0,.08)';
      ab.onclick = function (e) {
        e.stopPropagation();
        st.auto = !st.auto; save();
        ab.textContent = st.auto ? '\u21bb' : '\u21ba';
        ab.style.color = st.auto ? '#1a6e44' : '#3d3520';
        ab.style.background = st.auto ? 'rgba(26,110,68,.16)' : 'rgba(0,0,0,.08)';
        var m = pad.querySelector('.cgp-m');
        m.className = 'cgp-m ok';
        m.textContent = st.auto ? '수정되면 자동으로 새로고침합니다' : '자동 새로고침 꺼짐';
        setTimeout(function () { m.textContent = ''; }, 2400);
      };
    }
    pad.querySelector('.cgp-fold').onclick = function (e) {
      st.fold = !st.fold; save();
      pad.classList.toggle('fold', st.fold);
      e.currentTarget.textContent = st.fold ? '+' : '−';
      if (st.fold) pad.style.maxHeight = ''; else fitHeight();
      moveHandles();
    };
    pad.querySelector('.cgp-close').onclick = function () {
      pad.style.display = 'none';
      moveHandles();
      var f = document.createElement('button');
      f.className = 'cgp-fab'; f.textContent = '✎';
      f.style.right = '16px'; f.style.bottom = '160px';
      f.onclick = function () { pad.style.display = ''; f.remove(); moveHandles(); };
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
    loadGuide();
    waitImages(autoRead);

    /* 크기 조절 — 모서리(가로세로) · 오른쪽(가로만) */
    function bindResize(el, both) {
      var rw = 0, rh = 0, sx = 0, sy = 0, on = false;
      function rdown(e) {
        e.preventDefault(); e.stopPropagation();
        var t = e.touches ? e.touches[0] : e;
        var r = pad.getBoundingClientRect();
        rw = r.width; rh = r.height;
        sx = t.clientX; sy = t.clientY; on = true;
        pad.classList.add('drag');
      }
      function rmove(e) {
        if (!on) return;
        e.preventDefault();
        var t = e.touches ? e.touches[0] : e;
        var w = Math.max(220, Math.min(window.innerWidth * 0.92, rw + (t.clientX - sx)));
        pad.style.width = w + 'px';
        if (both) {
          var hh = Math.max(140, Math.min(window.innerHeight * 0.86, rh + (t.clientY - sy)));
          pad.style.maxHeight = hh + 'px';
          st.h = Math.round(hh);
        }
        st.w = Math.round(w);
        moveHandles();
      }
      function rup() {
        if (!on) return;
        on = false; pad.classList.remove('drag'); save();
      }
      el.addEventListener('mousedown', rdown);
      el.addEventListener('touchstart', rdown, { passive: false });
      document.addEventListener('mousemove', rmove);
      document.addEventListener('touchmove', rmove, { passive: false });
      document.addEventListener('mouseup', rup);
      document.addEventListener('touchend', rup);
    }
    makeHandles();
    bindResize(hz, true);
    bindResize(hzx, false);
    fitHeight();
    moveHandles();
    window.addEventListener('resize', function(){ fitHeight(); moveHandles(); });
    window.addEventListener('scroll', moveHandles, { passive: true });
    setInterval(moveHandles, 700);

    h.addEventListener('mousedown', down);
    h.addEventListener('touchstart', down, { passive: true });
    document.addEventListener('mousemove', move);
    document.addEventListener('touchmove', move, { passive: false });
    document.addEventListener('mouseup', up);
    document.addEventListener('touchend', up);
  }


  /* 점검판이 화면을 넘지 않도록 높이를 맞춘다 */
  /* 노트가 화면을 넘지 않도록 전체 높이를 맞춘다 */

  /* 크기 손잡이 — 노트 밖에 두고 위치만 따라간다 */
  var hzx, hz;
  function makeHandles() {
    if (hz) return;
    hzx = document.createElement('div');
    hzx.className = 'cgp-rzx';
    hz = document.createElement('div');
    hz.className = 'cgp-rz';
    hz.innerHTML = '<span style="position:absolute;right:4px;bottom:4px;width:9px;' +
      'height:9px;border-right:2px solid rgba(0,0,0,.3);' +
      'border-bottom:2px solid rgba(0,0,0,.3);border-radius:0 0 2px 0"></span>';
    document.body.appendChild(hzx);
    document.body.appendChild(hz);
  }
  function moveHandles() {
    if (!pad || !hz) return;
    if (pad.style.display === 'none' || pad.classList.contains('fold')) {
      hz.classList.remove('on'); hzx.classList.remove('on'); return;
    }
    var r = pad.getBoundingClientRect();
    hzx.style.left = (r.right - 5) + 'px';
    hzx.style.top = (r.top + 36) + 'px';
    hzx.style.height = Math.max(30, r.height - 54) + 'px';
    hz.style.left = (r.right - 20) + 'px';
    hz.style.top = (r.bottom - 20) + 'px';
    hz.classList.add('on'); hzx.classList.add('on');
  }

  function fitHeight() {
    if (!pad) return;
    var top = pad.getBoundingClientRect().top;
    var room = window.innerHeight - top - 14;
    var want = st.h ? Math.min(st.h, room) : room;
    pad.style.maxHeight = Math.max(140, want) + 'px';
  }

  function place(x, y) {
    var w = pad.offsetWidth || 268, hh = pad.offsetHeight || 200;
    x = Math.max(6, Math.min(window.innerWidth - w - 6, x));
    y = Math.max(6, Math.min(window.innerHeight - 50, y));
    pad.style.left = x + 'px'; pad.style.top = y + 'px';
    fitHeight();
    moveHandles();
  }

  function start() {
    if (document.querySelector('.cgp')) return;
    build();
  }

  /* 스크롤이 멈추면 새로 보이는 영역을 다시 읽는다 */
  var scT = null, lastY = 0;
  window.addEventListener('scroll', function () {
    if (Math.abs(window.scrollY - lastY) < 400) return;
    clearTimeout(scT);
    scT = setTimeout(function () {
      lastY = window.scrollY;
      autoDone = false;
      if (pad) autoRead();
    }, 900);
  }, { passive: true });
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', start);
  else start();
  setInterval(function () {
    if (!document.querySelector('.cgp') && !document.querySelector('.cgp-fab')) start();
  }, 1500);
})();
