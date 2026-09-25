/*! 말로 주문 처리하기 — 공용 · MedIT
 *
 *  왜 빼냈나
 *  --------
 *  orders.html 안에만 있던 기능입니다. 대표님이 보시는 console.html 에는
 *  묻고 답하기(admin-chat)만 있어 「발송 3건」을 보고도 그 자리에서 처리할 수
 *  없었습니다. 같은 것을 두 벌 적지 않으려고 한 파일로 모읍니다.
 *
 *  무엇을 하나
 *  ----------
 *    묻기(ask)  order-bot 이 할 일 목록(jobs)을 돌려줍니다 — 아직 아무것도 안 바뀝니다
 *    보여주기   무엇이 어떻게 바뀌는지 + 그 판단의 근거가 된 주문 표
 *    처리(run)  사람이 단추를 눌러야 그때 바뀝니다
 *
 *  근거 표가 핵심입니다. 봇의 말이 아니라 주문 자료를 그대로 옮겨 놓아,
 *  누르기 전에 주문번호별로 대조할 수 있게 합니다.
 *
 *  쓰는 법
 *  ------
 *    <link rel="stylesheet" href="assets/order-assist.css">
 *    <script src="assets/tok.js"></script>
 *    <script src="assets/order-assist.js"></script>
 *    <div id="oa"></div>
 *    <script>cgOrderAssist({ mount:'oa' });</script>
 *
 *  고르는 값 (모두 없어도 됩니다)
 *    mount       칸을 그릴 자리 — id 글자 또는 요소
 *    lookup(no)  이 화면이 이미 받아 둔 주문을 돌려주는 함수.
 *                없으면 필요한 주문번호만 따로 받아 옵니다.
 *    statusName  상태값을 한글로 (기본 표 내장)
 *    onDone()    처리가 끝난 뒤 — 목록 새로 고침 등
 *    presets     [[단추글자, 넣을 문장], …]
 *    placeholder 입력칸 안내 문구
 *    hint        아래 안내 글 (HTML)
 */
