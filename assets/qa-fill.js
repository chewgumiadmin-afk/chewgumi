/*! ChewGumi QA Autofill v2 · MedIT
 *  화면을 읽고 상황에 맞는 값을 AI가 만들어 채웁니다.
 */
(function () {
  'use strict';
  if (!/[?&]qa=1/.test(location.search)) return;
  if (window.__cgFill) return;
  window.__cgFill = 1;

  var SB = 'https://psynvpuedzjvytsgdhgg.supabase.co';
  var KEY = 'sb_publishable_Tz7vgJXgYHQ3tyUfm87WTw_vV1Dxfuk';
  var page = location.pathname.split('/').pop() || 'index.html';

  /* 입력칸 성격 파악 */
  function guess(el) {
    var s = [
      el.name, el.id, el.placeholder,
      el.getAttribute('aria-label') || '',
      (el.previousElementSibling && el.previousElementSibling.textContent) || '',
      (el.closest('label') && el.closest('label').textContent) || '',
      (el.closest('div') && el.closest('div').querySelector('label')
        && el.closest('div').querySelector('label').textContent) || ''
    ].join(' ').toLowerCase();

    if (el.type === 'email' || /메일|email/.test(s)) return 'email';
    if (el.type === 'tel' || /전화|휴대|연락|phone|tel|hp/.test(s)) return 'phone';
    if (el.type === 'password') return 'pw';
    if (/우편|zip|post/.test(s)) return 'zip';
    if (/상세|나머지|addr2|detail/.test(s)) return 'addr2';
    if (/주소|addr|address/.test(s)) return 'addr1';
    if (/메모|요청|배송.?시|memo|message/.test(s)) return 'memo';
    if (/제목|title|subject|한 줄/.test(s)) return 'title';
    if (/이름|성함|받는|수령|별명|name|닉/.test(s)) return 'name';
    if (el.tagName === 'TEXTAREA') return 'body';
    return '';
  }

  function label(el) {
    var l = el.closest('label');
    if (l) return l.textContent.trim().slice(0, 30);
    var p = el.previousElementSibling;
    if (p && /LABEL|SPAN|DIV/.test(p.tagName)) return p.textContent.trim().slice(0, 30);
    return el.placeholder || el.name || '';
  }

  function setVal(el, v) {
    var proto = el.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
    ['input', 'change', 'blur'].forEach(function (t) {
      el.dispatchEvent(new Event(t, { bubbles: true }));
    });
    el.style.outline = '2px solid #2AA060';
    setTimeout(function () { el.style.outline = ''; }, 1500);
  }

  function targets() {
    var out = [];
    var els = document.querySelectorAll(
      'input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]), textarea');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.closest('.qa-bar, .qa-bg, .cgbot-win')) continue;
      if (el.disabled || el.readOnly || el.offsetParent === null) continue;
      if (el.value && el.value.trim()) continue;
      var g = guess(el);
      if (!g) continue;
      out.push({ el: el, key: 'f' + i, guess: g, label: label(el), type: el.type || 'text' });
    }
    return out;
  }

  /* 화면 맥락 — 제목과 주요 글자 */
  function context() {
    var t = [];
    var h = document.querySelector('h1, h2, .sec-title, .head h1');
    if (h) t.push(h.textContent.trim());
    var p = document.querySelectorAll('h2, .sec-title, legend, .card h2');
    for (var i = 0; i < p.length && i < 6; i++) t.push(p[i].textContent.trim());
    return t.join(' / ').slice(0, 500);
  }

  function toast(t, bad) {
    var d = document.createElement('div');
    d.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:96px;' +
      'z-index:2147483003;padding:13px 22px;border-radius:14px;color:#fff;' +
      'font-size:13.5px;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,.3);' +
      'font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif;' +
      'background:' + (bad ? 'rgba(168,32,66,.95)' : 'rgba(26,110,68,.95)');
    d.textContent = t;
    document.body.appendChild(d);
    setTimeout(function () { d.remove(); }, 2600);
  }

  function checkAgree() {
    var n = 0;
    var cbs = document.querySelectorAll('input[type=checkbox]');
    for (var j = 0; j < cbs.length; j++) {
      var c = cbs[j];
      if (c.closest('.qa-bar, .qa-bg')) continue;
      if (c.offsetParent === null || c.checked) continue;
      var t = ((c.closest('label') || {}).textContent || c.id || '').toLowerCase();
      if (/동의|약관|필수|agree/.test(t)) { c.click(); n++; }
    }
    return n;
  }

  function fill(btn) {
    var fs = targets();
    if (!fs.length) {
      var n0 = checkAgree();
      toast(n0 ? (n0 + '곳을 선택했습니다') : '채울 입력칸이 없습니다', !n0);
      return;
    }
    if (btn) { btn.textContent = '읽는 중…'; btn.disabled = true; }

    fetch(SB + '/functions/v1/qa', {
      method: 'POST',
      headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'autofill',
        page: page,
        title: document.title,
        context: context(),
        fields: fs.map(function (f) {
          return { key: f.key, guess: f.guess, label: f.label, type: f.type };
        })
      })
    }).then(function (r) { return r.json(); })
      .then(function (d) {
        if (btn) { btn.textContent = '값 채우기'; btn.disabled = false; }
        var v = (d && d.values) || {};
        var n = 0;
        fs.forEach(function (f) {
          if (v[f.key]) { setVal(f.el, String(v[f.key])); n++; }
        });
        n += checkAgree();
        toast(n + '곳을 채웠습니다' + (d.by === 'ai' ? '' : ' (기본값)'));
      }).catch(function () {
        if (btn) { btn.textContent = '값 채우기'; btn.disabled = false; }
        toast('값을 만들지 못했습니다', true);
      });
  }

  function clear() {
    var els = document.querySelectorAll('input:not([type=hidden]), textarea');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.closest('.qa-bar, .qa-bg')) continue;
      if (el.type === 'checkbox' || el.type === 'radio') { if (el.checked) el.click(); }
      else if (el.value) setVal(el, '');
    }
    toast('비웠습니다');
  }

  function attach() {
    var bar = document.querySelector('.qa-bar');
    if (!bar) { setTimeout(attach, 400); return; }
    if (bar.querySelector('.qa-fill')) return;
    var b = document.createElement('button');
    b.className = 'qa-fill';
    b.type = 'button';
    b.textContent = '값 채우기';
    b.onclick = function (e) { e.stopPropagation(); fill(b); };
    b.ondblclick = function (e) { e.stopPropagation(); clear(); };
    var ok = bar.querySelector('.qa-ok');
    if (ok) bar.insertBefore(b, ok); else bar.appendChild(b);
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', attach);
  else attach();
  setInterval(attach, 1500);

  window.cgFill = fill;
  window.cgClear = clear;
})();
