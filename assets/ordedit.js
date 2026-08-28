/*! ChewGumi 주문 수정 · MedIT
 *  수량을 바꾸면 기존 결제를 취소하고 새 금액으로 다시 결제합니다.
 *  발송 후에는 반품 규정을 안내합니다.
 */
(function () {
  'use strict';
  if (window.cgOrdEdit) return;
  window.cgOrdEdit = 1;

  var SB = 'https://psynvpuedzjvytsgdhgg.supabase.co';
  var K = 'sb_publishable_Tz7vgJXgYHQ3tyUfm87WTw_vV1Dxfuk';

  var ITEMS = [], WAS = [], BASE = 0, NO = '', KEY = '';
  var SHIP = 2500, FREE = 30000;

  function tok() { return (window.cgTok ? cgTok() : ''); }
  function H() {
    return {
      apikey: K,
      Authorization: 'Bearer ' + (tok() || K),
      'Content-Type': 'application/json'
    };
  }
  function w(n) { return Number(n || 0).toLocaleString('ko-KR'); }
  function e(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function rpc(fn, body) {
    return fetch(SB + '/rest/v1/rpc/' + fn, {
      method: 'POST', headers: H(), body: JSON.stringify(body)
    }).then(function (r) { return r.ok ? r.json() : null; });
  }

  /* 금액 다시 세기 */
  function recount() {
    var goods = 0;
    ITEMS.forEach(function (it) { goods += Number(it.price || 0) * Number(it.qty || 0); });
    var ship = (goods === 0 || goods >= FREE) ? 0 : SHIP;
    var box = document.getElementById('oeSum');
    if (!box) return;
    var total = goods + ship, diff = total - BASE;

    box.innerHTML =
      '<div class="oe-row"><span>상품 금액</span><b>' + w(goods) + '원</b></div>'
      + '<div class="oe-row"><span>배송비</span><b>'
        + (ship ? w(ship) + '원' : '무료') + '</b></div>'
      + '<div class="oe-row total"><span>바뀐 결제 금액</span><b>' + w(total) + '원</b></div>'
      + (diff > 0
          ? '<div class="oe-note up"><b>추가 결제 ' + w(diff) + '원</b>'
            + '<span>기존 ' + w(BASE) + '원을 취소하고 '
            + w(total) + '원으로 다시 결제합니다</span></div>'
          : diff < 0
          ? '<div class="oe-note down"><b>' + w(-diff) + '원 환불</b>'
            + '<span>바로 환불해 드립니다</span></div>'
          : '')
      + (goods === 0
          ? '<div class="oe-note up"><b>주문이 취소됩니다</b>'
            + '<span>상품이 하나도 없습니다</span></div>' : '');
  }


  /* 우편번호 찾기 */
  window.oeFindAddr = function () {
    function go() {
      new daum.Postcode({
        oncomplete: function (d) {
          var addr = d.roadAddress || d.jibunAddress || '';
          if (d.buildingName) addr += ' (' + d.buildingName + ')';
          var z = document.getElementById('oeZip');
          var a = document.getElementById('oeA1');
          var a2 = document.getElementById('oeA2');
          if (z) z.value = d.zonecode || '';
          if (a) a.value = addr;
          if (a2) a2.focus();
        }
      }).open();
    }
    if (window.daum && daum.Postcode) { go(); return; }
    var s = document.createElement('script');
    s.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    s.onload = go;
    s.onerror = function () { alert('주소 찾기를 열지 못했습니다.'); };
    document.head.appendChild(s);
  };

  window.oeQty = function (i, d) {
    var it = ITEMS[i];
    if (!it) return;
    var q = Number(it.qty || 0) + d;
    if (q < 0) q = 0;
    if (q > 99) q = 99;
    it.qty = q;
    var el = document.getElementById('oeQ' + i);
    if (el) el.textContent = q;
    var row = document.getElementById('oeR' + i);
    if (row) row.classList.toggle('zero', q === 0);
    recount();
  };

  /* 여는 곳 */
  window.cgEditOrder = function (orderNo, key) {
    NO = orderNo;
    KEY = key || '';

    rpc('order_can', { p_no: NO, p_key: KEY }).then(function (can) {
      if (!can || !can.ok) { alert((can && can.msg) || '주문을 찾지 못했습니다.'); return; }

      if (!can.can_edit) {
        if (can.can_return) {
          alert(can.why + '\n\n'
            + '반품을 원하시면 아래로 연락 주세요.\n'
            + 'chewgumi24@gmail.com\n\n'
            + '· 미개봉 상태여야 합니다\n'
            + '· 단순 변심은 왕복 배송비를 부담하셔야 합니다');
        } else {
          alert(can.why || '바꿀 수 없는 주문입니다.');
        }
        return;
      }

      return rpc('guest_items', { p_no: NO, p_key: KEY }).then(function (d) {
        if (!d || !d.ok) { alert((d && d.msg) || '불러오지 못했습니다.'); return; }
        return rpc('guest_order', { p_no: NO, p_key: KEY }).then(function (od) {
          var o = (od && od.order) || {};
          open(d.items || [], o, can);
        });
      });
    })
    .catch(function () { alert('불러오지 못했습니다.'); });
  };

  function open(items, o, can) {
    ITEMS = items.map(function (x) {
      return { id: x.id, name: x.name, qty: Number(x.qty || 0), price: Number(x.price || 0) };
    });
    WAS = items.map(function (x) { return { id: x.id, qty: Number(x.qty || 0) }; });
    BASE = Number(can.amount || 0);

    var old = document.getElementById('oeDim');
    if (old) old.remove();

    var dim = document.createElement('div');
    dim.id = 'oeDim';
    dim.className = 'oe-dim';
    dim.innerHTML =
      '<div class="oe"><h3>주문 수정</h3>'
      + '<p class="oe-t">발송 전까지 바꾸실 수 있습니다.</p>'
      + '<div class="oe-sec">주문 상품</div>'
      + (ITEMS.length ? ITEMS.map(function (it, i) {
          return '<div class="oe-it" id="oeR' + i + '">'
            + '<div class="oe-n"><b>' + e(it.name) + '</b>'
            + '<span>' + w(it.price) + '원</span></div>'
            + '<div class="oe-q">'
              + '<button type="button" onclick="oeQty(' + i + ',-1)">−</button>'
              + '<em id="oeQ' + i + '">' + it.qty + '</em>'
              + '<button type="button" onclick="oeQty(' + i + ',1)">+</button>'
            + '</div></div>';
        }).join('') : '<p class="oe-empty">상품 정보가 없습니다</p>')
      + '<div class="oe-sum" id="oeSum"></div>'
      + '<div class="oe-sec">받는 곳</div>'
      + '<label>받는 분</label><input id="oeName" value="' + e(o.buyer_name || '') + '">'
      + '<label>연락처</label><input id="oePhone" value="'
        + e(o.phone_mask || o.buyer_phone || '') + '" placeholder="010-0000-0000">'
      + '<label>우편번호</label>'
      + '<div class="oe-zip">'
        + '<input id="oeZip" value="' + e(o.zipcode || '') + '" inputmode="numeric" readonly>'
        + '<button type="button" onclick="oeFindAddr()">주소 찾기</button>'
      + '</div>'
      + '<label>주소</label><input id="oeA1" value="' + e(o.addr1 || '') + '" readonly>'
      + '<label>상세주소</label><input id="oeA2" value="' + e(o.addr2 || '') + '">'
      + '<label>배송 요청사항</label><input id="oeMemo" value="' + e(o.memo || '') + '" '
        + 'placeholder="문 앞에 놓아주세요">'
      + '<div class="oe-b"><button class="ok" id="oeOk">저장</button>'
      + '<button class="no" id="oeNo">그만두기</button></div>'
      + '<div class="oe-m" id="oeM"></div></div>';
    document.body.appendChild(dim);

    recount();
    document.getElementById('oeNo').onclick = function () { dim.remove(); };
    dim.onclick = function (ev) { if (ev.target === dim) dim.remove(); };
    document.getElementById('oeOk').onclick = function () { save(dim); };
  }

  function say(t, k) {
    var m = document.getElementById('oeM');
    if (!m) return;
    m.className = 'oe-m' + (k ? ' ' + k : '');
    m.textContent = t;
  }

  function save(dim) {
    say('저장하는 중…');
    var btn = document.getElementById('oeOk');
    if (btn) btn.disabled = true;

    /* 배송지가 실제로 바뀌었나 */
    var addr = {
      p_name: document.getElementById('oeName').value.trim(),
      p_phone: (function () {
        var v = document.getElementById('oePhone').value.trim();
        return v.indexOf('*') < 0 ? v : '';
      })(),
      p_zip: document.getElementById('oeZip').value.trim(),
      p_addr1: document.getElementById('oeA1').value.trim(),
      p_addr2: document.getElementById('oeA2').value.trim(),
      p_memo: document.getElementById('oeMemo').value.trim()
    };

    /* 수량이 바뀐 것 */
    var changed = ITEMS.filter(function (it) {
      var o = WAS.find(function (x) { return x.id === it.id; });
      return o && o.qty !== it.qty;
    });

    var jobs = [];
    var addrChanged = window._oeAddrWas
      ? JSON.stringify(addr) !== window._oeAddrWas : true;

    if (addrChanged) {
      jobs.push(rpc('guest_edit_addr',
        Object.assign({ p_no: NO, p_key: KEY }, addr)));
    }

    if (!changed.length) {
      if (!jobs.length) {
        say('바뀐 것이 없습니다.', 'bad');
        if (btn) btn.disabled = false;
        return;
      }
      Promise.all(jobs).then(function (rs) {
        var bad = rs.filter(function (x) { return !x || !x.ok; });
        if (btn) btn.disabled = false;
        if (bad.length) { say((bad[0] && bad[0].msg) || '저장하지 못했습니다.', 'bad'); return; }
        say('배송지를 바꿨습니다.', 'ok');
        setTimeout(function () { dim.remove(); reload(); }, 800);
      });
      return;
    }

    /* 수량은 하나만 (여러 개면 첫 번째) */
    var it = changed[0];

    Promise.all(jobs).then(function () {
      return rpc('order_repay_prepare', {
        p_no: NO, p_key: KEY, p_item_id: it.id, p_qty: it.qty
      });
    })
    .then(function (p) {
      if (btn) btn.disabled = false;
      if (!p || !p.ok) { say((p && p.msg) || '바꾸지 못했습니다.', 'bad'); return; }

      say('결제를 정리하는 중…');
      return fetch(SB + '/functions/v1/order-change', {
        method: 'POST', headers: H(),
        body: JSON.stringify({
          action: 'start',
          change_id: p.change_id,
          item_id: it.id,
          qty: it.qty,
          goods_name: p.name,
          mobile: /Mobi|Android|iPhone/i.test(navigator.userAgent)
        })
      }).then(function (r) { return r.json(); });
    })
    .then(function (r) {
      if (!r) return;
      if (!r.ok) { say(r.error || '처리하지 못했습니다.', 'bad'); return; }

      if (r.need_pay && r.authPageUrl) {
        say(r.msg, 'ok');
        try {
          sessionStorage.setItem('cg_repay', JSON.stringify({
            change_id: r.change_id, item_id: it.id, qty: it.qty, no: NO
          }));
        } catch (x) {}
        setTimeout(function () { location.href = r.authPageUrl; }, 1200);
        return;
      }

      say(r.msg || '바꿨습니다.', 'ok');
      setTimeout(function () { dim.remove(); reload(); }, 1000);
    })
    .catch(function () {
      if (btn) btn.disabled = false;
      say('처리하지 못했습니다.', 'bad');
    });
  }

  function reload() {
    if (typeof window.find === 'function') { window.find(); return; }
    if (typeof window.loadOrders === 'function') { window.loadOrders(); return; }
    location.reload();
  }

  /* 재결제하고 돌아왔을 때 마무리 */
  (function () {
    var q = new URLSearchParams(location.search);
    if (q.get('ok') !== '1') return;
    var s = null;
    try { s = JSON.parse(sessionStorage.getItem('cg_repay') || 'null'); } catch (x) {}
    if (!s) return;
    try { sessionStorage.removeItem('cg_repay'); } catch (x) {}

    fetch(SB + '/functions/v1/order-change', {
      method: 'POST', headers: H(),
      body: JSON.stringify({
        action: 'finish', change_id: s.change_id,
        item_id: s.item_id, qty: s.qty
      })
    })
    .then(function (r) { return r.json(); })
    .then(function (d) { if (d && d.msg) alert(d.msg); })
    .catch(function () {});
  })();
})();
