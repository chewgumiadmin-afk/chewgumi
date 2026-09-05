/*! ChewGumi QA 기록 도구 · MedIT
 *
 *  화면 위에 작은 창을 띄워
 *   · 누른 곳 · 넣은 값 · 옮긴 화면을 기록하고
 *   · 화면을 녹화하고
 *   · 이상한 것을 그 자리에서 적을 수 있게 합니다.
 *
 *  켜는 법   주소 뒤에 ?qa=1  또는  cgQA.on()
 *  끄는 법   cgQA.off()
 */
(function () {
  'use strict';
  if (window.cgQA) return;

  var SB = 'https://psynvpuedzjvytsgdhgg.supabase.co';
  var K = 'sb_publishable_Tz7vgJXgYHQ3tyUfm87WTw_vV1Dxfuk';
  var ON = 'cg_qa_on';
  var RUN = 'cg_qa_run';

  var run = '';
  var buf = [];
  var min = false;
  var rec = null;      /* MediaRecorder */
  var chunks = [];
  var recStart = 0;

  function isOn() {
    try {
      if (new URLSearchParams(location.search).get('qa') === '1') {
        localStorage.setItem(ON, '1');
        return true;
      }
      return localStorage.getItem(ON) === '1';
    } catch (e) { return false; }
  }

  function runId() {
    try {
      var r = sessionStorage.getItem(RUN);
      if (!r) {
        r = 'QA' + Date.now().toString(36).toUpperCase();
        sessionStorage.setItem(RUN, r);
      }
      return r;
    } catch (e) { return 'QA0'; }
  }

  function page() { return (location.pathname.split('/').pop() || 'index.html'); }

  function label(el) {
    if (!el) return '';
    var t = (el.textContent || '').trim().replace(/\s+/g, ' ');
    if (t && t.length < 40) return t;
    return el.getAttribute('aria-label') || el.getAttribute('placeholder')
      || el.getAttribute('title') || el.id || el.className || el.tagName;
  }

  function where(el) {
    if (!el) return '';
    if (el.id) return '#' + el.id;
    var t = el.tagName.toLowerCase();
    if (el.className && typeof el.className === 'string') {
      t += '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.');
    }
    return t;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* 녹화 중이면 몇 초째인지 */
  function stamp() {
    if (!recStart) return '';
    var s = Math.floor((Date.now() - recStart) / 1000);
    return String(Math.floor(s / 60)).padStart(2, '0') + ':'
         + String(s % 60).padStart(2, '0');
  }

  /* ── 문제를 적었을 때 같이 붙일 것들 ──
     화면 주소·눌렀던 곳·콘솔 오류·실패한 요청을 모아 둡니다.
     사람이 "이상해요" 한 줄만 적어도 고치는 쪽에서 재현할 수 있게 하려는 것입니다.
     (issues #7 · 2번) */
  var CTX_MAX = 12;
  var ctx = [];
  function keep(kind, text) {
    if (!text) return;
    ctx.push({ at: new Date().toISOString().slice(11, 19), kind: kind, text: String(text) });
    if (ctx.length > CTX_MAX) ctx = ctx.slice(-CTX_MAX);
  }
  var lastHit = '';          /* 마지막으로 누른 곳 */

  function context() {
    var out = [];
    out.push('화면: ' + page() + '  ' + location.href.slice(0, 200));
    out.push('브라우저: ' + navigator.userAgent.slice(0, 120));
    out.push('창 크기: ' + window.innerWidth + '×' + window.innerHeight);
    if (lastHit) out.push('마지막으로 누른 곳: ' + lastHit);
    var errs = ctx.filter(function (c) { return c.kind !== '요청실패'; });
    var reqs = ctx.filter(function (c) { return c.kind === '요청실패'; });
    if (errs.length) {
      out.push('');
      out.push('콘솔 오류 ' + errs.length + '건');
      errs.forEach(function (c) { out.push('  ' + c.at + ' [' + c.kind + '] ' + c.text); });
    }
    if (reqs.length) {
      out.push('');
      out.push('실패한 요청 ' + reqs.length + '건');
      reqs.forEach(function (c) { out.push('  ' + c.at + ' ' + c.text); });
    }
    if (!errs.length && !reqs.length) out.push('(콘솔 오류·실패한 요청 없음)');
    return out.join('\n');
  }

  function log(kind, o) {
    if (!isOn()) return;
    var row = {
      run_id: run, page: page(), kind: kind,
      target: (o && o.target) || '',
      label: (o && o.label) || '',
      value: (o && o.value) || '',
      note: ((stamp() ? '[' + stamp() + '] ' : '') + ((o && o.note) || '')).trim(),
      rule: (o && o.rule) || '',
      url: location.href.slice(0, 300),
      ua: navigator.userAgent.slice(0, 160)
    };
    buf.push(row);
    paint();

    /* 시험대(qa-lab) 안에서 열렸으면 바깥에도 알립니다 */
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          src: 'cgqa', kind: kind, page: row.page,
          target: row.target, label: row.label,
          value: row.value, note: row.note, rule: row.rule
        }, location.origin);
      }
    } catch (e) {}

    fetch(SB + '/rest/v1/qa_events', {
      method: 'POST',
      headers: {
        apikey: K, Authorization: 'Bearer ' + K,
        'Content-Type': 'application/json', Prefer: 'return=minimal'
      },
      body: JSON.stringify(row)
    }).catch(function () {});
  }

  function box() { return document.getElementById('cgQaBox'); }

  function paint() {
    var b = box();
    if (!b) return;
    var list = b.querySelector('.qa-list');
    if (!list) return;

    var last = buf.slice(-8).reverse();
    list.innerHTML = last.length
      ? last.map(function (r) {
          var ic = { click: '·', input: '✎', move: '→',
                     bug: '✕', note: '!', check: '✓', rec: '●' }[r.kind] || '·';
          return '<div class="qa-row ' + r.kind + '">'
            + '<i>' + ic + '</i>'
            + '<span>' + esc(r.note || r.label || r.target) + '</span>'
            + (r.value ? '<em>' + esc(r.value.slice(0, 24)) + '</em>' : '')
            + '</div>';
        }).join('')
      : '<p class="qa-empty">누르시는 것을 기록합니다</p>';

    var n = b.querySelector('.qa-n');
    if (n) n.textContent = buf.length;
  }

  /* ── 화면 녹화 ── */
  function canRec() {
    return !!(navigator.mediaDevices
      && navigator.mediaDevices.getDisplayMedia
      && window.MediaRecorder);
  }

  function recBtn() { return document.querySelector('#cgQaBox .qa-rec'); }

  function startRec() {
    if (!canRec()) {
      alert('이 브라우저는 화면 녹화를 지원하지 않습니다.\n\n'
        + '크롬이나 엣지에서 열어주세요.\n'
        + '아이폰 사파리는 안 됩니다.');
      return;
    }

    navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 12 },
      audio: false,
      preferCurrentTab: true
    })
    .then(function (stream) {
      chunks = [];
      var type = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9' : 'video/webm';

      rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 900000 });
      rec.ondataavailable = function (e) {
        if (e.data && e.data.size) chunks.push(e.data);
      };
      rec.onstop = function () {
        stream.getTracks().forEach(function (t) { t.stop(); });
        save();
      };
      rec.start(1000);
      recStart = Date.now();

      /* 사용자가 브라우저 「공유 중지」를 누르면 */
      stream.getVideoTracks()[0].onended = function () { stopRec(); };

      var b = recBtn();
      if (b) { b.textContent = '● 녹화 중'; b.classList.add('on'); }
      log('rec', { note: '녹화 시작', target: page() });
    })
    .catch(function (e) {
      if (String(e).indexOf('NotAllowed') < 0) {
        alert('녹화를 시작하지 못했습니다.');
      }
    });
  }

  function stopRec() {
    if (!rec || rec.state === 'inactive') return;
    log('rec', { note: '녹화 끝 · ' + stamp(), target: page() });
    rec.stop();
    rec = null;
    recStart = 0;
    var b = recBtn();
    if (b) { b.textContent = '● 녹화'; b.classList.remove('on'); }
  }

  function save() {
    if (!chunks.length) return;
    var blob = new Blob(chunks, { type: 'video/webm' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = run + '_' + page().replace('.html', '') + '.webm';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(url);
      a.remove();
    }, 1500);

    var mb = (blob.size / 1048576).toFixed(1);
    setTimeout(function () {
      alert('녹화한 영상을 내려받았습니다. (' + mb + 'MB)\n\n'
        + '파일 이름 · ' + a.download + '\n\n'
        + '이 영상과 [개발자에게 보낼 글 복사]를 함께 주시면\n'
        + '무엇이 언제 일어났는지 맞춰 볼 수 있습니다.');
    }, 400);
  }

  /* 테스트 모드라는 것을 화면 위에 분명히 띄웁니다.
     QA 중에 실제 주문을 넣어 버리는 사고를 막으려는 것입니다. (issues #7 · 1번) */
  function banner() {
    if (document.getElementById('cgQaBar')) return;
    var bar = document.createElement('div');
    bar.id = 'cgQaBar';
    bar.setAttribute('role', 'status');
    bar.textContent = '테스트 모드입니다 — 여기서 넣는 주문은 실제 주문이 아닙니다';
    bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:2147483646;'
      + 'padding:7px 12px;text-align:center;font-size:12.5px;font-weight:700;'
      + 'font-family:inherit;color:#3a2a00;background:#FFE923;'
      + 'box-shadow:0 1px 6px rgba(0,0,0,.18);pointer-events:none;'
      + 'letter-spacing:-.01em';
    document.body.appendChild(bar);
    /* 띠가 머리말을 가리지 않게 본문을 조금 내립니다 */
    var h = bar.offsetHeight || 30;
    document.documentElement.style.scrollPaddingTop = h + 'px';
    document.body.style.marginTop = h + 'px';
  }

  function build() {
    if (box()) return;
    /* 시험대 안이면 창을 안 띄웁니다 (바깥에 이미 있습니다) */
    try {
      if (window.parent && window.parent !== window) return;
    } catch (e) {}

    var b = document.createElement('div');
    b.id = 'cgQaBox';
    b.className = 'qa-box';
    b.innerHTML =
      '<div class="qa-head">'
        + '<b>QA 기록</b>'
        + '<span class="qa-run">' + run + '</span>'
        + '<span class="qa-n">0</span>'
        + '<button class="qa-min" title="접기">—</button>'
        + '<button class="qa-x" title="끄기">✕</button>'
      + '</div>'
      + '<div class="qa-body">'
        + '<button class="qa-rec">● 녹화</button>'
        + '<div class="qa-list"></div>'
        + '<textarea class="qa-memo" placeholder="이상한 점을 적어주세요"></textarea>'
        + '<div class="qa-b">'
          + '<button class="bug">버그</button>'
          + '<button class="note">메모</button>'
          + '<button class="ok">잘 됨</button>'
        + '</div>'
        + '<div class="qa-sent"></div>'
      + '</div>';
    document.body.appendChild(b);
    banner();

    b.querySelector('.qa-x').onclick = function () { cgQA.off(); };
    b.querySelector('.qa-min').onclick = function () {
      min = !min;
      b.classList.toggle('mini', min);
    };
    b.querySelector('.qa-rec').onclick = function () {
      if (rec) stopRec(); else startRec();
    };

    function send(kind) {
      var t = b.querySelector('.qa-memo');
      var v = (t.value || '').trim();
      if (kind !== 'check' && !v) {
        t.focus();
        t.placeholder = '무엇이 이상한지 적어주세요';
        return;
      }
      /* 버그로 적으면 맥락을 같이 붙입니다 (issues #7 · 2번) */
      var body = v || '이 화면은 잘 됩니다';
      if (kind === 'bug') body = body + '\n\n──── 자동으로 붙인 정보 ────\n' + context();
      log(kind, { note: body, target: page() });
      t.value = '';
      if (kind === 'bug') {
        var m = b.querySelector('.qa-sent');
        if (m) { m.textContent = '보냈습니다 · 화면 정보와 오류를 함께 붙였습니다';
                 setTimeout(function () { m.textContent = ''; }, 4000); }
      }
    }
    b.querySelector('.bug').onclick = function () { send('bug'); };
    b.querySelector('.note').onclick = function () { send('note'); };
    b.querySelector('.ok').onclick = function () { send('check'); };

    /* 드래그 */
    var head = b.querySelector('.qa-head');
    var dx = 0, dy = 0, on = false;
    head.addEventListener('pointerdown', function (e) {
      if (e.target.tagName === 'BUTTON') return;
      on = true;
      dx = e.clientX - b.offsetLeft;
      dy = e.clientY - b.offsetTop;
      head.setPointerCapture(e.pointerId);
    });
    head.addEventListener('pointermove', function (e) {
      if (!on) return;
      b.style.left = Math.max(0, e.clientX - dx) + 'px';
      b.style.top = Math.max(0, e.clientY - dy) + 'px';
      b.style.right = 'auto';
      b.style.bottom = 'auto';
    });
    head.addEventListener('pointerup', function () { on = false; });

    if (!canRec()) {
      var r = b.querySelector('.qa-rec');
      if (r) { r.disabled = true; r.textContent = '녹화 안 됨 (크롬에서)'; }
    }

    paint();
  }

  function watch() {
    document.addEventListener('click', function (e) {
      var el = e.target.closest('button, a, [onclick], input[type=checkbox], input[type=radio]');
      if (!el || el.closest('#cgQaBox')) return;
      lastHit = label(el) + ' — ' + where(el)
        + (el.getAttribute('onclick') ? ' → ' + el.getAttribute('onclick').slice(0, 60) : '');
      log('click', { target: where(el), label: label(el) });
    }, true);

    document.addEventListener('change', function (e) {
      var el = e.target;
      if (!el || el.closest('#cgQaBox')) return;
      if (!/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) return;

      var v = el.type === 'checkbox' ? (el.checked ? '켬' : '끔') : (el.value || '');
      if (el.type === 'password') v = '(가림)';
      if (/card|카드|cvc|pw|비밀/i.test(el.id + el.name + (el.placeholder || ''))) v = '(가림)';

      log('input', {
        target: where(el),
        label: label(el.previousElementSibling) || el.id,
        value: String(v).slice(0, 60)
      });
    }, true);

    var last = location.href;
    setInterval(function () {
      if (location.href === last) return;
      log('move', { note: page(), target: location.href.slice(0, 120) });
      last = location.href;
    }, 700);

    window.addEventListener('error', function (e) {
      keep('오류', String(e.message).slice(0, 120)
        + ' (' + (e.filename || '').split('/').pop() + ':' + e.lineno + ')');
      log('bug', {
        note: '코드 오류 · ' + String(e.message).slice(0, 80),
        target: (e.filename || '').split('/').pop() + ':' + e.lineno,
        rule: 'R3'
      });
    });

    /* 콘솔에 찍히는 오류도 같이 모읍니다 — 화면에 안 보이는 것이 많습니다 */
    var _ce = console.error;
    console.error = function () {
      try {
        keep('콘솔', Array.prototype.slice.call(arguments)
          .map(function (x) { return (x && x.message) ? x.message : String(x); })
          .join(' ').slice(0, 160));
      } catch (e2) {}
      return _ce.apply(console, arguments);
    };

    var _f = window.fetch;
    window.fetch = function () {
      var url = String(arguments[0] || '');
      return _f.apply(this, arguments).then(function (r) {
        if (!r.ok && url.indexOf('qa_events') < 0) {
          keep('요청실패', r.status + ' ' + url.slice(0, 140));
          log('bug', {
            note: '서버 오류 ' + r.status,
            target: url.split('/').slice(-1)[0].slice(0, 60),
            rule: 'R5'
          });
        }
        return r;
      }, function (err) {
        keep('요청실패', '연결 실패 · ' + url.slice(0, 140));
        throw err;
      });
    };
  }

  function inspect() {
    var out = [];
    var p = page();

    /* R4 · 같은 id */
    var ids = [];
    document.querySelectorAll('[id]').forEach(function (el) { ids.push(el.id); });
    var dup = ids.filter(function (x, i) { return ids.indexOf(x) !== i; });
    if (dup.length) {
      out.push({ rule: 'R4', note: '같은 id · ' + [...new Set(dup)].slice(0, 4).join(', ') });
    }

    /* R1 · 빈 입력칸 */
    var empty = 0;
    document.querySelectorAll('input[type=text], input:not([type])').forEach(function (el) {
      if (el.closest('#cgQaBox')) return;
      if (!el.value && !el.placeholder && el.offsetParent) empty++;
    });
    if (empty > 3) {
      out.push({ rule: 'R1', note: '빈 입력칸 ' + empty + '개 (값이 있어야 하는지 봐주세요)' });
    }

    /* R2 · 주소 찾기 */
    var zip = document.querySelector('[id*=zip i], [id*=Zip]');
    if (zip && zip.offsetParent) {
      if (!/주소.?찾기|우편번호.?찾기/.test(document.body.innerText)) {
        out.push({ rule: 'R2', note: '우편번호 칸이 있는데 주소 찾기가 없습니다' });
      }
      if (!zip.readOnly) out.push({ rule: 'R2', note: '우편번호를 직접 칠 수 있습니다' });
    }

    /* R3 · 없는 함수 */
    var miss = [];
    document.querySelectorAll('[onclick]').forEach(function (el) {
      var m = (el.getAttribute('onclick') || '').match(/^\s*([a-zA-Z_$][\w$]*)\s*\(/);
      if (m && typeof window[m[1]] !== 'function') miss.push(m[1]);
    });
    if (miss.length) {
      out.push({ rule: 'R3', note: '없는 함수 · ' + [...new Set(miss)].slice(0, 4).join(', ') });
    }

    /* R9 · 메뉴 — 서랍까지 봅니다 */
    var showing = function (a) {
      return a && a.offsetParent !== null && getComputedStyle(a).display !== 'none';
    };
    var l = [...document.querySelectorAll('a[href*="login.html"]')].filter(showing);
    var m2 = [...document.querySelectorAll('a[href*="mypage.html"]')].filter(showing);
    if (l.length && m2.length && !/\/(login|join)\.html$/.test(location.pathname)) {
      out.push({ rule: 'R9', note: 'LOGIN 과 MY PAGE 가 함께 보입니다 (' + l.length + '곳)' });
    }

    /* R15 · 글자 크기 */
    var small = 0;
    document.querySelectorAll('input, textarea, select').forEach(function (el) {
      if (el.closest('#cgQaBox')) return;
      var s = parseFloat(getComputedStyle(el).fontSize);
      if (s && s < 16 && innerWidth < 1024) small++;
    });
    if (small) out.push({ rule: 'R15', note: '폰에서 글자가 16px 미만인 칸 ' + small + '개' });

    /* R14 · 링크 */
    var badLink = [];
    document.querySelectorAll('a[href^="http://"]').forEach(function (a) {
      if (a.href.indexOf('w3.org') < 0) badLink.push(a.href.slice(0, 40));
    });
    if (badLink.length) out.push({ rule: 'R14', note: 'http 링크 · ' + badLink[0] });

    out.forEach(function (o) {
      log('bug', { note: o.note, rule: o.rule, target: p });
    });
    return out;
  }

  window.cgQA = {
    on: function () {
      try { localStorage.setItem(ON, '1'); } catch (e) {}
      location.reload();
    },
    off: function () {
      stopRec();
      try { localStorage.removeItem(ON); } catch (e) {}
      var b = box();
      if (b) b.remove();
    },
    check: function () {
      var r = inspect();
      alert(r.length
        ? '찾은 것 ' + r.length + '건\n\n'
          + r.map(function (x) { return '[' + x.rule + '] ' + x.note; }).join('\n')
        : '이 화면은 규칙에 맞습니다.');
      return r;
    },
    record: startRec,
    stop: stopRec,
    log: log,
    run: function () { return run; },
    events: function () { return buf; }
  };

  if (!isOn()) return;
  run = runId();

  function start() {
    build();
    watch();
    /* 켜면 녹화도 같이 시작합니다. 나중에 "그때 뭐 눌렀더라"를 안 물어보려는 것입니다.
       화면 녹화를 지원하지 않는 브라우저면 조용히 넘어갑니다. (issues #7 · 1번) */
    if (canRec()) setTimeout(function () { try { startRec(); } catch (e) {} }, 400);
    setTimeout(inspect, 1500);
    log('move', { note: page() + ' 열림', target: location.href.slice(0, 120) });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else start();
})();
