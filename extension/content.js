/* 츄구미 QA 기록 · 화면에서 잡는 것 · MedIT */
(function () {
  'use strict';
  if (window.__cgqa) return;
  window.__cgqa = 1;

  let ON = false;

  function page() {
    return (location.pathname.split('/').pop() || 'index.html');
  }

  function label(el) {
    if (!el) return '';
    const t = (el.textContent || '').trim().replace(/\s+/g, ' ');
    if (t && t.length < 40) return t;
    return el.getAttribute('aria-label') || el.getAttribute('placeholder')
      || el.getAttribute('title') || el.id || el.className || el.tagName;
  }

  function where(el) {
    if (!el) return '';
    if (el.id) return '#' + el.id;
    let t = el.tagName.toLowerCase();
    if (el.className && typeof el.className === 'string') {
      t += '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.');
    }
    return t;
  }

  function log(kind, o = {}) {
    if (!ON) return;
    chrome.runtime.sendMessage({
      type: 'log',
      kind,
      page: page(),
      target: o.target || '',
      label: o.label || '',
      value: o.value || '',
      note: o.note || '',
      rule: o.rule || '',
      url: location.href,
      ua: navigator.userAgent
    }).catch(() => {});
  }

  /* ── 잡는 것들 ── */
  document.addEventListener('click', e => {
    const el = e.target.closest('button, a, [onclick], input[type=checkbox], input[type=radio], label');
    if (!el) return;
    log('click', { target: where(el), label: label(el) });
  }, true);

  document.addEventListener('change', e => {
    const el = e.target;
    if (!/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) return;

    let v = el.type === 'checkbox' ? (el.checked ? '켬' : '끔') : (el.value || '');
    /* 비밀번호·카드번호는 절대 기록하지 않습니다 */
    if (el.type === 'password') v = '(가림)';
    if (/card|카드|cvc|cvv|pw|비밀|expir|유효/i.test(
        (el.id || '') + (el.name || '') + (el.placeholder || ''))) v = '(가림)';
    if (/^\d{12,19}$/.test(String(v).replace(/\D/g, ''))) v = '(가림)';

    log('input', {
      target: where(el),
      label: label(el.previousElementSibling) || el.id,
      value: String(v).slice(0, 60)
    });
  }, true);

  /* 화면 이동 */
  let last = location.href;
  setInterval(() => {
    if (location.href === last) return;
    log('move', { note: page(), target: location.href.slice(0, 120) });
    last = location.href;
  }, 700);

  /* 자바스크립트 오류 */
  window.addEventListener('error', e => {
    log('bug', {
      note: '코드 오류 · ' + String(e.message).slice(0, 80),
      target: (e.filename || '').split('/').pop() + ':' + e.lineno,
      rule: 'R3'
    });
  });

  window.addEventListener('unhandledrejection', e => {
    log('bug', {
      note: '처리 안 된 오류 · ' + String(e.reason).slice(0, 80),
      rule: 'R3'
    });
  });

  /* ── 규칙 검사 ── */
  function inspect() {
    if (!ON) return [];
    const out = [];
    const showing = el =>
      el && el.offsetParent !== null && getComputedStyle(el).display !== 'none';

    /* R4 · 같은 id */
    const ids = [...document.querySelectorAll('[id]')].map(e => e.id);
    const dup = [...new Set(ids.filter((x, i) => ids.indexOf(x) !== i))];
    if (dup.length) out.push({ rule: 'R4', note: '같은 id · ' + dup.slice(0, 4).join(', ') });

    /* R1 · 빈 입력칸 */
    const empty = [...document.querySelectorAll('input[type=text], input:not([type])')]
      .filter(el => showing(el) && !el.value && !el.placeholder).length;
    if (empty > 3) out.push({ rule: 'R1', note: '빈 입력칸 ' + empty + '개' });

    /* R2 · 주소 찾기 */
    const zip = document.querySelector('[id*=zip i], [id*=Zip], [name*=zip i]');
    if (showing(zip)) {
      if (!/주소.?찾기|우편번호.?찾기/.test(document.body.innerText)) {
        out.push({ rule: 'R2', note: '우편번호 칸이 있는데 주소 찾기가 없습니다' });
      }
      if (!zip.readOnly) out.push({ rule: 'R2', note: '우편번호를 직접 칠 수 있습니다' });
    }

    /* R9 · 메뉴 */
    const l = [...document.querySelectorAll('a[href*="login.html"]')].filter(showing);
    const m = [...document.querySelectorAll('a[href*="mypage.html"]')].filter(showing);
    if (l.length && m.length && !/\/(login|join)\.html$/.test(location.pathname)) {
      out.push({ rule: 'R9', note: 'LOGIN 과 MY PAGE 가 함께 보입니다 (' + l.length + '곳)' });
    }

    /* R15 · 글자 크기 */
    const small = [...document.querySelectorAll('input, textarea, select')]
      .filter(el => {
        const s = parseFloat(getComputedStyle(el).fontSize);
        return s && s < 16 && innerWidth < 1024;
      }).length;
    if (small) out.push({ rule: 'R15', note: '폰에서 글자가 16px 미만인 칸 ' + small + '개' });

    /* R14 · http 링크 */
    const bad = [...document.querySelectorAll('a[href^="http://"]')]
      .filter(a => a.href.indexOf('w3.org') < 0);
    if (bad.length) out.push({ rule: 'R14', note: 'http 링크 · ' + bad[0].href.slice(0, 44) });

    out.forEach(o => log('bug', o));
    return out;
  }

  /* ── 켜고 끄기 ── */
  chrome.runtime.onMessage.addListener((msg, s, reply) => {
    if (msg.type === 'qa') {
      ON = !!msg.on;
      if (ON) {
        log('move', { note: page() + ' 열림', target: location.href.slice(0, 120) });
        setTimeout(inspect, 1200);
      }
      reply({ ok: true });
    }
    if (msg.type === 'check') {
      reply({ found: inspect() });
    }
    return true;
  });

  /* 시작할 때 상태를 물어봅니다 */
  chrome.runtime.sendMessage({ type: 'state' }).then(s => {
    ON = !!(s && s.on);
    if (ON) {
      log('move', { note: page() + ' 열림', target: location.href.slice(0, 120) });
      setTimeout(inspect, 1200);
    }
  }).catch(() => {});
})();
