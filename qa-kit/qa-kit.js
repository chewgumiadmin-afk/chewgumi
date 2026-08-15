/*! QA Kit v1 — 어떤 웹사이트에도 붙이는 점검 도구
 *  MIT License
 *
 *  붙이는 법 (한 줄):
 *    <script src="qa-kit.js" data-endpoint="https://내서버/qa"></script>
 *
 *  또는 코드 수정 없이 북마클릿으로:
 *    javascript:(function(){var s=document.createElement('script');
 *    s.src='https://내서버/qa-kit.js';s.dataset.endpoint='https://내서버/qa';
 *    document.body.appendChild(s)})()
 *
 *  서버는 아래 두 가지만 받으면 됩니다.
 *    POST { action:'report',   report:{...} }  → 신고 저장
 *    POST { action:'autofill', fields:[...] }  → 채울 값 반환 (선택)
 *    POST { action:'guide',    page:'...' }    → 화면 안내 반환 (선택)
 */
(function () {
  'use strict';
  if (window.__QAKit) return;
  window.__QAKit = 1;

  /* ─── 설정 ─── */
  var me = document.currentScript || (function () {
    var s = document.getElementsByTagName('script');
    return s[s.length - 1];
  })();
  var CFG = {
    endpoint: (me && me.dataset.endpoint) || '',
    token:    (me && me.dataset.token) || '',
    project:  (me && me.dataset.project) || location.hostname,
    lang:     (me && me.dataset.lang) || 'ko',
    always:   (me && me.dataset.always) === '1'
  };

  /* ?qa=1 로 켜고, 한 번 켜면 유지 */
  var SW = 'qakit_on';
  var q = location.search;
  if (/[?&]qa=0/.test(q)) { try { localStorage.removeItem(SW); } catch (e) {} return; }
  if (/[?&]qa=1/.test(q)) { try { localStorage.setItem(SW, '1'); } catch (e) {} }
  else if (!CFG.always) {
    var on = false;
    try { on = localStorage.getItem(SW) === '1'; } catch (e) {}
    if (!on) return;
  }

  var T = {
    ko: { title:'점검', what:'무엇이 이상한가요', send:'보내기', pick:'콕 집기',
          cap:'캡처', fill:'값 채우기', run:'자동 검증', sending:'보내는 중…',
          sent:'보냈습니다', fail:'보내지 못했습니다', need:'항목을 고르거나 적어주세요',
          kinds:['겹침','밀림','이미지','글씨','버튼','속도','흐름','기타'],
          ux:['어디를 눌러야 할지 모르겠음','다음에 뭘 해야 할지 모르겠음',
              '기다리는데 아무 표시가 없음','실수해도 되돌릴 수 없음',
              '글이 어렵거나 길다','원하는 걸 못 찾겠음'] },
    en: { title:'QA', what:'What looks wrong?', send:'Send', pick:'Point',
          cap:'Capture', fill:'Fill', run:'Verify', sending:'Sending…',
          sent:'Sent', fail:'Failed to send', need:'Pick a type or write something',
          kinds:['Overlap','Overflow','Image','Text','Button','Slow','Flow','Other'],
          ux:['Not sure where to click','Not sure what comes next',
              'No feedback while waiting','Cannot undo a mistake',
              'Copy is hard to read','Cannot find what I want'] }
  }[CFG.lang] || null;
  if (!T) return;

  var page = (location.pathname.split('/').pop() || 'index') + (location.hash || '');
  var shot = null, picked = '', target = null, picking = false, hi = null, pad;
  var st = {};
  try { st = JSON.parse(localStorage.getItem('qakit_pos') || '{}'); } catch (e) {}
  function save() { try { localStorage.setItem('qakit_pos', JSON.stringify(st)); } catch (e) {} }

  /* ─── 스타일 ─── */
  var css = document.createElement('style');
  css.textContent = [
    '.qk{position:fixed;z-index:2147483000;width:272px;border-radius:16px;',
    ' background:linear-gradient(160deg,#FFF9DB,#FFF3B8);color:#3d3520;overflow:hidden;',
    ' box-shadow:0 10px 30px rgba(0,0,0,.22),inset 0 1px 0 rgba(255,255,255,.8);',
    ' font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}',
    '.qk.drag{box-shadow:0 18px 44px rgba(0,0,0,.3);opacity:.96}',
    '.qk-h{display:flex;align-items:center;gap:7px;padding:9px 11px;cursor:grab;',
    ' background:rgba(0,0,0,.05);user-select:none;touch-action:none}',
    '.qk-h b{flex:1;font-size:12px;font-weight:800;overflow:hidden;',
    ' text-overflow:ellipsis;white-space:nowrap}',
    '.qk-h button{width:22px;height:22px;border:0;border-radius:6px;cursor:pointer;',
    ' background:rgba(0,0,0,.08);color:#3d3520;font-size:13px;font-weight:700;padding:0;',
    ' display:flex;align-items:center;justify-content:center;line-height:1}',
    '.qk-b{padding:11px}.qk.fold .qk-b{display:none}',
    '.qk-g{margin-bottom:9px;border-radius:10px;background:rgba(255,255,255,.72);',
    ' display:none;overflow:hidden}.qk-g.on{display:block}',
    '.qk-gh{padding:8px 10px;font-size:11.5px;font-weight:700;color:#5a4f2a;',
    ' cursor:pointer;display:flex;gap:6px}',
    '.qk-gh span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.qk-gb{padding:0 10px 10px;font-size:11.5px;line-height:1.7;color:#4d442a;',
    ' max-height:190px;overflow-y:auto}.qk-g.fold .qk-gb{display:none}',
    '.qk-gs{margin-top:7px}.qk-gs b{display:block;font-size:10px;color:#8a7b45;',
    ' letter-spacing:.5px;margin-bottom:3px}',
    '.qk-gs div{padding-left:9px;text-indent:-9px;margin-bottom:2px}',
    '.qk-warn{background:rgba(216,37,88,.1);border-radius:7px;padding:6px 8px;margin-top:7px}',
    '.qk-warn b{color:#a82042}',
    '.qk-k{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-bottom:7px}',
    '.qk-k button{height:30px;border:0;border-radius:8px;cursor:pointer;padding:0;',
    ' background:rgba(255,255,255,.72);font-family:inherit;font-size:11px;',
    ' font-weight:600;color:#5a4f2a}',
    '.qk-k button.on{background:#D82558;color:#fff}',
    '.qk-ux{margin-bottom:7px}',
    '.qk-ux select{width:100%;height:30px;border:0;border-radius:8px;padding:0 8px;',
    ' background:rgba(255,255,255,.72);font-family:inherit;font-size:11px;color:#5a4f2a}',
    '.qk textarea{width:100%;min-height:60px;padding:8px 10px;border:0;border-radius:9px;',
    ' background:rgba(255,255,255,.78);font-family:inherit;font-size:13px;line-height:1.6;',
    ' resize:vertical;box-sizing:border-box;color:#3d3520}',
    '.qk textarea::placeholder{color:#a89a6a}',
    '.qk textarea:focus{outline:2px solid #D82558;outline-offset:-1px}',
    '.qk-t{display:flex;gap:4px;margin-top:7px}',
    '.qk-t button{flex:1;height:32px;border:0;border-radius:8px;cursor:pointer;padding:0;',
    ' background:rgba(255,255,255,.72);font-family:inherit;font-size:11px;',
    ' font-weight:600;color:#5a4f2a}',
    '.qk-t button.hot{background:#17171c;color:#fff}',
    '.qk-send{width:100%;height:40px;margin-top:7px;border:0;border-radius:10px;',
    ' cursor:pointer;background:#D82558;color:#fff;font-family:inherit;',
    ' font-size:13.5px;font-weight:700}.qk-send:disabled{opacity:.55}',
    '.qk-m{margin-top:6px;font-size:11px;font-weight:600;min-height:15px;color:#7a6a3a}',
    '.qk-m.ok{color:#1a6e44}.qk-m.bad{color:#a82042}',
    '.qk-sh{margin-top:7px;border-radius:9px;overflow:hidden;border:1px solid rgba(0,0,0,.1)}',
    '.qk-sh img{width:100%;display:block;max-height:92px;object-fit:cover;object-position:top}',
    '.qk-hi{position:fixed;z-index:2147482999;pointer-events:none;border:2px solid #D82558;',
    ' border-radius:5px;background:rgba(216,37,88,.12)}',
    '.qk-fab{position:fixed;right:16px;bottom:120px;z-index:2147483000;width:46px;height:46px;',
    ' border-radius:50%;border:0;cursor:pointer;font-size:18px;',
    ' background:linear-gradient(160deg,#FFE923,#FFD84D);',
    ' box-shadow:0 8px 22px rgba(0,0,0,.25)}'
  ].join('');
  document.head.appendChild(css);

  /* ─── 도구 ─── */
  function esc(t) {
    return String(t == null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function api(payload) {
    if (!CFG.endpoint) return Promise.reject(new Error('no endpoint'));
    var h = { 'Content-Type': 'application/json' };
    if (CFG.token) h.Authorization = 'Bearer ' + CFG.token;
    return fetch(CFG.endpoint, { method: 'POST', headers: h,
      body: JSON.stringify(Object.assign({ project: CFG.project }, payload)) })
      .then(function (r) { return r.json(); });
  }
  function describe(el) {
    if (!el) return '';
    var p = [], t = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30);
    if (t) p.push('"' + t + '"');
    var tag = el.tagName.toLowerCase();
    var role = { a:'link', button:'button', img:'image', input:'field',
      select:'select', textarea:'field', h1:'heading', h2:'heading' }[tag];
    if (role) p.push(role);
    if (tag === 'img') {
      var s = (el.getAttribute('src') || '').split('/').pop();
      if (s) p.push(s.slice(0, 30));
      var alt = el.getAttribute('alt');
      p.push(alt ? ('alt: ' + alt.slice(0, 24)) : 'alt 없음');
      if (el.naturalWidth) p.push(el.naturalWidth + '×' + el.naturalHeight);
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
          return x && x.indexOf('qk') !== 0; })[0];
        if (c) s += '.' + c;
      }
      o.unshift(s); n = n.parentElement; d++;
    }
    return o.join(' > ');
  }

  /* ─── 요소 짚기 ─── */
  function onMove(e) {
    if (!picking) return;
    var t = e.touches ? e.touches[0] : e;
    var el = document.elementFromPoint(t.clientX, t.clientY);
    if (!el || el.closest('.qk')) return;
    if (hi) hi.remove();
    var r = el.getBoundingClientRect();
    hi = document.createElement('div');
    hi.className = 'qk-hi';
    hi.style.cssText = 'left:' + r.left + 'px;top:' + r.top + 'px;width:' +
      r.width + 'px;height:' + r.height + 'px';
    document.body.appendChild(hi);
  }
  function onPick(e) {
    if (!picking) return;
    var x = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    var y = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    var el = document.elementFromPoint(x, y);
    if (!el || el.closest('.qk')) return;
    e.preventDefault(); e.stopPropagation();
    target = { el: el, x: Math.round(x), y: Math.round(y) };
    stopPick();
    var ta = pad.querySelector('textarea');
    ta.placeholder = describe(el) + ' — ' + T.what;
    ta.focus();
  }
  function startPick() {
    picking = true;
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('touchmove', onMove, true);
    document.addEventListener('click', onPick, true);
    document.addEventListener('touchend', onPick, true);
    pad.querySelector('.qk-pick').classList.add('hot');
  }
  function stopPick() {
    picking = false;
    document.removeEventListener('mousemove', onMove, true);
    document.removeEventListener('touchmove', onMove, true);
    document.removeEventListener('click', onPick, true);
    document.removeEventListener('touchend', onPick, true);
    if (hi) { hi.remove(); hi = null; }
    var b = pad.querySelector('.qk-pick');
    if (b) b.classList.remove('hot');
  }

  /* ─── 캡처 ─── */
  function lib() {
    if (window.html2canvas) return Promise.resolve();
    return new Promise(function (ok, no) {
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      s.onload = ok; s.onerror = no; document.head.appendChild(s);
    });
  }
  function capture() {
    pad.style.visibility = 'hidden';
    return lib().then(function () {
      return html2canvas(document.body, {
        backgroundColor: '#fff', scale: 1, useCORS: true, allowTaint: true,
        logging: false, imageTimeout: 6000,
        width: document.documentElement.clientWidth, height: window.innerHeight,
        x: window.scrollX, y: window.scrollY, scrollX: 0, scrollY: 0,
        ignoreElements: function (el) {
          return el.classList && (el.classList.contains('qk') ||
            el.classList.contains('qk-hi') || el.classList.contains('qk-fab'));
        }
      });
    }).then(function (cv) {
      pad.style.visibility = '';
      shot = cv.toDataURL('image/jpeg', 0.7);
      pad.querySelector('.qk-sh').innerHTML = '<img src="' + shot + '" alt="capture">';
      return shot;
    }).catch(function (e) { pad.style.visibility = ''; shot = null; throw e; });
  }

  /* ─── 그림 점검 ─── */
  function scanImages() {
    var bad = [];
    var imgs = document.querySelectorAll('img');
    for (var i = 0; i < imgs.length && bad.length < 12; i++) {
      var im = imgs[i];
      if (im.closest('.qk')) continue;
      var r = im.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      var src = (im.getAttribute('src') || '').split('/').pop().slice(0, 26);
      if (!im.complete || !im.naturalWidth) { bad.push('안 보임 · ' + src); continue; }
      if (!im.getAttribute('alt')) bad.push('alt 없음 · ' + src);
      var nw = im.naturalWidth / im.naturalHeight, dw = r.width / r.height;
      if (Math.abs(nw - dw) / nw > 0.18) {
        var fit = getComputedStyle(im).objectFit;
        if (fit === 'fill' || fit === 'none')
          bad.push('찌그러짐 · ' + src);
      }
      if (im.naturalWidth > r.width * 3)
        bad.push('너무 큰 원본 · ' + src + ' (' + im.naturalWidth + 'px)');
    }
    return bad;
  }

  /* ─── 필드 채우기 ─── */
  function guessKind(el) {
    var s = [el.name, el.id, el.placeholder, el.getAttribute('aria-label') || '',
      (el.closest('label') && el.closest('label').textContent) || ''].join(' ').toLowerCase();
    if (el.type === 'email' || /메일|email|e-mail/.test(s)) return 'email';
    if (el.type === 'tel' || /전화|휴대|연락|phone|mobile/.test(s)) return 'phone';
    if (el.type === 'password') return 'pw';
    if (/우편|zip|postal/.test(s)) return 'zip';
    if (/상세|detail|addr2|line2/.test(s)) return 'addr2';
    if (/주소|addr|street/.test(s)) return 'addr1';
    if (/메모|요청|memo|note|message/.test(s)) return 'memo';
    if (/제목|title|subject/.test(s)) return 'title';
    if (/이름|성함|name/.test(s)) return 'name';
    if (el.tagName === 'TEXTAREA') return 'body';
    return '';
  }
  function setVal(el, v) {
    var proto = el.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
    ['input','change','blur'].forEach(function (t) {
      el.dispatchEvent(new Event(t, { bubbles: true })); });
    el.style.outline = '2px solid #2AA060';
    setTimeout(function () { el.style.outline = ''; }, 1400);
  }
  function fill(btn) {
    var els = document.querySelectorAll(
      'input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]),textarea');
    var fs = [];
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.closest('.qk') || el.disabled || el.readOnly) continue;
      if (el.offsetParent === null || (el.value && el.value.trim())) continue;
      var g = guessKind(el);
      if (!g) continue;
      fs.push({ el: el, key: 'f' + i, guess: g,
        label: (el.closest('label') ? el.closest('label').textContent : el.placeholder || '')
          .trim().slice(0, 28), type: el.type || 'text' });
    }
    var agreed = 0;
    var cbs = document.querySelectorAll('input[type=checkbox]');
    for (var j = 0; j < cbs.length; j++) {
      var c = cbs[j];
      if (c.closest('.qk') || c.offsetParent === null || c.checked) continue;
      var t = ((c.closest('label') || {}).textContent || '').toLowerCase();
      if (/동의|필수|agree|accept|required/.test(t)) { c.click(); agreed++; }
    }
    if (!fs.length) { msg(agreed ? (agreed + ' checked') : 'no fields', !agreed); return; }
    if (btn) { btn.disabled = true; btn.textContent = '…'; }

    api({ action: 'autofill', page: page, title: document.title,
      context: [].slice.call(document.querySelectorAll('h1,h2,legend'))
        .slice(0, 6).map(function (x) { return x.textContent.trim(); }).join(' / ').slice(0, 400),
      fields: fs.map(function (f) {
        return { key: f.key, guess: f.guess, label: f.label, type: f.type }; })
    }).then(function (d) {
      if (btn) { btn.disabled = false; btn.textContent = T.fill; }
      var v = (d && d.values) || {}, n = 0;
      fs.forEach(function (f) { if (v[f.key]) { setVal(f.el, String(v[f.key])); n++; } });
      msg(n + ' filled' + (agreed ? ' · ' + agreed + ' checked' : ''));
      if (d && d.notes && d.notes.length) notes(d.notes);
    }).catch(function () {
      if (btn) { btn.disabled = false; btn.textContent = T.fill; }
      msg('fill failed', true);
    });
  }
  function notes(list) {
    var old = document.querySelector('.qk-note'); if (old) old.remove();
    var d = document.createElement('div');
    d.className = 'qk-note';
    d.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:20px;' +
      'z-index:2147483004;max-width:min(400px,calc(100vw - 32px));padding:15px 17px;' +
      'border-radius:15px;background:#17171c;color:#fff;font-family:inherit;' +
      'box-shadow:0 12px 32px rgba(0,0,0,.34)';
    d.innerHTML = '<div style="font-size:11px;letter-spacing:1.4px;color:#FFE923;' +
      'font-weight:700;margin-bottom:8px">확인하고 진행하세요</div>' +
      list.map(function (t) { return '<div style="font-size:13px;line-height:1.7;' +
        'margin-bottom:4px">· ' + esc(t) + '</div>'; }).join('') +
      '<button style="width:100%;height:36px;margin-top:10px;border:0;border-radius:10px;' +
      'background:rgba(255,255,255,.16);color:#fff;font-family:inherit;font-size:12.5px;' +
      'font-weight:700;cursor:pointer">OK</button>';
    d.querySelector('button').onclick = function () { d.remove(); };
    document.body.appendChild(d);
    setTimeout(function () { if (d.parentNode) d.remove(); }, 12000);
  }

  /* ─── 화면 안내 ─── */
  function guide() {
    var box = pad.querySelector('.qk-g');
    api({ action: 'guide', page: page }).then(function (d) {
      var g = d && d.guide; if (!g) return;
      function sec(t, arr, warn) {
        if (!arr || !arr.length) return '';
        return '<div class="qk-gs' + (warn ? ' qk-warn' : '') + '"><b>' + t + '</b>' +
          arr.map(function (x) { return '<div>· ' + esc(x) + '</div>'; }).join('') + '</div>';
      }
      box.innerHTML = '<div class="qk-gh"><span>' + esc(g.what || page) + '</span>' +
        '<i>' + (st.gfold ? '+' : '−') + '</i></div><div class="qk-gb">' +
        sec('실제로 전송됩니다', g.send, true) + sec('점검 순서', g.steps) +
        sec('확인할 것', g.check) + sec('주의', g.watch, true) + '</div>';
      box.className = 'qk-g on' + (st.gfold ? ' fold' : '');
      box.querySelector('.qk-gh').onclick = function () {
        st.gfold = !st.gfold; save();
        box.classList.toggle('fold', st.gfold);
        box.querySelector('i').textContent = st.gfold ? '+' : '−';
      };
    }).catch(function () {});
  }

  function msg(t, bad) {
    var m = pad.querySelector('.qk-m');
    m.className = 'qk-m' + (bad ? ' bad' : ' ok');
    m.textContent = t;
    setTimeout(function () { m.textContent = ''; }, 2800);
  }

  /* ─── 전송 ─── */
  function send() {
    var ta = pad.querySelector('textarea');
    var ux = pad.querySelector('.qk-ux select').value;
    var note = ta.value.trim();
    if (!picked && !note && !ux) { msg(T.need, true); ta.focus(); return; }
    var btn = pad.querySelector('.qk-send');
    var where = target ? (describe(target.el) + '  [' + path(target.el) + ']  ' +
      target.x + ',' + target.y) : '';
    btn.disabled = true;
    pad.querySelector('.qk-m').className = 'qk-m';
    pad.querySelector('.qk-m').textContent = T.sending;

    api({ action: 'report', report: {
      page: page, url: location.href, kind: picked || 'other',
      ux: ux || '',
      note: (where ? 'at — ' + where + '\n' : '') + (ux ? '[UX] ' + ux + '\n' : '') + note,
      device: navigator.userAgent.slice(0, 110),
      viewport: window.innerWidth + 'x' + window.innerHeight,
      shot: shot || '', status: 'open'
    }}).then(function (d) {
      btn.disabled = false;
      if (!d || d.error) throw new Error();
      msg(T.sent + (d.id ? ' #' + d.id : ''));
      ta.value = ''; ta.placeholder = T.what;
      shot = null; target = null; picked = '';
      pad.querySelector('.qk-ux select').value = '';
      pad.querySelector('.qk-sh').innerHTML = '';
      pad.querySelectorAll('.qk-k button').forEach(function (x) { x.classList.remove('on'); });
    }).catch(function () { btn.disabled = false; msg(T.fail, true); });
  }

  /* ─── 만들기 ─── */
  function place(x, y) {
    var w = pad.offsetWidth || 272;
    pad.style.left = Math.max(6, Math.min(window.innerWidth - w - 6, x)) + 'px';
    pad.style.top = Math.max(6, Math.min(window.innerHeight - 50, y)) + 'px';
  }
  function build() {
    pad = document.createElement('div');
    pad.className = 'qk' + (st.fold ? ' fold' : '');
    pad.innerHTML =
      '<div class="qk-h"><b>' + T.title + ' · ' + page + '</b>' +
        '<button class="qk-fold">' + (st.fold ? '+' : '−') + '</button>' +
        '<button class="qk-x">×</button></div>' +
      '<div class="qk-b">' +
        '<div class="qk-g"></div>' +
        '<div class="qk-k">' + T.kinds.map(function (k) {
          return '<button data-k="' + k + '">' + k + '</button>'; }).join('') + '</div>' +
        '<div class="qk-ux"><select><option value="">쓰면서 불편한 점 (선택)</option>' +
          T.ux.map(function (u) { return '<option>' + u + '</option>'; }).join('') +
        '</select></div>' +
        '<textarea placeholder="' + T.what + '"></textarea>' +
        '<div class="qk-sh"></div>' +
        '<div class="qk-t">' +
          '<button class="qk-pick">' + T.pick + '</button>' +
          '<button class="qk-cap">' + T.cap + '</button>' +
          '<button class="qk-fill">' + T.fill + '</button>' +
        '</div>' +
        '<button class="qk-send">' + T.send + '</button>' +
        '<div class="qk-m"></div>' +
        '<button class="qk-img" style="width:100%;height:32px;margin-top:6px;border:0;' +
          'border-radius:9px;cursor:pointer;background:rgba(0,0,0,.72);color:#fff;' +
          'font-family:inherit;font-size:11px;font-weight:700">그림 점검</button>' +
      '</div>';
    document.body.appendChild(pad);
    place(typeof st.x === 'number' ? st.x : window.innerWidth - 292,
          typeof st.y === 'number' ? st.y : 84);

    pad.querySelectorAll('.qk-k button').forEach(function (b) {
      b.onclick = function () {
        var was = b.classList.contains('on');
        pad.querySelectorAll('.qk-k button').forEach(function (x) { x.classList.remove('on'); });
        picked = was ? '' : (b.classList.add('on'), b.dataset.k);
      };
    });
    pad.querySelector('.qk-send').onclick = send;
    pad.querySelector('.qk-pick').onclick = function () { picking ? stopPick() : startPick(); };
    pad.querySelector('.qk-cap').onclick = function (e) {
      var b = e.currentTarget; b.textContent = '…'; b.disabled = true;
      capture().then(function () { b.textContent = T.cap; b.disabled = false; })
        .catch(function () { b.textContent = T.cap; b.disabled = false;
          msg('capture failed', true); });
    };
    pad.querySelector('.qk-fill').onclick = function (e) { fill(e.currentTarget); };
    pad.querySelector('.qk-img').onclick = function () {
      var bad = scanImages();
      var ta = pad.querySelector('textarea');
      if (!bad.length) { msg('이미지 이상 없음'); return; }
      ta.value = '[그림 점검]\n' + bad.map(function (b) { return '· ' + b; }).join('\n');
      msg(bad.length + '건 발견 — 보내시면 됩니다', true);
    };
    pad.querySelector('.qk-fold').onclick = function (e) {
      st.fold = !st.fold; save();
      pad.classList.toggle('fold', st.fold);
      e.currentTarget.textContent = st.fold ? '+' : '−';
    };
    pad.querySelector('.qk-x').onclick = function () {
      pad.style.display = 'none';
      var f = document.createElement('button');
      f.className = 'qk-fab'; f.textContent = '✎';
      f.onclick = function () { pad.style.display = ''; f.remove(); };
      document.body.appendChild(f);
    };

    var h = pad.querySelector('.qk-h'), dx = 0, dy = 0, mv = false;
    function down(e) {
      if (e.target.tagName === 'BUTTON') return;
      var t = e.touches ? e.touches[0] : e, r = pad.getBoundingClientRect();
      dx = t.clientX - r.left; dy = t.clientY - r.top; mv = true; pad.classList.add('drag');
    }
    function move(e) {
      if (!mv) return; e.preventDefault();
      var t = e.touches ? e.touches[0] : e;
      place(t.clientX - dx, t.clientY - dy);
    }
    function up() {
      if (!mv) return; mv = false; pad.classList.remove('drag');
      var r = pad.getBoundingClientRect(); st.x = r.left; st.y = r.top; save();
    }
    h.addEventListener('mousedown', down);
    h.addEventListener('touchstart', down, { passive: true });
    document.addEventListener('mousemove', move);
    document.addEventListener('touchmove', move, { passive: false });
    document.addEventListener('mouseup', up);
    document.addEventListener('touchend', up);

    if (CFG.endpoint) guide();
  }

  function start() { if (!document.querySelector('.qk')) build(); }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', start);
  else start();
  setInterval(function () {
    if (!document.querySelector('.qk') && !document.querySelector('.qk-fab')) start();
  }, 1500);

  /* 다른 화면으로 가도 유지 */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var h = a.getAttribute('href') || '';
    if (!h || h.charAt(0) === '#' || /^(mailto:|tel:|javascript:)/.test(h)) return;
    try {
      var u = new URL(h, location.href);
      if (u.origin !== location.origin) return;
      if (u.searchParams.get('qa') === '1') return;
      u.searchParams.set('qa', '1');
      e.preventDefault(); location.href = u.toString();
    } catch (err) {}
  }, true);
})();
