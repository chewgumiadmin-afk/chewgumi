/* 츄구미 — 사장님 비서 (order-bot v4)
 *
 *   말로 시키면 바로 처리하고, 처리한 내용을 사장님께 알려드립니다.
 *
 *   action
 *     ask   { q }        무엇을 할지 정리해서 돌려줍니다 (실행 안 함)
 *     run   { jobs }     바로 실행합니다. 실행 즉시 기록 + 알림
 *     feed  { days }     비서가 처리한 내역 (사장님 확인용)
 *
 *   실행은 이미 있는 함수에 맡깁니다 — 문자·에스크로·이지페이 취소 같은
 *   곁다리 처리가 한 곳에만 있도록 하기 위해서입니다.
 *     발송/운송장  order      action:'ship'
 *     주문취소     order-edit action:'cancel'
 *     배송지수정   order-edit action:'editAddress'
 *     환불         refund     action:'refund'
 *
 *   주문 '삭제' 는 감춤(보관)으로 처리합니다. 전자상거래법상 대금결제·
 *   계약 기록은 5년간 보존하게 되어 있어 지우지 않는 편이 안전합니다.
 *   실제 삭제가 꼭 필요하시면 따로 말씀해 주세요.
 *
 *   v4 (2026-09-05) — 테스트 주문(is_test=true)을 비서 눈에서도 뺍니다.
 *   목록·통계(orders.html)는 이미 빠져 있었는데 비서만 계속 보고 있었습니다.
 *   (GitHub #129 · issues #34)
 *
 *   저장소 사본 (2026-09-25 · Supabase 배포 v5 와 같음). 배포는 supabase/functions/README.md.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

const URL_ = Deno.env.get('SUPABASE_URL')!;
const db = createClient(URL_, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

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

const COURIERS: Record<string, string> = {
  '04': 'CJ대한통운', '05': '한진택배', '08': '롯데택배',
  '06': '로젠택배', '01': '우체국택배', '11': '일양로지스', '46': 'CU편의점', '23': '경동택배',
};
const ST: Record<string, string> = {
  pending: '입금 대기', paid: '결제 완료', ready: '배송 준비', preparing: '배송 준비',
  shipping: '배송 중', shipped: '배송 중', done: '배송 완료', delivered: '배송 완료',
  cancelled: '취소됨', canceled: '취소됨', refunded: '환불됨',
};
const KIND_KR: Record<string, string> = {
  ship: '발송 처리', cancel: '주문 취소', refund: '환불',
  address: '배송지 수정', status: '상태 변경', hide: '목록에서 감춤',
};

async function who(req: Request) {
  const t = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!t) return null;
  const { data } = await db.auth.getUser(t);
  const email = data?.user?.email || '';
  if (!email) return null;
  const { data: a } = await db.from('admins').select('email,role').eq('email', email).maybeSingle();
  if (!a || !['ceo', 'dev', 'staff', 'qa'].includes(a.role)) return null;
  return a as { email: string; role: string };
}

/* 다른 함수를 부를 때 부른 사람의 권한을 그대로 넘깁니다 */
async function callFn(name: string, body: unknown, auth: string) {
  const r = await fetch(`${URL_}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: Deno.env.get('SUPABASE_ANON_KEY') || '',
      Authorization: auth,
    },
    body: JSON.stringify(body),
  });
  let d: any = {};
  try { d = await r.json(); } catch { /* 본문 없음 */ }
  return { ok: r.ok && d?.error == null && d?.ok !== false, data: d, status: r.status };
}

/* ── 비서가 볼 수 있는 주문 ──
   테스트 주문은 뺍니다. 이유가 두 가지입니다.
   ① 비서가 가짜 주문에 발송·취소·환불을 제안하면 안 됩니다.
   ② 목록에서 감춘 주문(hide)은 is_test=true 로 표시하는 방식이라,
      감춘 뒤에도 비서에게만 계속 보이면 감춘 뜻이 없습니다.
   또한 limit(60) 이 걸러내기 전에 적용되던 문제도 함께 사라집니다. */
async function pool() {
  const from = new Date(Date.now() - 60 * 86400000).toISOString();
  const { data } = await db.from('orders')
    .select('id,order_no,buyer_name,buyer_phone,pay_amount,refund_amount,status,pay_status,'
      + 'pay_method,pay_type,courier,courier_code,tracking_no,addr1,addr2,zipcode,memo,'
      + 'created_at,paid_at,is_test,order_items(product_name,qty)')
    .eq('is_test', false)
    .gte('created_at', from)
    .order('created_at', { ascending: false })
    .limit(60);
  return data || [];
}

function line(o: any) {
  const items = (o.order_items || []).map((i: any) => `${i.product_name}×${i.qty}`).join(', ');
  const left = (o.pay_amount || 0) - (o.refund_amount || 0);
  return `${o.order_no} · ${o.buyer_name} · ${(o.pay_amount || 0).toLocaleString()}원`
    + (o.refund_amount ? ` (환불됨 ${o.refund_amount.toLocaleString()}, 남은 금액 ${left.toLocaleString()})` : '')
    + ` · ${ST[o.status] || o.status}`
    + (o.tracking_no ? ` · ${o.courier || ''} ${o.tracking_no}` : '')
    + (items ? ` · ${items}` : '')
    + ` · ${String(o.created_at || '').slice(0, 10)}`;
}

/* ── 계획 세우기 ── */
const MODELS = ['claude-sonnet-5', 'claude-sonnet-4-5', 'claude-3-7-sonnet-latest', 'claude-3-5-sonnet-latest'];

async function plan(q: string, rows: any[]) {
  const key = await secret('ANTHROPIC_API_KEY');
  if (!key) return { err: 'AI 키가 없습니다' };

  const sys = '당신은 츄구미 쇼핑몰 사장님의 주문 처리 비서입니다.\n\n'
    + '## 지금 손댐 수 있는 주문 (최근 60일, 테스트 주문 제외)\n' + (rows.map(line).join('\n') || '(없음)') + '\n\n'
    + '## 택배사 번호\nCJ대한통운=04 · 한진택배=05 · 롯데택배=08 · 로젠택배=06 · 우체국택배=01 · 일양=11 · CU=46 · 경동=23\n\n'
    + '## 할 수 있는 일 (kind)\n'
    + 'ship    발송 처리 — courier_code, tracking_no 필요\n'
    + 'cancel  주문 취소 — reason 필요\n'
    + 'refund  환불 — amount(원), reason 필요. amount 는 남은 금액을 넘을 수 없습니다\n'
    + 'address 배송지 수정 — name, phone, zipcode, addr1, addr2, memo 중 바꿀 것만\n'
    + 'status  상태만 변경 — status\n'
    + 'hide    목록에서 감춤 (삭제 요청은 이걸로) — reason\n\n'
    + '## 답하는 방식\n오직 JSON 만. 설명·말머리·코드펜스 없이.\n'
    + '{"jobs":[{"kind":"ship","order_no":"20260820-142834","courier_code":"04",'
    + '"tracking_no":"1234567890","why":"짧은 이유"}],"note":"사장님께 드릴 한두 줄"}\n\n'
    + '## 반드시 지킬 것\n'
    + '· 위 목록에 있는 주문번호만 씁니다. 없는 번호를 지어내지 마세요.\n'
    + '· 운송장번호가 없으면 ship 을 쓰지 마세요.\n'
    + '· 환불 금액이 분명하지 않으면 jobs 를 비우고 note 에 물어보세요.\n'
    + '· 조회·요약만 요청받았으면 jobs 는 빈 배열, note 에 답을 씁니다.\n'
    + '· 조금이라도 분명하지 않으면 실행하지 말고 note 에 되물으세요.\n'
    + '· 모든 글은 한국어 쉬운 말로.';

  const want = await setting('bot_model', '');
  const tries = want ? [want, ...MODELS] : MODELS;
  let lastErr = '';

  for (const model of tries) {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, max_tokens: 1500, system: sys, messages: [{ role: 'user', content: q }] }),
      });
      const d = await r.json();
      if (!r.ok) {
        lastErr = d?.error?.message || `HTTP ${r.status}`;
        if (/model/i.test(lastErr)) continue;      /* 모델 이름 문제면 다음 것으로 */
        return { err: lastErr };
      }
      const txt = (d.content || []).filter((c: any) => c.type === 'text')
        .map((c: any) => c.text).join('').replace(/```json|```/g, '').trim();
      try { return { plan: JSON.parse(txt), model }; }
      catch { return { err: 'AI 답을 읽지 못했습니다: ' + txt.slice(0, 120) }; }
    } catch (e) { lastErr = String(e).slice(0, 120); }
  }
  return { err: lastErr || 'AI 호출에 실패했습니다' };
}

/* ── 알림 ── */
async function tellOwner(title: string, text: string) {
  const out: Record<string, string> = {};

  /* 휴대폰 웹푸시 */
  try {
    const r = await fetch(`${URL_}/functions/v1/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: Deno.env.get('SUPABASE_ANON_KEY') || '' },
      body: JSON.stringify({ action: 'notifyOwner', title, text, kind: 'bot',
        url: 'https://shop.chewgumi.com/orders.html', tag: 'bot' }),
    });
    const d = await r.json();
    out.push = d?.ok ? (d.skipped ? '꺼져 있음' : `기기 ${d.sent || 0}대`) : (d?.error || '실패');
  } catch (e) { out.push = '실패'; }

  /* 이메일 */
  try {
    const key = await secret('RESEND_API_KEY');
    const from = await setting('mail_from', 'ChewGumi <onboarding@resend.dev>');
    const { data: ceos } = await db.from('admins').select('email').eq('role', 'ceo');
    const to = (ceos || []).map((c: any) => c.email).filter(Boolean);
    if (!key) out.mail = '키 없음';
    else if (!to.length) out.mail = '받는 사람 없음';
    else {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, subject: title,
          text: text + '\n\n주문 화면 https://shop.chewgumi.com/orders.html' }),
      });
      const d = await r.json();
      out.mail = r.ok ? '보냈습니다' : (d?.message || d?.name || '실패');
    }
  } catch (e) { out.mail = '실패'; }

  return out;
}

