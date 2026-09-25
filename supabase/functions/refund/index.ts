import { createClient } from 'jsr:@supabase/supabase-js@2';

/* 츄구미 환불 — 2026-09-05 (3차)
 *
 *  저장소 사본 (2026-09-25 · Supabase 배포 v5 와 같음). 배포는 supabase/functions/README.md.
 *
 *  이번에 고친 것
 *  D) 재고 되돌리기를 DB 함수 restore_order_paid 로 옮겼습니다.
 *     주문 때 차감하는 쪽(apply_order_paid)이 생겼기 때문에,
 *     여기서도 같은 플래그(orders.stock_applied_at)를 보고 되돌려야
 *     이중 복구가 생기지 않습니다. 쓴 쿠폰도 함께 되돌려 드립니다
 *     (give_back_coupon:false 로 부르면 돌려주지 않습니다).
 *  E) 발신 제목의 브랜드명 오타를 고쳤습니다 (춠구미 → 츄구미).
 *
 *  2차(그대로 유지)
 *  A) order_logs 실제 칸(order_id·order_no·action·detail·actor)에 맞춤
 *  B) 환불 마치면 고객의 취소 요청 표시(cancel_req_at)를 지움
 *  C) 메일이 실제로 나갔는지 이유까지 돌려줌(mail_why)
 *
 *  1차(그대로 유지)
 *  - 이지페이 취소 주소 /api/trades/revise
 *  - 필수 항목 shopOrderNo·shopTransactionId·cancelReqDate·msgAuthValue
 *  - pg_tid 가 없으면 manual:true 없이는 장부를 고치지 않음
 */

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

const esc = (s: unknown) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const won = (n: unknown) => Number(n || 0).toLocaleString('ko-KR');

function ymdKST(d = new Date()) {
  return new Date(d.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10).replace(/-/g, '');
}

function cancelTxId(orderNo: string, amount: number) {
  const digits = orderNo.replace(/\D/g, '').slice(-10);
  return ('CX' + digits + '-' + amount + '-' + ymdKST()).slice(0, 40);
}

async function signCancel(key: string, pgCno: string, txId: string) {
  const k = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(key),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k,
    new TextEncoder().encode(`${pgCno}|${txId}`));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/* 처리 이력 — order_logs 실제 칸에 맞추어 적습니다.
   실패하면 조용히 넘기지 않고 이유를 돌려줍니다. */
async function log(orderId: number, orderNo: string, action: string,
                   detail: string, actor: string,
                   before = '', after = '') {
  const { error } = await db.from('order_logs').insert({
    order_id: orderId, order_no: orderNo, action,
    detail: detail.slice(0, 500), actor: actor.slice(0, 120),
    before_val: before.slice(0, 200), after_val: after.slice(0, 200),
  });
  return error ? String(error.message || error).slice(0, 160) : '';
}