(function () {
  'use strict';
  if (window.cgOrderAssist) return;

  var SB = 'https://psynvpuedzjvytsgdhgg.supabase.co';
  var KEY = 'sb_publishable_Tz7vgJXgYHQ3tyUfm87WTw_vV1Dxfuk';

  var ST = {
    pending: '미결제', paid: '결제완료', preparing: '배송준비', shipping: '배송중',
    delivered: '배송완료', cancelled: '취소', refunded: '환불'
  };

  var NO_RE = /\d{8}-\d{6}/g;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function won(n) { return Number(n || 0).toLocaleString('ko-KR'); }

  /* 만료된 토큰으로 조르지 않습니다 — tok.js 가 있으면 그쪽이 판단합니다 */
  function tok() {
    if (window.cgTok) return cgTok() || '';
    try {
      var s = JSON.parse(localStorage.getItem('cg_sb') || 'null');
      if (!s || !s.t) return '';
      var ex = s.exp ? s.exp * 1000 : (s.e || 0);
      if (ex && Date.now() > ex) return '';
      return s.t;
    } catch (e) { return ''; }
  }

  function headers() {
    return {
      apikey: KEY,
      Authorization: 'Bearer ' + tok(),
      'Content-Type': 'application/json'
    };
  }

  /* 근거로 쓸 주문을 따로 받아 옵니다 (lookup 이 없는 화면용).
     주문 전체가 아니라 답에 나온 번호만 받습니다. */
  var REF_COLS = 'order_no,buyer_name,status,pay_amount,refund_amount,'
    + 'courier,tracking_no,created_at,order_items(product_name,qty)';

  function fetchOrders(nos) {
    if (!nos.length) return Promise.resolve({});
    var q = nos.map(function (n) { return '"' + n + '"'; }).join(',');
    return fetch(SB + '/rest/v1/orders?select=' + REF_COLS
      + '&order_no=in.(' + encodeURIComponent(q) + ')', { headers: headers() })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) {
        var m = {};
        (rows || []).forEach(function (o) { m[o.order_no] = o; });
        return m;
      })
      .catch(function () { return {}; });
  }

  window.cgOrderAssist = function (opt) {
    opt = opt || {};

    var host = typeof opt.mount === 'string'
      ? document.getElementById(opt.mount) : opt.mount;
    if (!host) return null;

    var stKr = opt.statusName || function (v) { return ST[v] || String(v || ''); };
    var presets = opt.presets || [
      ['배송준비로', '오늘 결제완료된 주문을 모두 배송준비로 바꿔줘'],
      ['발송할 것', '발송할 주문 알려줘']
    ];

    host.classList.add('cgoa');
    host.innerHTML =
      '<input class="cgoa-q" autocomplete="off" placeholder="'
        + esc(opt.placeholder
            || '예) 20260820 주문 CJ대한통운 1234567890으로 발송 처리해줘') + '">'
      + '<div class="bx">'
        + presets.map(function (p, i) {
            return '<button type="button" class="mini" data-fill="' + i + '">'
              + esc(p[0]) + '</button>';
          }).join('')
      + '</div>'
      + '<div class="bx" style="margin-top:10px">'
        + '<button type="button" class="btn" data-ask="1">처리 방법</button>'
      + '</div>'
      + '<div class="msg" data-msg="1"></div>'
      + '<div class="cgoa-pv hide" data-pv="1"></div>'
      + '<div class="cgoa-hint">'
        + (opt.hint || '바로 바꾸지 않습니다. <b>어떻게 바뀔지 먼저 보여드립니다.</b><br>'
            + '배송중으로 바꾸면 고객에게 발송 안내 메일이 함께 나갑니다.')
      + '</div>';

    var qIn = host.querySelector('.cgoa-q');
    var askBtn = host.querySelector('[data-ask]');
    var msgEl = host.querySelector('[data-msg]');
    var pvEl = host.querySelector('[data-pv]');
    var JOBS = [];

    function say(t, k) {
      msgEl.className = 'msg' + (k ? ' ' + k : '');
      msgEl.textContent = t;
    }

    function call(p) {
      return fetch(SB + '/functions/v1/order-bot', {
        method: 'POST', headers: headers(), body: JSON.stringify(p)
      }).then(function (r) { return r.json(); });
    }

    /* 처리 대상 + 답변 글에 나온 주문번호 (최대 20건) */
    function refNos(jobs, note) {
      var seen = {}, out = [];
      (jobs || []).forEach(function (j) {
        var n = String((j && j.order_no) || '');
        if (n && !seen[n]) { seen[n] = 1; out.push(n); }
      });
      (String(note || '').match(NO_RE) || []).forEach(function (n) {
        if (!seen[n]) { seen[n] = 1; out.push(n); }
      });
      return out.slice(0, 20);
    }

    function refTable(nos, extra) {
      if (!nos.length) return '';
      var body = nos.map(function (n) {
        var o = (opt.lookup && opt.lookup(n)) || (extra && extra[n]) || null;
        if (!o) return '<tr><td><b>' + esc(n) + '</b></td>'
          + '<td colspan="6" class="brefx">'
          + '지금 주문 목록에 없는 번호입니다 — 직접 확인해 주세요</td></tr>';
        var items = (o.order_items || []).map(function (i) {
          return String(i.product_name || '') + '×' + String(i.qty || 0);
        }).join(', ');
        var ref = Number(o.refund_amount || 0);
        return '<tr><td><b>' + esc(o.order_no) + '</b></td>'
          + '<td>' + esc(o.buyer_name || '') + '</td>'
          + '<td>' + esc(stKr(o.status)) + '</td>'
          + '<td class="num">' + won(o.pay_amount) + '원'
            + (ref ? ' <span class="brefx">(환불 ' + won(ref) + ')</span>' : '') + '</td>'
          + '<td>' + (o.tracking_no
              ? esc(String(o.courier || '') + ' ' + o.tracking_no) : '—') + '</td>'
          + '<td>' + esc(String(o.created_at || '').slice(0, 10)) + '</td>'
          + '<td>' + esc(items || '—') + '</td></tr>';
      }).join('');
      return '<div class="brefcap">근거 — 아래 주문을 보고 답했습니다. '
        + '주문 목록에 있는 값 그대로입니다.</div>'
        + '<div class="brefwrap"><table class="bref"><thead><tr>'
        + '<th>주문번호</th><th>주문자</th><th>상태</th><th>결제금액</th>'
        + '<th>운송장</th><th>주문일</th><th>품목</th>'
        + '</tr></thead><tbody>' + body + '</tbody></table></div>';
    }

    /* lookup 으로 못 찾은 번호만 따로 받아 옵니다 */
    function fillRefs(nos) {
      var missing = nos.filter(function (n) {
        return !(opt.lookup && opt.lookup(n));
      });
      if (!missing.length) return Promise.resolve({});
      return fetchOrders(missing);
    }

    function cancel() {
      pvEl.classList.add('hide'); pvEl.innerHTML = ''; JOBS = []; say('');
    }

    function run() {
      if (!JOBS.length) return;
      say('처리하는 중…');
      pvEl.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
      call({ action: 'run', jobs: JOBS }).then(function (d) {
        if (!d.ok) {
          say(d.error || '처리하지 못했습니다.', 'bad');
          pvEl.querySelectorAll('button').forEach(function (b) { b.disabled = false; });
          return;
        }
        say(d.msg || '처리했습니다.', 'ok');
        pvEl.classList.add('hide'); pvEl.innerHTML = '';
        JOBS = []; qIn.value = '';
        try { if (typeof opt.onDone === 'function') opt.onDone(d); } catch (e) {}
      }).catch(function () {
        say('처리하지 못했습니다.', 'bad');
        pvEl.querySelectorAll('button').forEach(function (b) { b.disabled = false; });
      });
    }

    function show(html) {
      pvEl.innerHTML = html;
      pvEl.classList.remove('hide');
      var ok = pvEl.querySelector('[data-run]');
      if (ok) ok.addEventListener('click', run);
      pvEl.querySelectorAll('[data-cancel]').forEach(function (b) {
        b.addEventListener('click', cancel);
      });
    }

    function ask() {
      var q = qIn.value.trim();
      if (!q) { say('무엇을 할지 적어주세요.', 'bad'); return; }
      askBtn.disabled = true;
      say('생각하는 중…');
      pvEl.classList.add('hide');

      call({ action: 'ask', q: q }).then(function (d) {
        askBtn.disabled = false;
        if (!d.ok) { say(d.error || '답을 받지 못했습니다.', 'bad'); return; }
        JOBS = d.jobs || [];
        var nos = refNos(JOBS, d.note);

        return fillRefs(nos).then(function (extra) {
          var refs = refTable(nos, extra);
          var note = d.note ? '<div class="bnote">' + esc(d.note) + '</div>' : '';

          /* 처리할 것이 없는 답(조회·요약)도 근거 표는 붙입니다 */
          if (!JOBS.length) {
            if (note || refs) {
              say('답변입니다. 근거 표와 대조해 주세요.', 'ok');
              show(note + refs + '<div class="bx" style="margin-top:12px">'
                + '<button type="button" class="mini" data-cancel="1">닫기</button></div>');
            } else say('처리할 것을 찾지 못했습니다.', 'ok');
            return;
          }

          say('아래대로 처리합니다. 근거 표와 대조한 뒤 눌러 주세요.');
          show(note
            + JOBS.map(function (j) {
                return '<div class="brow"><b>' + esc(j.order_no) + '</b>'
                  + (j.buyer ? ' · ' + esc(j.buyer) : '') + '<br>'
                  + esc(j.before) + '<span class="barw">→</span>' + esc(j.after)
                  + (j.tracking_no ? '<br><span class="btn-no">'
                      + esc(j.courier) + ' ' + esc(j.tracking_no) + '</span>' : '')
                  + (j.why ? '<div class="bwhy">' + esc(j.why) + '</div>' : '')
                  + '</div>';
              }).join('')
            + refs
            + '<div class="bx" style="margin-top:12px">'
            + '<button type="button" class="btn ok" data-run="1">이대로 처리</button>'
            + '<button type="button" class="mini" data-cancel="1">그만두기</button></div>');
        });
      }).catch(function () {
        askBtn.disabled = false;
        say('답을 받지 못했습니다.', 'bad');
      });
    }

    askBtn.addEventListener('click', ask);
    qIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') ask(); });
    host.querySelectorAll('[data-fill]').forEach(function (b) {
      b.addEventListener('click', function () {
        qIn.value = presets[Number(b.getAttribute('data-fill'))][1];
        qIn.focus();
      });
    });

    return {
      fill: function (t) { qIn.value = t; qIn.focus(); },
      ask: ask,
      cancel: cancel
    };
  };
})();
