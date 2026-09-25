/* 츄구미 — 이지페이(KICC) 결제 (pay v14)
 * 저장소 사본 (2026-09-25 · Supabase 배포 v14 와 같음). 배포는 supabase/functions/README.md.
 *
 * #136 (가상계좌 은행 목록 · 입금기한): 거래등록 전문(action 'register')에 payMethodInfo >
 * virtualAccountMethodInfo { bankList, expiryDate, expiryTime } 을 넣는 자리는 아래 payload 입니다.
 * 은행 코드값과 expiryDate·expiryTime 자리수는 KICC 개발가이드로 확인한 뒤 넣습니다 — 아직 안 넣었습니다.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

async function secret(k: string) {
  const e = Deno.env.get(k);
  if (e) return e;
  const { data } = await db.from('app_secrets').select('value').eq('key', k).maybeSingle();
  return data?.value || '';
}
async function setting(k: string, d = '') {
  const { data } = await db.from('shop_settings').select('value').eq('key', k).maybeSingle();
  return data?.value || d;
}

/* 결제가 확정된 순간 재고를 빼고 쿠폰을 사용 처리합니다.
   DB 함수 안에서 주문 행을 잠그므로 두 번 불려도 한 번만 반영됩니다. */
async function applyPaid(orderNo: string) {
  try {
    const { data, error } = await db.rpc('apply_order_paid', { p_order_no: orderNo });
    if (error) {
      await db.from('pay_attempts').insert({
        order_no: orderNo, stage: 'apply', res_cd: 'ERR',
        res_msg: String(error.message || error).slice(0, 200),
      }).then(() => {}, () => {});
      return;
    }
    const short = (data as any)?.short;
    if (Array.isArray(short) && short.length) {
      await db.from('pay_attempts').insert({
        order_no: orderNo, stage: 'apply', res_cd: 'SHORT',
        res_msg: ('재고 부족 상태로 판매됨 · ' + JSON.stringify(short)).slice(0, 200),
      }).then(() => {}, () => {});
    }
  } catch (e) {
    await db.from('pay_attempts').insert({
      order_no: orderNo, stage: 'apply', res_cd: 'ERR',
      res_msg: String(e).slice(0, 200),
    }).then(() => {}, () => {});
  }
}

async function isAdmin(req: Request) {
  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!jwt || jwt.length < 40) return false;
  try {
    const { data } = await db.auth.getUser(jwt);
    const email = data?.user?.email;
    if (!email) return false;
    const { data: r } = await db.from('admins').select('email').eq('email', email).maybeSingle();
    return !!r;
  } catch { return false; }
}

async function isInternal(req: Request) {
  const got = req.headers.get('x-internal-key') || '';
  if (!got) return false;
  const want = await secret('INTERNAL_KEY');
  return !!want && got === want;
}

function apiHost(mode: string) {
  return mode === 'live'
    ? 'https://pgapi.easypay.co.kr'
    : 'https://testpgapi.easypay.co.kr';
}

function newTxId(orderNo: string) {
  const r = Math.random().toString(36).slice(2, 8).toUpperCase();
  return ('TX' + orderNo.replace(/\D/g, '').slice(-10) + r).slice(0, 40);
}

async function verify(key: string, pgCno: string, amount: string, txDate: string, got: string) {
  if (!got) return false;
  try {
    const raw = `${pgCno}|${amount}|${txDate}`;
    const k = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(key),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(raw));
    const hex = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, '0')).join('');
    return hex.startsWith(got.slice(0, 40)) || got.startsWith(hex.slice(0, 40));
  } catch { return false; }
}

function ymd(d = new Date()) {
  const kst = new Date(d.getTime() + 9 * 3600 * 1000);
  return kst.toISOString().slice(0, 10).replace(/-/g, '');
}

async function logStep(o: Record<string, unknown>) {
  try { await db.from('pay_attempts').insert(o); } catch { /* 조용히 */ }
}