async function who(req: Request) {
  const t = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!t) return { a: null, why: '로그인이 필요합니다' };
  const { data } = await db.auth.getUser(t);
  const email = data?.user?.email || '';
  if (!email) return { a: null, why: '로그인이 만료되었습니다. 다시 로그인해 주세요' };
  const { data: a } = await db.from('admins').select('email,role').eq('email', email).maybeSingle();
  if (!a) return { a: null, why: `${email} 은 운영자로 등록돼 있지 않습니다` };
  const allow = (await setting('refund_roles', 'ceo,staff')).split(',').map((s) => s.trim());
  if (!allow.includes(String(a.role || ''))) {
    return { a: null, why: `환불 권한이 없습니다 (지금 역할: ${a.role || '없음'} · 허용: ${allow.join(', ')})` };
  }
  return { a, why: '' };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ ok: false, error: 'POST only' });

  const { a: me, why: noAuth } = await who(req);
  if (!me) return json({ ok: false, error: noAuth }, 403);

  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }
  const action = body.action || 'info';

  const orderNo = String(body.order_no || '');
  if (!orderNo) return json({ ok: false, error: '주문번호가 없습니다' });

  const { data: o } = await db.from('orders').select('*').eq('order_no', orderNo).maybeSingle();
  if (!o) return json({ ok: false, error: '주문을 찾지 못했습니다' });

  const { data: pay } = await db.from('payments')
    .select('*').eq('order_no', orderNo).eq('status', 'paid')
    .order('created_at', { ascending: false }).limit(1).maybeSingle();

  const method = String(o.pay_method || o.pay_type || '');

  /* ── 환불할 수 있는지 ── */
  if (action === 'info') {
    const already = Number(o.refund_amount || 0);
    const left = Number(o.pay_amount || 0) - already;
    const needAcct = ['bank', 'vbank', 'trans'].includes(method);

    return json({
      ok: true,
      order_no: o.order_no, buyer: o.buyer_name,
      pay_amount: o.pay_amount, refunded: already, left,
      pay_method: method, status: o.status,
      need_account: needAcct,
      tid: pay?.pg_tid || '',
      /* 고객이 낸 취소 요청 — 화면에서 바로 보여주기 위해 함께 보냅니다 */
      cancel_req_at: o.cancel_req_at || null,
      cancel_req_by: o.cancel_req_by || '',
      cancel_req_note: o.cancel_req_note || '',
      can: left > 0 && o.status !== 'cancelled',
      why: left <= 0 ? '이미 전액 환불되었습니다'
        : o.status === 'cancelled' ? '이미 취소된 주문입니다'
        : !pay?.pg_tid ? '결제 기록(PG 거래번호)이 없습니다. 무통장입금이면 계좌로 직접 보내신 뒤 manual 로 기록해 주세요'
        : '',
    });
  }

  /* ── 환불 처리 ── */
  if (action === 'refund') {
    const amt = Number(body.amount || 0);
    const reason = String(body.reason || '고객 요청').slice(0, 100);
    const already = Number(o.refund_amount || 0);
    const left = Number(o.pay_amount || 0) - already;

    if (amt <= 0) return json({ ok: false, error: '환불 금액을 넣어주세요' });
    if (amt > left) return json({ ok: false, error: `환불 가능 금액은 ${won(left)}원입니다` });
    if (o.status === 'cancelled') return json({ ok: false, error: '이미 취소된 주문입니다' });

    const full = amt >= left;

    if (pay?.pg_tid) {
      const mallId = await secret('EASYPAY_MALL_ID');
      const mallKey = await secret('EASYPAY_MALL_KEY');
      const mode = await setting('pay_mode', 'test');
      const host = mode === 'live'
        ? 'https://pgapi.easypay.co.kr' : 'https://testpgapi.easypay.co.kr';

      if (!mallId) return json({ ok: false, error: '가맹점 정보(EASYPAY_MALL_ID)가 없습니다' });
      if (!mallKey) return json({ ok: false, error: '암복호화 키(EASYPAY_MALL_KEY)가 없어 취소 서명을 만들 수 없습니다' });

      const txId = cancelTxId(orderNo, amt);
      const payload: Record<string, unknown> = {
        mallId,
        shopOrderNo: orderNo,
        shopTransactionId: txId,
        pgCno: pay.pg_tid,
        cancelTxtype: full ? '40' : '32',
        reviseTypeCode: full ? '40' : '32',
        cancelReqDate: ymdKST(),
        reviseMessage: reason,
        msgAuthValue: await signCancel(mallKey, String(pay.pg_tid), txId),
      };
      if (!full) {
        payload.amount = amt;
        payload.remainAmount = left - amt;
      }
      if (body.bank_no) {
        payload.refundInfo = {
          refundBankCode: String(body.bank_code || ''),
          refundAccountNo: String(body.bank_no || ''),
          refundDepositName: String(body.bank_holder || o.buyer_name || ''),
        };
      }

      let d: any = {}; let httpCode = 0; let raw = '';
      try {
        const r = await fetch(`${host}/api/trades/revise`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: JSON.stringify(payload),
        });
        httpCode = r.status;
        raw = await r.text();
        try { d = JSON.parse(raw); } catch { d = {}; }
      } catch (e) {
        await db.from('pay_attempts').insert({
          order_no: orderNo, shop_tx_id: txId, amount: amt,
          stage: full ? 'cancel' : 'refund',
          res_cd: 'ERR', res_msg: String(e).slice(0, 200),
        }).then(() => {}, () => {});
        return json({ ok: false, error: `이지페이 연결 실패: ${String(e).slice(0, 120)}` });
      }

      await db.from('pay_attempts').insert({
        order_no: orderNo, shop_tx_id: txId, amount: amt,
        stage: full ? 'cancel' : 'refund',
        res_cd: String(d?.resCd || httpCode),
        res_msg: String(d?.resMsg || raw || '').slice(0, 200),
      }).then(() => {}, () => {});

      if (d?.resCd !== '0000') {
        return json({
          ok: false,
          error: d?.resMsg
            ? `이지페이 거절: ${d.resMsg} (${d.resCd})`
            : `이지페이 취소 실패 — HTTP ${httpCode}${raw ? ' · ' + raw.slice(0, 120) : ''}`,
          resCd: d?.resCd || String(httpCode),
        });
      }
    } else if (body.manual !== true) {
      return json({
        ok: false,
        error: '이 주문에는 PG 결제 기록이 없습니다. 계좌로 직접 보내신 뒤 manual:true 로 기록해 주세요',
        need_manual: true,
      });
    }

    /* 주문 상태 적기 — 전액 환불이면 고객의 취소 요청 표시도 지웁니다 */
    const upd: Record<string, unknown> = {
      refund_amount: already + amt,
      refunded_at: new Date().toISOString(),
      refund_reason: reason,
      status: full ? 'cancelled' : o.status,
      pay_status: full ? 'cancelled' : o.pay_status,
    };
    if (full) {
      upd.cancel_req_at = null;
      upd.cancel_req_by = null;
      upd.cancel_req_note = null;
      upd.cancelled_at = new Date().toISOString();
    }
    await db.from('orders').update(upd).eq('order_no', orderNo);

    if (full && pay) {
      await db.from('payments')
        .update({ status: 'canceled', canceled_at: new Date().toISOString() })
        .eq('id', pay.id);
    }

    /* 재고·쿠폰 되돌리기 (전액 환불일 때만) — DB 함수가 한 번만 되돌립니다 */
    let back = 0;
    let backWhy = '';
    if (full && body.restock !== false) {
      const { data: rs, error: re } = await db.rpc('restore_order_paid', {
        p_order_no: orderNo,
        p_give_back_coupon: body.give_back_coupon !== false,
      });
      if (re) backWhy = String(re.message || re).slice(0, 140);
      else back = Number((rs as any)?.moved || 0);
    }

    /* 고객에게 안내 메일 — 실패하면 이유를 남깁니다 */
    let mailed = false; let mailWhy = '';
    if (body.mail === false) {
      mailWhy = '보내지 않음(요청)';
    } else if (!o.buyer_email) {
      mailWhy = '주문에 이메일이 없습니다';
    } else {
      const rk = await secret('RESEND_API_KEY');
      const from = await setting('mail_from', 'ChewGumi <onboarding@resend.dev>');
      if (!rk) {
        mailWhy = 'RESEND_API_KEY 가 없습니다';
      } else {
        const html = '<!DOCTYPE html><html><body style="margin:0;padding:24px;'
          + 'background:#FDF3F5;font-family:\'SUIT Variable\',-apple-system,sans-serif;'
          + 'color:#17171c;line-height:1.7;">'
          + '<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:20px;'
          + 'padding:32px 28px;box-shadow:0 10px 28px rgba(0,0,0,.07);">'
          + '<div style="font-size:11px;letter-spacing:2.4px;color:#D82558;font-weight:700;">CHEWGUMI</div>'
          + '<h1 style="margin:8px 0 0;font-size:21px;font-weight:800;letter-spacing:-.03em;">'
          + (full ? '주문이 취소되었습니다' : '일부 환불해 드렸습니다') + '</h1>'
          + '<p style="margin:10px 0 0;font-size:14px;color:#555;">'
          + esc(o.buyer_name) + '님, ' + won(amt) + '원을 환불해 드렸습니다.<br>'
          + '카드는 사정에 따라 3~5영업일 정도 걸릴 수 있습니다.</p>'
          + '<table style="width:100%;margin-top:24px;border-top:1px solid rgba(0,0,0,.08);'
          + 'border-collapse:collapse;">'
          + '<tr><td style="padding:10px 0;font-size:13px;color:#797979;">주문번호</td>'
          + '<td style="padding:10px 0 10px 16px;font-size:13.5px;font-weight:700;">'
          + esc(o.order_no) + '</td></tr>'
          + '<tr><td style="padding:10px 0;font-size:13px;color:#797979;">환불 금액</td>'
          + '<td style="padding:10px 0 10px 16px;font-size:15px;font-weight:800;color:#D82558;">'
          + won(amt) + '원</td></tr>'
          + (full ? '' : '<tr><td style="padding:10px 0;font-size:13px;color:#797979;">남은 금액</td>'
          + '<td style="padding:10px 0 10px 16px;font-size:13.5px;">'
          + won(left - amt) + '원</td></tr>')
          + '<tr><td style="padding:10px 0;font-size:13px;color:#797979;">사유</td>'
          + '<td style="padding:10px 0 10px 16px;font-size:13.5px;">' + esc(reason) + '</td></tr>'
          + '</table>'
          + '<p style="margin:24px 0 0;padding-top:20px;border-top:1px solid rgba(0,0,0,.06);'
          + 'font-size:12px;color:#9a9aa2;line-height:1.9;">불편을 드려 죄송합니다.<br>'
          + '문의 · chewgumi24@gmail.com</p></div></body></html>';

        try {
          const r = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + rk, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from, to: [o.buyer_email],
              subject: `[츄구미] ${full ? '주문 취소' : '환불'} 안내 · ${o.order_no}`,
              html,
            }),
          });
          mailed = r.ok;
          if (!r.ok) {
            const t = await r.text();
            mailWhy = `Resend ${r.status} · ${t.slice(0, 140)}`;
          }
        } catch (e) {
          mailWhy = String(e).slice(0, 140);
        }
      }
    }

    /* 처리 이력 — 이젠 실제로 남습니다 */
    const logErr = await log(
      o.id, orderNo, 'refund',
      `${won(amt)}원 · ${reason}${pay?.pg_tid ? '' : ' · 손으로 기록'}`
        + (back ? ` · 재고 ${back}건 되돌림` : '')
        + (backWhy ? ` · 재고 되돌리기 실패(${backWhy})` : '')
        + (mailed ? ' · 메일 보냄' : mailWhy ? ` · 메일 못 보냄(${mailWhy})` : ''),
      me.email,
      `환불 ${won(already)}원`,
      `환불 ${won(already + amt)}원${full ? ' · 취소' : ''}`,
    );

    return json({
      ok: true, full, amount: amt, restocked: back, restock_why: backWhy,
      mailed, mail_why: mailWhy,
      log_error: logErr,
      pg: !!pay?.pg_tid,
      msg: `${won(amt)}원 ${full ? '전액 환불' : '부분 환불'}했습니다`
        + (pay?.pg_tid ? '' : ' (장부만 기록 · 실제 송금은 직접 하셔야 합니다)')
        + (back ? ` · 재고 되돌림` : '')
        + (mailed ? ' · 메일 보냄' : mailWhy ? ` · 메일 못 보냄(${mailWhy})` : ''),
    });
  }

  /* ── 취소 요청 물리기 (환불 없이 요청만 취소) ── */
  if (action === 'dismiss') {
    if (!o.cancel_req_at) return json({ ok: false, error: '취소 요청이 없습니다' });
    const note = String(body.note || '').slice(0, 200);
    await db.from('orders').update({
      cancel_req_at: null, cancel_req_by: null, cancel_req_note: null,
    }).eq('order_no', orderNo);
    await log(o.id, orderNo, 'cancel_req_dismiss',
      note || '요청을 물렸습니다', me.email);
    return json({ ok: true, msg: '취소 요청을 물렸습니다' });
  }

  return json({ ok: false, error: '알 수 없는 요청: ' + action });
});
