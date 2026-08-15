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
    '.cgp-guide{margin-bottom:9px;border-radius:10px;overflow:hidden;',
    '  background:rgba(255,255,255,.72);display:none}',
    '.cgp-guide.on{display:block}',
    '.cgp-gh{display:flex;align-items:center;gap:6px;padding:8px 10px;cursor:pointer;',
    '  font-size:11.5px;font-weight:700;color:#5a4f2a;user-select:none}',
    '.cgp-gh span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.cgp-gb{padding:0 10px 10px;font-size:11.5px;line-height:1.7;color:#4d442a;',
    '  max-height:210px;overflow-y:auto}',
    '.cgp-guide.fold .cgp-gb{display:none}',
    '.cgp-gs{margin-top:7px}',
    '.cgp-gs b{display:block;font-size:10px;letter-spacing:.6px;color:#8a7b45;',
    '  margin-bottom:3px}',
    '.cgp-gs div{padding-left:9px;text-indent:-9px;margin-bottom:2px}',
    '.cgp-warn{background:rgba(216,37,88,.1);border-radius:7px;padding:6px 8px;margin-top:7px}',
    '.cgp-warn b{color:#a82042}',
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
    '.cgp-run{width:100%;height:34px;margin-top:6px;border:0;border-radius:9px;',
    '  cursor:pointer;background:rgba(0,0,0,.72);color:#fff;font-family:inherit;',
    '  font-size:11.5px;font-weight:700}',
    '.cgp-run:disabled{opacity:.55}',
    '.cgp-res{margin-top:7px;max-height:180px;overflow-y:auto;font-size:11px;',
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
    /* 메모지를 숨기지 않고 촬영에서만 제외한다 — 깜빡임 방지 */
    pad.setAttribute('data-qk-skip', '1');
    return lib().then(function () {
    return loadLib().then(function () {
      return html2canvas(document.body, {
        backgroundColor: '#fff', scale: 1, useCORS: true, allowTaint: true,
        logging: false, imageTimeout: 6000,
        width: document.documentElement.clientWidth, height: window.innerHeight,
        x: window.scrollX, y: window.scrollY, scrollX: 0, scrollY: 0,
        ignoreElements: function (el) {
          if (el.getAttribute && el.getAttribute('data-qk-skip')) return true;
          return el.classList && (el.classList.contains('cgp') ||
            el.classList.contains('cgp-hi') || el.classList.contains('cgm-fab'));
        }
      });
    }).then(function (cv) {
      pad.removeAttribute('data-qk-skip');
      shot = cv.toDataURL('image/jpeg', 0.7);
      pad.querySelector('.cgp-sh').innerHTML = '<img src="' + shot + '" alt="캡처">';
      return shot;
    }).catch(function (e) { pad.removeAttribute('data-qk-skip'); shot = null; throw e; });
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
    var act = /join|login|reset/.test(page) ? 'signupFlow'
            : (/checkout|cart|product|index/.test(page) ? 'orderFlow' : '');
    if (!act) {
      box.className = 'cgp-res on';
      box.innerHTML = '<div class="v bad">이 화면은 자동 검증 대상이 아닙니다</div>';
      return;
    }
    btn.disabled = true; btn.textContent = '검증 중…';
    box.className = 'cgp-res on';
    box.innerHTML = '<div class="r"><i class="q">·</i><span>확인하고 있습니다…</span></div>';

    fetch(SB + '/functions/v1/qa-flow', {
      method: 'POST',
      headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: act })
    }).then(function (r) { return r.json(); }).then(function (d) {
      btn.disabled = false; btn.textContent = '이 화면 자동 검증';
      if (!d || !d.steps) throw new Error();
      var bad = d.steps.filter(function (x) { return x.ok === false; }).length;
      box.innerHTML =
        '<div class="v ' + (bad ? 'bad' : 'ok') + '">' + esc(d.verdict || '') + '</div>' +
        d.steps.map(function (x) {
          var mk = x.ok === true ? 'y' : (x.ok === false ? 'n' : 'q');
          var ch = x.ok === true ? '✓' : (x.ok === false ? '✕' : '?');
          return '<div class="r"><i class="' + mk + '">' + ch + '</i>' +
            '<span><b>' + esc(x.name) + '</b> · ' + esc(x.msg) + '</span></div>';
        }).join('');
    }).catch(function () {
      btn.disabled = false; btn.textContent = '이 화면 자동 검증';
      box.innerHTML = '<div class="v bad">검증하지 못했습니다</div>';
    });
  }


  /* 화면에 실제로 그려진 글자와 구조를 읽는다 */
  function readScreen() {
    var out = { texts: [], images: [], buttons: [], fields: [], issues: [] };
    var seen = {};

    /* 보이는 글자 */
    var walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var t = (n.nodeValue || '').trim();
        if (!t || t.length < 2) return NodeFilter.FILTER_REJECT;
        var p = n.parentElement;
        if (!p || p.closest('.cgp, script, style, noscript')) return NodeFilter.FILTER_REJECT;
        var r = p.getBoundingClientRect();
        if (!r.width || !r.height) return NodeFilter.FILTER_REJECT;
        if (r.bottom < 0 || r.top > window.innerHeight) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var n, cnt = 0;
    while ((n = walk.nextNode()) && cnt < 120) {
      var t = n.nodeValue.trim().replace(/\s+/g, ' ');
      if (seen[t]) continue;
      seen[t] = 1;
      var p = n.parentElement;
      var cs = getComputedStyle(p);
      var size = parseFloat(cs.fontSize);
      out.texts.push({ t: t.slice(0, 60), size: Math.round(size),
        tag: p.tagName.toLowerCase() });
      if (size < 11) out.issues.push('작은 글씨 ' + Math.round(size) + 'px · "' + t.slice(0, 24) + '"');
      cnt++;
    }

    /* 이미지 */
    var imgs = document.querySelectorAll('img');
    for (var i = 0; i < imgs.length && i < 40; i++) {
      var im = imgs[i];
      if (im.closest('.cgp')) continue;
      var r = im.getBoundingClientRect();
      if (!r.width) continue;
      var src = (im.getAttribute('src') || '').split('/').pop().slice(0, 32);
      var alt = im.getAttribute('alt');
      out.images.push({ src: src, alt: alt || '', w: Math.round(r.width),
        h: Math.round(r.height), nw: im.naturalWidth, nh: im.naturalHeight,
        fit: getComputedStyle(im).objectFit });
      if (!im.complete || !im.naturalWidth) out.issues.push('안 뜨는 이미지 · ' + src);
      else {
        if (alt === null) out.issues.push('alt 없음 · ' + src);
        var nr = im.naturalWidth / im.naturalHeight, dr = r.width / r.height;
        var fit = getComputedStyle(im).objectFit;
        if (Math.abs(nr - dr) / nr > 0.18 && (fit === 'fill' || fit === 'none'))
          out.issues.push('찌그러짐 · ' + src + ' (원본 ' + nr.toFixed(2) +
            ' → 화면 ' + dr.toFixed(2) + ')');
        if (im.naturalWidth > r.width * 3)
          out.issues.push('원본이 너무 큼 · ' + src + ' ' + im.naturalWidth + 'px');
      }
    }

    /* 버튼·링크 */
    var bs = document.querySelectorAll('button, a[href], [role=button]');
    for (var j = 0; j < bs.length && j < 50; j++) {
      var b = bs[j];
      if (b.closest('.cgp')) continue;
      var br = b.getBoundingClientRect();
      if (!br.width || br.bottom < 0 || br.top > window.innerHeight) continue;
      var label = (b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30) ||
        b.getAttribute('aria-label') || '';
      out.buttons.push({ t: label, w: Math.round(br.width), h: Math.round(br.height) });
      if (!label) out.issues.push('이름 없는 버튼 · ' + b.tagName.toLowerCase());
      if (br.height < 36 && br.width < 120 && label)
        out.issues.push('누르기 작음 ' + Math.round(br.height) + 'px · "' + label.slice(0, 18) + '"');
    }

    /* 입력칸 */
    var fs = document.querySelectorAll('input:not([type=hidden]), textarea, select');
    for (var k = 0; k < fs.length && k < 30; k++) {
      var f = fs[k];
      if (f.closest('.cgp') || f.offsetParent === null) continue;
      var lb = (f.closest('label') && f.closest('label').textContent.trim()) ||
        f.getAttribute('aria-label') || f.placeholder || '';
      out.fields.push({ name: f.name || f.id || '', label: lb.slice(0, 28),
        type: f.type || f.tagName.toLowerCase(),
        size: Math.round(parseFloat(getComputedStyle(f).fontSize)) });
      if (!lb) out.issues.push('안내 없는 입력칸 · ' + (f.name || f.id || f.type));
      if (parseFloat(getComputedStyle(f).fontSize) < 16 && /input|textarea/i.test(f.tagName))
        out.issues.push('입력칸 글씨 16px 미만 — 아이폰에서 화면이 확대됩니다');
    }

    /* 겹침 — 화면 밖으로 나간 요소 */
    var all = document.body.querySelectorAll('*');
    var over = 0;
    for (var q = 0; q < all.length && q < 600; q++) {
      var e = all[q];
      if (e.closest('.cgp')) continue;
      var er = e.getBoundingClientRect();
      if (er.width && er.right > window.innerWidth + 2) over++;
    }
    if (over > 2) out.issues.push('화면 밖으로 나간 요소 ' + over + '개 — 좌우로 밀립니다');

    return out;
  }

  function runRead() {
    var box = pad.querySelector('.cgp-res');
    var d = readScreen();
    box.className = 'cgp-res on';
    var head = d.issues.length
      ? '<div class="v bad">' + d.issues.length + '건 발견</div>'
      : '<div class="v ok">눈에 띄는 문제 없음</div>';
    var rows = d.issues.slice(0, 14).map(function (t) {
      return '<div class="r"><i class="n">!</i><span>' + esc(t) + '</span></div>';
    }).join('');
    var sum = '<div class="r"><i class="q">·</i><span>글자 ' + d.texts.length +
      ' · 이미지 ' + d.images.length + ' · 버튼 ' + d.buttons.length +
      ' · 입력칸 ' + d.fields.length + '</span></div>';
    box.innerHTML = head + rows + sum;

    if (d.issues.length) {
      var ta = pad.querySelector('textarea');
      if (!ta.value.trim())
        ta.value = '[화면 읽기]\n' + d.issues.slice(0, 10)
          .map(function (t) { return '· ' + t; }).join('\n');
    }
    window.__qkRead = d;
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
        '<div class="cgp-t" style="margin-top:6px">' +
          '<button class="cgp-read">화면 읽기</button>' +
          '<button class="cgp-run">자동 검증</button>' +
        '</div>' +
        '<div class="cgp-res"></div>' +
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
    pad.querySelector('.cgp-run').onclick = runFlow;
    pad.querySelector('.cgp-read').onclick = runRead;
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
    loadGuide();

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