/* ── 처리 이력 남기기 ── */
async function log(o: any, kind: string, before: string, after: string, detail: string, actor: string) {
  await db.from('order_logs').insert({
    order_id: o?.id ?? null,
    order_no: o?.order_no || '',
    action: 'bot:' + kind,
    detail, before_val: before, after_val: after, actor,
  }).then(() => {}, () => {});
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ ok: false, error: 'POST only' }, 405);

  const me = await who(req);
  if (!me) return json({ ok: false, error: '관리자만 쓸 수 있습니다' }, 403);
  const auth = req.headers.get('Authorization') || '';

  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }
  const action = body.action || 'ask';

  /* ─────────── 무엇을 할지 정리 ─────────── */
  if (action === 'ask') {
    const q = String(body.q || '').trim();
    if (!q) return json({ ok: false, error: '무엇을 할지 적어주세요' });

    const rows = await pool();
    const p = await plan(q, rows);
    if ((p as any).err) return json({ ok: false, error: (p as any).err });

    const byNo = new Map(rows.map((o: any) => [o.order_no, o]));
    const jobs = ((p as any).plan?.jobs || [])
      .filter((j: any) => j?.order_no && byNo.has(j.order_no))
      .map((j: any) => {
        const o: any = byNo.get(j.order_no);
        const kind = String(j.kind || (j.tracking_no ? 'ship' : 'status'));
        const left = (o.pay_amount || 0) - (o.refund_amount || 0);
        const amount = kind === 'refund'
          ? Math.max(0, Math.min(Number(j.amount || left), left)) : undefined;
        const after = kind === 'ship' ? '배송 중'
          : kind === 'cancel' ? '취소됨'
          : kind === 'refund' ? ((amount || 0) >= left ? '환불됨' : '부분 환불')
          : kind === 'hide' ? '감춤'
          : kind === 'status' ? (ST[String(j.status || '')] || String(j.status || ''))
          : (ST[o.status] || o.status);
        return {
          kind, kindKr: KIND_KR[kind] || kind,
          order_no: o.order_no, id: o.id,
          buyer: o.buyer_name, pay_amount: o.pay_amount,
          before: ST[o.status] || o.status, after,
          status: j.status || undefined,
          courier_code: j.courier_code || '', courier: COURIERS[j.courier_code] || '',
          tracking_no: String(j.tracking_no || ''),
          amount, left,
          reason: String(j.reason || j.why || ''),
          name: j.name, phone: j.phone, zipcode: j.zipcode,
          addr1: j.addr1, addr2: j.addr2, memo: j.memo,
          why: String(j.why || j.reason || ''),
          warn: kind === 'refund' ? '환불은 되돌릴 수 없습니다' : '',
        };
      })
      .filter((j: any) => !(j.kind === 'ship' && !j.tracking_no));

    return json({ ok: true, jobs, note: String((p as any).plan?.note || ''),
      pool: rows.length, model: (p as any).model });
  }

  /* ─────────── 바로 실행 ─────────── */
  if (action === 'run') {
    const jobs = Array.isArray(body.jobs) ? body.jobs : [];
    if (!jobs.length) return json({ ok: false, error: '처리할 것이 없습니다' });

    const rows = await pool();
    const byNo = new Map(rows.map((o: any) => [o.order_no, o]));
    const results: any[] = [];

    for (const j of jobs) {
      const o: any = byNo.get(String(j.order_no || ''));
      const kind = String(j.kind || 'status');
      if (!o) { results.push({ order_no: j.order_no, kind, ok: false, msg: '주문을 찾지 못했습니다' }); continue; }

      const before = ST[o.status] || o.status;
      let ok = false, msg = '', after = before;

      try {
        if (kind === 'ship') {
          if (!j.tracking_no) { results.push({ order_no: o.order_no, kind, ok: false, msg: '운송장번호가 없습니다' }); continue; }
          const r = await callFn('order', { action: 'ship', orderId: o.id,
            courierCode: String(j.courier_code || '04'),
            courier: COURIERS[String(j.courier_code || '04')] || '',
            trackingNo: String(j.tracking_no) }, auth);
          ok = r.ok; msg = r.ok ? `${COURIERS[String(j.courier_code || '04')] || ''} ${j.tracking_no}` : (r.data?.error || '발송 처리 실패');
          after = '배송 중';

        } else if (kind === 'cancel') {
          const r = await callFn('order-edit', { action: 'cancel', orderId: o.id,
            reason: String(j.reason || '비서 처리') }, auth);
          ok = r.ok; msg = r.ok ? String(j.reason || '') : (r.data?.error || '취소 실패');
          after = '취소됨';

        } else if (kind === 'refund') {
          const left = (o.pay_amount || 0) - (o.refund_amount || 0);
          const amt = Math.max(0, Math.min(Number(j.amount || left), left));
          if (!amt) { results.push({ order_no: o.order_no, kind, ok: false, msg: '환불할 금액이 없습니다' }); continue; }
          const r = await callFn('refund', { action: 'refund', order_no: o.order_no,
            amount: amt, reason: String(j.reason || '비서 처리') }, auth);
          ok = r.ok; msg = r.ok ? `${amt.toLocaleString()}원 환불` : (r.data?.error || '환불 실패');
          after = amt >= left ? '환불됨' : '부분 환불';

        } else if (kind === 'address') {
          const r = await callFn('order-edit', { action: 'editAddress', orderId: o.id,
            buyer_name: j.name ?? o.buyer_name, buyer_phone: j.phone ?? o.buyer_phone,
            zipcode: j.zipcode ?? o.zipcode, addr1: j.addr1 ?? o.addr1,
            addr2: j.addr2 ?? o.addr2, memo: j.memo ?? o.memo }, auth);
          ok = r.ok;
          msg = r.ok ? [j.zipcode ? '(' + j.zipcode + ')' : '', j.addr1 ?? o.addr1, j.addr2 ?? o.addr2]
            .filter(Boolean).join(' ') : (r.data?.error || '배송지 수정 실패');
          after = before;

        } else if (kind === 'hide') {
          const { error } = await db.from('orders').update({ is_test: true,
            updated_at: new Date().toISOString(), updated_by: me.email }).eq('id', o.id);
          ok = !error; msg = ok ? '목록에서 감췄습니다 (기록은 남습니다)' : (error?.message || '실패');

        } else if (kind === 'status') {
          const st = String(j.status || '');
          if (!ST[st]) { results.push({ order_no: o.order_no, kind, ok: false, msg: '알 수 없는 상태: ' + st }); continue; }
          const { error } = await db.from('orders').update({ status: st,
            updated_at: new Date().toISOString(), updated_by: me.email }).eq('id', o.id);
          ok = !error; after = ST[st]; msg = ok ? after : (error?.message || '실패');

        } else {
          results.push({ order_no: o.order_no, kind, ok: false, msg: '할 수 없는 일입니다: ' + kind });
          continue;
        }
      } catch (e) { ok = false; msg = String(e).slice(0, 120); }

      await log(o, kind, before, after, `${KIND_KR[kind] || kind} — ${msg}`, me.email);
      results.push({ order_no: o.order_no, buyer: o.buyer_name, kind,
        kindKr: KIND_KR[kind] || kind, ok, msg, before, after });
    }

    const good = results.filter(r => r.ok), bad = results.filter(r => !r.ok);
    const summary = results.map(r =>
      `${r.ok ? '✓' : '✕'} ${r.order_no} ${r.buyer || ''} · ${r.kindKr} · ${r.msg}`).join('\n');

    const notified = await tellOwner(
      `비서가 ${good.length}건 처리했습니다` + (bad.length ? ` (실패 ${bad.length}건)` : ''),
      `${me.email} 이름으로 처리했습니다.\n\n${summary}`);

    const kakao = '[츄구미] 주문 처리 안내\n\n' + good.map(r =>
      `주문번호 ${r.order_no}\n${r.kindKr} — ${r.msg}`).join('\n\n');

    return json({ ok: true, results, notified, kakao,
      msg: `${good.length}건 처리했습니다` + (bad.length ? ` · ${bad.length}건 실패` : ''),
      undoable: good.filter(r => ['address', 'status', 'hide'].includes(r.kind)).map(r => r.order_no) });
  }

  /* ─────────── 비서가 한 일 (사장님 확인용) ─────────── */
  if (action === 'feed') {
    const days = Math.min(90, Math.max(1, Number(body.days) || 7));
    const from = new Date(Date.now() - days * 86400000).toISOString();
    const { data } = await db.from('order_logs')
      .select('order_no,action,detail,before_val,after_val,actor,created_at')
      .like('action', 'bot:%')
      .gte('created_at', from)
      .order('created_at', { ascending: false }).limit(200);
    const items = (data || []).map((r: any) => ({
      order_no: r.order_no,
      kind: String(r.action || '').replace(/^bot:/, ''),
      kindKr: KIND_KR[String(r.action || '').replace(/^bot:/, '')] || r.action,
      detail: r.detail, before: r.before_val, after: r.after_val,
      actor: r.actor, at: r.created_at,
    }));
    return json({ ok: true, days, count: items.length, items });
  }

  return json({ ok: false, error: '알 수 없는 요청: ' + action });
});