/* 에스크로 상품정보 — 개별 금액의 합이 결제요청 금액과 꼭 같아야 합니다 (KICC 규격) */
function goodsLines(items: any[], goods: string, amount: number) {
  let lines = items.slice(0, 19).map((it: any, i: number) => ({
    productNo: String(i + 1),
    productName: String(it.name || goods).slice(0, 50),
    productAmount: Math.max(0, Math.round(Number(it.price || 0) * Number(it.qty || 1))),
  }));
  const sum = lines.reduce((s, l) => s + l.productAmount, 0);
  const diff = amount - sum;
  if (diff > 0) {
    lines.push({ productNo: String(lines.length + 1), productName: '배송비', productAmount: diff });
  } else if (diff < 0) {
    let rest = -diff;
    for (let i = lines.length - 1; i >= 0 && rest > 0; i--) {
      const cut = Math.min(lines[i].productAmount, rest);
      lines[i].productAmount -= cut;
      rest -= cut;
    }
    lines = lines.filter((l) => l.productAmount > 0);
  }
  if (!lines.length) {
    lines = [{ productNo: '1', productName: String(goods).slice(0, 50), productAmount: amount }];
  }
  return lines;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ ok: false, error: 'POST only' }, 405);

  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }

  /* KICC 입금 통보는 action 항목 없이 결제 전문만 보냅니다.
     예전에는 기본값 'status'(설정 조회)로 흘러가 입금 처리가 전혀 되지 않았고,
     KICC 는 통보 실패로 보고 재전송을 반복했습니다 (issues #19).
     pgCno 와 msgAuthValue 가 함께 있으면 입금 통보로 봅니다.
     서명 검증은 notify 분기 안에서 그대로 합니다 — 문턱만 보고 들여보내는 것이지
     검증을 건너뛰는 것이 아닙니다. */
  const notiish = !body.action
    && !!(body.pgCno || body?.data?.pgCno)
    && !!(body.msgAuthValue || body?.data?.msgAuthValue);
  const action = body.action || (notiish ? 'notify' : 'status');

  const mallId = await secret('EASYPAY_MALL_ID');
  const mallKey = await secret('EASYPAY_MALL_KEY');
  const mode = await setting('pay_mode', 'test');
  const host = apiHost(mode);
  const escrowOn = (await setting('escrow_on', 'off')) === 'on';

  if (action === 'status') {
    return json({
      ok: !!(mallId && mallKey), mode, mallId: mallId || '', host,
      live: mode === 'live', escrow: escrowOn, keyReady: !!mallKey,
      methods: (await setting('pay_methods', 'card,bank,vbank')).split(','),
      msg: (mallId && mallKey)
        ? `준비됨 · ${mode === 'live' ? '실제 결제' : '시험 모드'} · ${mallId}`
        : mallId ? `암복호화 키가 없습니다 · ${mallId}` : '가맹점 정보가 없습니다',
    });
  }

  /* ── 거래 등록 ── */
  if (action === 'register') {
    if (!mallId) return json({ ok: false, error: '가맹점 정보가 없습니다' });

    const amount = Number(body.amount || 0);
    const goods = String(body.goodsName || '츄구미 상품').slice(0, 50);
    if (amount < 100) return json({ ok: false, error: '결제 금액이 올바르지 않습니다' });

    const orderNo = String(body.orderNo || '')
      || 'CG' + Date.now() + Math.random().toString(36).slice(2, 6).toUpperCase();

    const { data: done } = await db.from('payments')
      .select('id').eq('order_no', orderNo).eq('status', 'paid').maybeSingle();
    if (done) {
      return json({ ok: false, already: true, error: '이미 결제가 완료된 주문입니다' });
    }

    await db.from('payments')
      .update({ status: 'expired' })
      .eq('order_no', orderNo).eq('status', 'ready');

    const txId = newTxId(orderNo);
    const returnUrl = await setting('pay_return_url',
      'https://shop.chewgumi.com/pay-return.html');

    const payload: any = {
      mallId,
      shopOrderNo: orderNo,
      shopTransactionId: txId,
      amount,
      payMethodTypeCode: String(body.method || '00'),
      currency: '00',
      clientTypeCode: '00',
      returnUrl,
      deviceTypeCode: body.mobile ? 'mobile' : 'pc',
      langFlag: 'KOR',
      orderInfo: {
        goodsName: goods,
        customerInfo: {
          customerName: String(body.buyer || '').slice(0, 20),
          customerMail: String(body.email || '').slice(0, 50),
          customerContactNo: String(body.phone || '').replace(/\D/g, '').slice(0, 11),
        },
      },
      shopValueInfo: { value1: String(body.memo || '').slice(0, 1000) },
    };

    /* 에스크로 — 가상계좌(22) · 계좌이체(21) 에만 */
    const useEscrow = escrowOn && (body.escrow !== false)
      && ['21', '22'].includes(String(body.method || ''));

    if (useEscrow) {
      const items = Array.isArray(body.items) && body.items.length
        ? body.items : [{ name: goods, qty: 1, price: amount }];

      const { data: ord } = await db.from('orders')
        .select('buyer_name,buyer_phone,buyer_email,zipcode,addr1,addr2')
        .eq('order_no', orderNo).maybeSingle();

      const digits = (v: unknown) => String(v || '').replace(/\D/g, '').slice(0, 11);

      payload.escrowInfo = {
        escrowTypeCode: 'K',
        deliveryCode: 'DE02',
        goodsInfoList: goodsLines(items, goods, amount),
        recvInfo: {
          recvName: String(ord?.buyer_name || body.buyer || '').slice(0, 50),
          recvMobileNo: digits(ord?.buyer_phone || body.phone),
          recvMail: String(ord?.buyer_email || body.email || '').slice(0, 100),
          recvZipCode: String(ord?.zipcode || '').slice(0, 6),
          recvAddr1: String(ord?.addr1 || '').slice(0, 100),
          recvAddr2: String(ord?.addr2 || '').slice(0, 100),
        },
      };
    }

    try {
      const r = await fetch(`${host}/api/ep9/trades/webpay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload),
      });
      const txt = await r.text();
      let d: any = {};
      try { d = JSON.parse(txt); } catch { d = {}; }

      await logStep({
        order_no: orderNo, shop_tx_id: txId,
        amount, method: String(body.method || ''),
        stage: 'register',
        res_cd: String(d?.resCd || r.status),
        res_msg: String(d?.resMsg || '').slice(0, 200),
      });

      if (d?.resCd !== '0000') {
        return json({ ok: false,
          error: d?.resMsg || `거래 등록 실패 (${d?.resCd || r.status})`,
          resCd: d?.resCd || String(r.status) });
      }

      await db.from('payments').insert({
        order_no: orderNo, shop_tx_id: txId, provider: 'easypay',
        method: String(body.method || '00'), amount, status: 'ready',
      });

      return json({ ok: true, orderNo, txId,
        authPageUrl: d.authPageUrl, mode, escrow: useEscrow });
    } catch (e) {
      await logStep({ order_no: orderNo, shop_tx_id: txId, amount,
        stage: 'register', res_cd: 'ERR', res_msg: String(e).slice(0, 200) });
      return json({ ok: false, error: `연결 실패: ${String(e).slice(0, 120)}` });
    }
  }

  /* ── 승인 ── */
  if (action === 'approve') {
    if (!mallId) return json({ ok: false, error: '가맹점 정보가 없습니다' });

    const authId = String(body.authorizationId || '');
    const orderNo = String(body.shopOrderNo || '');
    const want = Number(body.amount || 0);
    if (!authId || !orderNo) return json({ ok: false, error: '인증 정보가 없습니다' });

    const { data: done } = await db.from('payments')
      .select('*').eq('order_no', orderNo).eq('status', 'paid').maybeSingle();
    if (done) {
      return json({ ok: true, already: true, tid: done.pg_tid,
        msg: '이미 결제가 완료된 주문입니다' });
    }

    const { data: last } = await db.from('payments')
      .select('shop_tx_id').eq('order_no', orderNo)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    const txId = last?.shop_tx_id || newTxId(orderNo);

    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 30000);

      const r = await fetch(`${host}/api/ep9/trades/approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          mallId, shopOrderNo: orderNo, shopTransactionId: txId,
          authorizationId: authId, approvalReqDate: ymd(),
        }),
        signal: ctl.signal,
      });
      clearTimeout(timer);

      const d = await r.json().catch(() => ({}));
      const okPay = d?.resCd === '0000';
      const piRaw = d?.paymentInfo;
      const pi = Array.isArray(piRaw) ? (piRaw[0] || {}) : (piRaw || {});
      const card = pi.cardInfo || {};
      const bank = pi.bankInfo || {};
      const va = pi.virtualAccountInfo || {};

      const isVbank = String(pi.payMethodTypeCode || '') === '22' || !!va.accountNo;

      /* 거래번호(pgCno)를 시도 기록에도 남깁니다.
         승인은 됐는데 payments 저장이 실패하면 거래번호가 어디에도 남지 않아,
         이틀이 지나 KICC 조회 기간(전일~금일)이 끝나면 추적이 불가능했습니다 (issues #21). */
      await logStep({
        order_no: orderNo, shop_tx_id: txId, auth_id: authId.slice(0, 40),
        amount: Number(d?.amount || want),
        method: String(pi.payMethodTypeCode || ''),
        stage: 'approve',
        pg_tid: String(d?.pgCno || ''),
        res_cd: String(d?.resCd || r.status),
        res_msg: String(d?.resMsg || '').slice(0, 200),
      });

      if (okPay && want && Number(d.amount) !== want) {
        await fetch(`${host}/api/ep9/trades/revise`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: JSON.stringify({ mallId, pgCno: d.pgCno,
            reviseTypeCode: '40', reviseMessage: '금액 불일치 자동 취소' }),
        }).catch(() => {});
        return json({ ok: false,
          error: `결제 금액이 달라 취소했습니다 (요청 ${want} · 승인 ${d.amount})` });
      }

      if (okPay && mallKey && d.msgAuthValue) {
        const good = await verify(mallKey, d.pgCno, String(d.amount),
          d.transactionDate, d.msgAuthValue);
        if (!good) return json({ ok: false, error: '응답 검증에 실패했습니다' });
      }

      let quota = 0;
      const q = String(card.installmentMonth ?? '').replace(/\D/g, '');
      if (q && Number(q) <= 36) quota = Number(q);

      await db.from('payments').insert({
        order_no: orderNo, shop_tx_id: txId, provider: 'easypay',
        method: pi.payMethodTypeCode || '',
        amount: Number(d.amount || 0),
        status: okPay ? (isVbank ? 'ready' : 'paid') : 'failed',
        status_code: d.statusCode || '',
        pg_tid: d.pgCno || '',
        approve_no: pi.approvalNo || '',
        card_name: card.issuerName || pi.payMethodDetailCodeName || '',
        card_no: card.cardNo || pi.maskingNo || '',
        quota,
        bank_name: bank.bankName || va.bankName || '',
        vbank_no: va.accountNo || '',
        vbank_holder: va.depositName || '',
        vbank_expiry: va.expiryDate || '',
        paid_at: (okPay && !isVbank) ? new Date().toISOString() : null,
        raw: d,
      });

      if (okPay && !isVbank) {
        await db.from('orders')
          .update({ status: 'paid', pay_status: 'paid',
            pay_method: pi.payMethodTypeCode === '11' ? 'card' : 'bank' })
          .eq('order_no', orderNo);
        await applyPaid(orderNo);
      } else if (okPay && isVbank) {
        await db.from('orders')
          .update({ pay_method: 'vbank' })
          .eq('order_no', orderNo);
      }

      return json({
        ok: okPay,
        msg: okPay
          ? (isVbank ? '가상계좌가 발급되었습니다. 입금하시면 자동으로 확인됩니다.'
                     : '결제가 완료되었습니다')
          : (d?.resMsg || '결제에 실패했습니다'),
        resCd: d?.resCd || '',
        clearCart: okPay,
        tid: d?.pgCno || '',
        amount: Number(d?.amount || 0),
        method: pi.payMethodTypeCode || '',
        quota,
        escrow: d?.escrowUsed === 'Y',
        card: (card.issuerName || pi.payMethodDetailCodeName)
          ? `${card.issuerName || pi.payMethodDetailCodeName} ${card.cardNo || pi.maskingNo || ''}` : '',
        vbank: va.accountNo
          ? { bank: va.bankName, no: va.accountNo,
              holder: va.depositName, expiry: va.expiryDate } : null,
      });
    } catch (e) {
      const msg = String(e).includes('abort')
        ? '응답이 늦어 처리하지 못했습니다. 거래 상태를 확인해 주세요'
        : `처리 실패: ${String(e).slice(0, 120)}`;
      await logStep({ order_no: orderNo, shop_tx_id: txId,
        stage: 'approve', res_cd: 'ERR', res_msg: String(e).slice(0, 200) });
      return json({ ok: false, error: msg });
    }
  }

  /* ── 에스크로 발송 등록 ── */
  if (action === 'escrow-ship') {
    if (!mallId) return json({ ok: false, error: '가맹점 정보가 없습니다' });
    const tid = String(body.tid || '');
    if (!tid) return json({ ok: false, error: '거래번호가 없습니다' });

    try {
      const r = await fetch(`${host}/api/ep9/trades/escrow/delivery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          mallId, pgCno: tid,
          deliveryCompanyCode: String(body.courier_code || ''),
          invoiceNo: String(body.tracking_no || ''),
          deliveryDate: ymd(),
        }),
      });
      const d = await r.json().catch(() => ({}));
      const okS = d?.resCd === '0000';
      return json({ ok: okS, msg: okS ? '발송 등록했습니다' : (d?.resMsg || '등록 실패') });
    } catch (e) {
      return json({ ok: false, error: String(e).slice(0, 120) });
    }
  }

  /* ── 취소 ── */
  if (action === 'cancel') {
    const allowed = (await isAdmin(req)) || (await isInternal(req));
    if (!allowed) return json({ ok: false, error: '운영자 권한이 필요합니다.' }, 403);

    if (!mallId) return json({ ok: false, error: '가맹점 정보가 없습니다' });
    const tid = String(body.tid || '');
    if (!tid) return json({ ok: false, error: '거래번호가 없습니다' });

    try {
      const r = await fetch(`${host}/api/ep9/trades/revise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          mallId, pgCno: tid,
          reviseTypeCode: body.partial ? '32' : '40',
          amount: body.partial ? Number(body.amount || 0) : undefined,
          reviseMessage: String(body.reason || '고객 요청').slice(0, 100),
        }),
      });
      const d = await r.json().catch(() => ({}));
      const okC = d?.resCd === '0000';
      if (okC) {
        await db.from('payments')
          .update({ status: 'canceled', canceled_at: new Date().toISOString() })
          .eq('pg_tid', tid);
      }
      return json({ ok: okC, msg: okC ? '취소되었습니다' : (d?.resMsg || '취소 실패') });
    } catch (e) {
      return json({ ok: false, error: String(e).slice(0, 120) });
    }
  }

  /* ── 상태 조회 ── */
  if (action === 'query') {
    if (!mallId) return json({ ok: false, error: '가맹점 정보가 없습니다' });
    const orderNo = String(body.orderNo || '');
    if (!orderNo) return json({ ok: false, error: '주문번호가 없습니다' });

    const { data: last } = await db.from('payments')
      .select('shop_tx_id').eq('order_no', orderNo)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();

    try {
      const r = await fetch(`${host}/api/trades/retrieveTransaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          mallId,
          shopTransactionId: String(body.txId || last?.shop_tx_id || ''),
          transactionDate: String(body.date || ymd()),
        }),
      });
      const txt = await r.text();
      let d: any = {};
      try { d = JSON.parse(txt); } catch { d = {}; }
      return json({ ok: d?.resCd === '0000', data: d, msg: d?.resMsg || '' });
    } catch (e) {
      return json({ ok: false, error: String(e).slice(0, 120) });
    }
  }

  /* ── 입금 통보 ── */
  if (action === 'notify' || action === 'webhook') {
    const d = body.data || body;
    const orderNo = String(d.shopOrderNo || '');

    if (!mallKey || !d.msgAuthValue) {
      await db.from('pay_return_logs')
        .insert({ order_no: orderNo, kind: 'noti_unsigned', raw: d,
                  method: 'POST', params: d, matched_order: orderNo })
        .then(() => {}, () => {});
      return json({ resCd: '9999', resMsg: 'AUTH FAIL' });
    }

    const good = await verify(mallKey, String(d.pgCno || ''),
      String(d.amount || ''), String(d.transactionDate || ''), d.msgAuthValue);
    if (!good) {
      await db.from('pay_return_logs')
        .insert({ order_no: orderNo, kind: 'noti_bad', raw: d,
                  method: 'POST', params: d, matched_order: orderNo })
        .then(() => {}, () => {});
      return json({ resCd: '9999', resMsg: 'AUTH FAIL' });
    }

    if (orderNo) {
      const { data: done } = await db.from('payments')
        .select('id').eq('order_no', orderNo).eq('status', 'paid').maybeSingle();
      if (!done) {
        await db.from('payments')
          .update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('order_no', orderNo).eq('status', 'ready');
        await db.from('orders')
          .update({ status: 'paid', pay_status: 'paid' })
          .eq('order_no', orderNo);
        await logStep({ order_no: orderNo, stage: 'notify',
          pg_tid: String(d.pgCno || ''), amount: Number(d.amount || 0),
          res_cd: '0000', res_msg: '입금 확인' });
        /* 입금이 확인된 순간 — 재고 차감 + 쿠폰 사용 처리 */
        await applyPaid(orderNo);
        /* 입금 확인 메일 */
        try {
          await fetch(Deno.env.get('SUPABASE_URL') + '/functions/v1/order-mail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json',
                       apikey: Deno.env.get('SUPABASE_ANON_KEY') || '' },
            body: JSON.stringify({ order_no: orderNo, kind: 'paid' }),
          });
        } catch { /* 메일 실패가 입금 처리를 막지 않도록 */ }
      }
    }
    return json({ resCd: '0000', resMsg: 'OK' });
  }

  return json({ ok: false, error: `알 수 없는 요청: ${action}` });
});
