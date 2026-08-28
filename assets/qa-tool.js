/*! ChewGumi QA 기록 도구 · MedIT
 *
 *  화면 위에 작은 창을 띄워
 *   · 누른 곳 · 넣은 값 · 옮긴 화면을 기록하고
 *   · 이상한 것을 그 자리에서 적을 수 있게 합니다.
 *
 *  켜는 법
 *    주소 뒤에 ?qa=1 을 붙이거나
 *    개발자 도구에서  cgQA.on()
 *
 *  끄는 법
 *    cgQA.off()
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

  /* ── 켜져 있나 ── */
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

  function page() {
    return (location.pathname.split('/').pop() || 'index.html');
  }

  function label(el) {
    if (!el) return '';
    var t = (el.textContent || '').trim().replace(/\s+/g, ' ');
    if (t && t.length < 40) return t;
    return el.getAttribute('aria-label')
      || el.getAttribute('placeholder')
      || el.getAttribute('title')
      || el.id || el.className || el.tagName;
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

  /* ── 기록 ── */
  function log(kind, o) {
    if (!isOn()) return;
    var row = {
      run_id: run,
      page: page(),
      kind: kind,
      target: (o && o.target) || '',
      label: (o && o.label) || '',
      value: (o && o.value) || '',
      note: (o && o.note) || '',
      rule: (o && o.rule) || '',
      url: location.href.slice(0, 300),
      ua: navigator.userAgent.slice(0, 160)
    };
    buf.push(row);
    paint();

    fetch(SB + '/rest/v1/qa_events', {
      method: 'POST',
      headers: {
        apikey: K, Authorization: 'Bearer ' + K,
        'Content-Type': 'application/json', Prefer: 'return=minimal'
      },
      body: JSON.stringify(row)
    }).catch(function () {});
  }

  /* ── 화면 ── */
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
                     bug: '✕', note: '!', check: '✓' }[r.kind] || '·';
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

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function build() {
    if (box()) return;

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
        + '<div class="qa-list"></div>'
        + '<textarea class="qa-memo" placeholder="이상한 점을 적어주세요"></textarea>'
        + '<div class="qa-b">'
          + '<button class="bug">버그</button>'
          + '<button class="note">메모</button>'
          + '<button class="ok">잘 됨</button>'
        + '</div>'
      + '</div>';
    document.body.appendChild(b);

    b.querySelector('.qa-x').onclick = function () { cgQA.off(); };
    b.querySelector('.qa-min').onclick = function () {
      min = !min;
      b.classList.toggle('mini', min);
    };

    function send(kind) {
      var t = b.querySelector('.qa-memo');
      var v = (t.value || '').trim();
      if (kind !== 'check' && !v) {
        t.focus();
        t.placeholder = '무엇이 이상한지 적어주세요';
        return;
      }
      log(kind, { note: v || '이 화면은 잘 됩니다', target: page() });
      t.value = '';
    }
    b.querySelector('.bug').onclick = function () { send('bug'); };
    b.querySelector('.note').onclick = function () { send('note'); };
    b.querySelector('.ok').onclick = function () { send('check'); };

    /* 드래그로 옮기기 */
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

    paint();
  }

  /* ── 무엇을 잡을까 ── */
  function watch() {
    document.addEventListener('click', function (e) {
      var el = e.target.closest('button, a, [onclick], input[type=checkbox], input[type=radio]');
      if (!el || el.closest('#cgQaBox')) return;
      log('click', { target: where(el), label: label(el) });
    }, true);

    document.addEventListener('change', function (e) {
      var el = e.target;
      if (!el || el.closest('#cgQaBox')) return;
      if (!/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) return;

      var v = el.type === 'checkbox' ? (el.checked ? '켬' : '끔') : (el.value || '');
      /* 비밀번호와 카드번호는 기록하지 않습니다 */
      if (el.type === 'password') v = '(가림)';
      if (/card|카드|cvc|pw|비밀/i.test(el.id + el.name + (el.placeholder || ''))) v = '(가림)';

      log('input', {
        target: where(el),
        label: label(el.previousElementSibling) || el.id,
        value: String(v).slice(0, 60)
      });
    }, true);

    /* 화면 이동 */
    var last = location.href;
    setInterval(function () {
      if (location.href === last) return;
      log('move', { note: page(), target: location.href.slice(0, 120) });
      last = location.href;
    }, 700);

    /* 자바스크립트 오류도 잡습니다 */
    window.addEventListener('error', function (e) {
      log('bug', {
        note: '코드 오류 · ' + String(e.message).slice(0, 80),
        target: (e.filename || '').split('/').pop() + ':' + e.lineno,
        rule: 'R3'
      });
    });

    /* 서버 오류도 */
    var _f = window.fetch;
    window.fetch = function () {
      var url = String(arguments[0] || '');
      return _f.apply(this, arguments).then(function (r) {
        if (!r.ok && url.indexOf('qa_events') < 0) {
          log('bug', {
            note: '서버 오류 ' + r.status,
            target: url.split('/').slice(-1)[0].slice(0, 60),
            rule: 'R5'
          });
        }
        return r;
      });
    };
  }

  /* ── 화면 규칙 검사 ── */
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
      var hasFind = /주소.?찾기|우편번호.?찾기/.test(document.body.innerText);
      if (!hasFind) out.push({ rule: 'R2', note: '우편번호 칸이 있는데 주소 찾기가 없습니다' });
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

    /* R9 · 메뉴 */
    var hasLogin = !!document.querySelector('a[href*="login.html"]:not([style*="none"])');
    var hasMy = !!document.querySelector('a[href*="mypage.html"]:not([style*="none"])');
    if (hasLogin && hasMy) {
      out.push({ rule: 'R9', note: 'LOGIN 과 MY PAGE 가 함께 보입니다' });
    }

    /* R15 · 글자 크기 */
    var small = 0;
    document.querySelectorAll('input, textarea, select').forEach(function (el) {
      if (el.closest('#cgQaBox')) return;
      var s = parseFloat(getComputedStyle(el).fontSize);
      if (s && s < 16 && innerWidth < 1024) small++;
    });
    if (small) {
      out.push({ rule: 'R15', note: '폰에서 글자가 16px 미만인 칸 ' + small + '개' });
    }

    /* R14 · 링크 */
    var badLink = [];
    document.querySelectorAll('a[href^="http://"]').forEach(function (a) {
      if (a.href.indexOf('w3.org') < 0) badLink.push(a.href.slice(0, 40));
    });
    if (badLink.length) {
      out.push({ rule: 'R14', note: 'http 링크 · ' + badLink[0] });
    }

    out.forEach(function (o) {
      log('bug', { note: o.note, rule: o.rule, target: p });
    });

    return out;
  }

  /* ── 밖에서 쓰는 것 ── */
  window.cgQA = {
    on: function () {
      try { localStorage.setItem(ON, '1'); } catch (e) {}
      location.reload();
    },
    off: function () {
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
    log: log,
    run: function () { return run; },
    events: function () { return buf; }
  };

  /* ── 시작 ── */
  if (!isOn()) return;
  run = runId();

  function start() {
    build();
    watch();
    setTimeout(inspect, 1500);
    log('move', { note: page() + ' 열림', target: location.href.slice(0, 120) });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else start();
})();
