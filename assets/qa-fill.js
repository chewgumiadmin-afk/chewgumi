/*! ChewGumi QA Autofill · MedIT
 *  ?qa=1 화면에서 [값 채우기] 로 테스트용 값을 자동 입력합니다.
 *  실제 주문이 들어가므로 관리자 화면에서 확인 후 정리해 주세요.
 */
(function () {
  'use strict';
  if (!/[?&]qa=1/.test(location.search)) return;
  if (window.__cgFill) return;
  window.__cgFill = 1;

  /* 테스트 값 — 실제와 구분되도록 [테스트] 표시 */
  var stamp = new Date().toISOString().slice(5, 16).replace(/[-T:]/g, '');
  var V = {
    name: '테스트' + stamp.slice(-4),
    phone: '010-8497-9634',
    email: 'chewgumi24@gmail.com',
    zip: '04309',
    addr1: '서울 용산구 청파로47길 46',
    addr2: '205호',
    memo: '[테스트 주문] 확인 후 취소해 주세요',
    pw: 'Chewgumi!2026',
    title: '[테스트] 점검용 문의입니다',
    body: '점검 중 자동으로 작성된 글입니다. 확인 후 삭제해 주세요.'
  };

  /* 입력칸 성격 파악 */
  function guess(el) {
    var s = [
      el.name, el.id, el.placeholder,
      el.getAttribute('aria-label') || '',
      (el.previousElementSibling && el.previousElementSibling.textContent) || '',
      (el.closest('label') && el.closest('label').textContent) || ''
    ].join(' ').toLowerCase();

    if (el.type === 'email' || /메일|email/.test(s)) return 'email';
    if (el.type === 'tel' || /전화|휴대|연락|phone|tel|hp/.test(s)) return 'phone';
    if (el.type === 'password') return 'pw';
    if (/우편|zip|post/.test(s)) return 'zip';
    if (/상세|나머지|addr2|detail/.test(s)) return 'addr2';
    if (/주소|addr|address/.test(s)) return 'addr1';
    if (/메모|요청|배송.?시|memo|message/.test(s)) return 'memo';
    if (/제목|title|subject/.test(s)) return 'title';
    if (/이름|성함|받는|수령|name|받으실/.test(s)) return 'name';
    if (el.tagName === 'TEXTAREA') return 'body';
    return '';
  }

  function setVal(el, v) {
    var proto = el.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    var setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(el, v);
    ['input', 'change', 'blur'].forEach(function (t) {
      el.dispatchEvent(new Event(t, { bubbles: true }));
    });
    el.style.outline = '2px solid #2AA060';
    setTimeout(function () { el.style.outline = ''; }, 1400);
  }

  function fill() {
    var n = 0;
    var els = document.querySelectorAll(
      'input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]), textarea');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.closest('.qa-bar, .qa-bg, .cgbot-win')) continue;
      if (el.disabled || el.readOnly) continue;
      if (el.offsetParent === null) continue;   /* 화면에 안 보이는 것 제외 */
      if (el.value && el.value.trim()) continue;
      var k = guess(el);
      if (!k) continue;
      setVal(el, V[k]);
      n++;
    }
    /* 동의 체크박스도 함께 */
    var cbs = document.querySelectorAll('input[type=checkbox]');
    for (var j = 0; j < cbs.length; j++) {
      var c = cbs[j];
      if (c.closest('.qa-bar, .qa-bg')) continue;
      if (c.offsetParent === null || c.checked) continue;
      var t = ((c.closest('label') || {}).textContent || c.id || '').toLowerCase();
      if (/동의|약관|필수|agree/.test(t)) {
        c.click(); n++;
      }
    }
    return n;
  }

  function clear() {
    var els = document.querySelectorAll('input:not([type=hidden]), textarea');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.closest('.qa-bar, .qa-bg')) continue;
      if (el.type === 'checkbox' || el.type === 'radio') { if (el.checked) el.click(); }
      else if (el.value) setVal(el, '');
    }
  }

  function toast(t) {
    var d = document.createElement('div');
    d.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:96px;' +
      'z-index:2147483003;padding:13px 22px;border-radius:14px;background:rgba(26,110,68,.95);' +
      'color:#fff;font-size:13.5px;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,.3);' +
      'font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif';
    d.textContent = t;
    document.body.appendChild(d);
    setTimeout(function () { d.remove(); }, 2600);
  }

  /* 점검 막대에 버튼 붙이기 */
  function attach() {
    var bar = document.querySelector('.qa-bar');
    if (!bar) { setTimeout(attach, 400); return; }
    if (bar.querySelector('.qa-fill')) return;

    var b = document.createElement('button');
    b.className = 'qa-fill';
    b.type = 'button';
    b.textContent = '값 채우기';
    b.onclick = function (e) {
      e.stopPropagation();
      var n = fill();
      toast(n ? (n + '곳을 채웠습니다') : '채울 입력칸이 없습니다');
    };
    b.ondblclick = function (e) { e.stopPropagation(); clear(); toast('비웠습니다'); };
    bar.insertBefore(b, bar.querySelector('.qa-ok'));
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', attach);
  else attach();
  setTimeout(attach, 900);

  window.cgFill = fill;
  window.cgClear = clear;
})();
