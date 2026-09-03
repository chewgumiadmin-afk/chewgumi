/* ══════════════════════════════════════════════
   주문 하나에서 손님이 할 수 있는 일 (한 곳에서 정합니다)

   마이페이지와 비회원 주문조회가 각각 다른 단추를 달고 있어서
   같은 상태인데 화면에 따라 할 수 있는 일이 달랐습니다.

     상태          할 수 있는 일
     ─────────────────────────────────────────
     미결제        이어서 결제 · 주문수정 · 주문취소
     결제완료      주문수정 · 취소요청
     배송준비      주문수정 · 취소요청
     배송중        배송조회 · 반품·교환 신청
     배송완료      배송조회 · 반품·교환 신청
     취소/환불     (없음)

   '배송중인데 취소'는 막고 반품으로 안내하는데, 그동안 반품을
   신청할 화면이 없어서 안내가 막다른 길이었습니다. (전자상거래법 제17조)
   ══════════════════════════════════════════════ */
(function () {
  'use strict';

  var SB = 'https://psynvpuedzjvytsgdhgg.supabase.co';
  var KEY = 'sb_publishable_Tz7vgJXgYHQ3tyUfm87WTw_vV1Dxfuk';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function token() {
    try {
      var s = JSON.parse(localStorage.getItem('cg_sb') || 'null');
      if (!s || !s.t) return '';
      var ex = s.exp ? s.exp * 1000 : (s.e || 0);
      if (ex && Date.now() > ex) return '';
      return s.t;
    } catch (e) { return ''; }
  }

  function headers() {
    var t = token();
    return {
      apikey: KEY,
      Authorization: 'Bearer ' + (t || KEY),
      'Content-Type': 'application/json'
    };
  }

  /* ── 주문 하나에 붙일 단추들 ────────────────── */
  function acts(o, opt) {
    opt = opt || {};
    var st = o.status || '';
    var no = o.order_no || '';
    var h = '';

    /* 미결제 — 이어서 결제 (무통장은 계좌 안내라 제외) */
    if (st === 'pending' && (o.pay_method || o.pay_type) !== 'bank') {
      h += '<a class="oa-go" href="checkout.html?resume=' + encodeURIComponent(no) + '">'
        +  '이어서 결제하기</a>';
    }

    /* 발송 전 — 수정 · 취소 */
    if (['pending', 'paid', 'preparing'].indexOf(st) > -1 && opt.edit !== false) {
      h += '<button type="button" class="oa" data-no="' + esc(no) + '"'
        +  ' onclick="cgOA.edit(this)">주문 수정</button>'
        +  '<button type="button" class="oa warn" data-no="' + esc(no) + '"'
        +  ' onclick="cgOA.cancel(this)">주문 취소</button>';
    }

    /* 발송 후 — 배송조회 · 반품·교환 */
    if (['shipping', 'delivered'].indexOf(st) > -1) {
      if (o.tracking_no) {
        h += '<a class="oa-go" href="tracking.html?no=' + encodeURIComponent(o.tracking_no)
          +  '">배송 조회 →</a>';
      }
      if (o.return_req_at) {
        h += '<span class="oa-done">'
          +  (o.return_req_kind === 'exchange' ? '교환' : '반품')
          +  ' 신청 접수됨</span>';
      } else {
        h += '<button type="button" class="oa warn" data-no="' + esc(no) + '"'
          +  ' onclick="cgOA.ret(this)">반품 · 교환 신청</button>';
      }
    }

    return h ? '<div class="oa-row">' + h + '</div>' : '';
  }

  /* ── 반품 · 교환 신청 ───────────────────────── */
  function ret(el) {
    var no = (el && el.dataset && el.dataset.no) || '';
    if (!no) { alert('주문번호를 찾지 못했습니다.'); return; }

    var kind = confirm(
      '무엇을 도와드릴까요?\n\n'
      + '[확인] 반품 (물건을 돌려보내고 환불)\n'
      + '[취소] 교환 (다른 것으로 바꾸기)'
    ) ? 'return' : 'exchange';

    var name = kind === 'exchange' ? '교환' : '반품';
    var why = prompt(
      name + ' 사유를 적어주세요.\n\n'
      + '· 단순 변심은 받으신 날부터 7일 안에 신청하실 수 있습니다\n'
      + '· 물건에 문제가 있으면 왕복 배송비를 저희가 부담합니다',
      '단순 변심'
    );
    if (why === null) return;

    var key = (window.cgOAKey && window.cgOAKey()) || '';

    if (el.tagName === 'BUTTON') { el.disabled = true; el.textContent = '신청 중…'; }

    fetch(SB + '/rest/v1/rpc/return_request', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ p_no: no, p_key: key, p_kind: kind, p_reason: why })
    })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (!d || !d.ok) {
        alert((d && d.msg) || '신청하지 못했습니다. 고객센터로 연락 주세요.');
        if (el.tagName === 'BUTTON') { el.disabled = false; el.textContent = '반품 · 교환 신청'; }
        return;
      }
      alert(d.msg + '\n\n주문번호 ' + no);
      if (typeof window.cgOAReload === 'function') window.cgOAReload();
      else location.reload();
    })
    .catch(function () {
      alert('신청하지 못했습니다. 고객센터로 연락 주세요.');
      if (el.tagName === 'BUTTON') { el.disabled = false; el.textContent = '반품 · 교환 신청'; }
    });
  }

  /* 수정·취소는 화면마다 이미 있는 것을 씁니다 */
  function edit(el) {
    var no = (el && el.dataset && el.dataset.no) || '';
    if (!no) return alert('주문번호를 찾지 못했습니다.');
    if (typeof window.cgEditOrder === 'function') return window.cgEditOrder(no, '');
    if (typeof window.cgOpenEdit === 'function') return window.cgOpenEdit();
    alert('주문 수정을 열 수 없습니다. 고객센터로 연락 주세요.');
  }

  function cancel(el) {
    var no = (el && el.dataset && el.dataset.no) || '';
    if (!no) return alert('주문번호를 찾지 못했습니다.');
    if (typeof window.myCancel === 'function') return window.myCancel(no);
    if (typeof window.cancelOrder === 'function') return window.cancelOrder();
    alert('주문 취소를 열 수 없습니다. 고객센터로 연락 주세요.');
  }

  window.cgOA = { acts: acts, ret: ret, edit: edit, cancel: cancel };

  /* 단추 모양 */
  var css = document.createElement('style');
  css.textContent =
    '.oa-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:11px}' +
    '.oa,.oa-go{min-height:44px;padding:11px 16px;border-radius:999px;font-size:12.5px;' +
      'font-weight:700;font-family:inherit;cursor:pointer;display:inline-flex;' +
      'align-items:center;justify-content:center;border:1px solid rgba(0,0,0,.1);' +
      'background:rgba(255,255,255,.9);color:#1a1a1a;text-decoration:none}' +
    '.oa-go{background:linear-gradient(135deg,#E95073,#D82558);color:#fff;border-color:transparent;' +
      'box-shadow:0 6px 16px rgba(216,37,88,.24)}' +
    '.oa.warn{color:#C0395C;border-color:rgba(192,57,92,.3)}' +
    '.oa:disabled{opacity:.5;cursor:default}' +
    '.oa-done{display:inline-flex;align-items:center;min-height:44px;padding:0 14px;' +
      'font-size:12.5px;font-weight:700;color:#1F9D6B}';
  document.head.appendChild(css);
})();
