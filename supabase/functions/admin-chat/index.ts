/* 츄구미 — 관리 비서 admin-chat (v5 · 2026-09-25 · GitHub #156 CG-156-1 · CG-156-2)
 *
 *  v4 까지는 현황을 다 알면서도 답이 늘 글로만 나왔습니다 (Claude 호출에 tools 가 없음).
 *  v5 는 세 단으로 돕니다.
 *
 *    0단 (토큰 0)   「오늘 할 일」처럼 늘 같은 질문 → todos() 가 코드로 답합니다. Claude 를 부르지 않습니다.
 *                   한 번 통한 길은 ai_patterns 표에 적어 두고, 같은 모양이 다시 오면 여기서 끝냅니다.
 *    1단 (Claude)   판단이 필요한 것만. 도구 셋 — 조회 둘(orders_today · refund_info)은 바로 돌고,
 *                   주문을 바꾸는 일(plan_orders)은 order-bot 에 계획만 시킵니다.
 *    2단 (토큰 0)   계획은 카드(handoff)로 화면에 갑니다. 운영자가 「이대로 처리」를 눌러야
 *                   order-bot run 이 실제로 바꿉니다. 이 함수는 아무것도 바꾸지 않습니다.
 *
 *  선 (대표님 결정 · #156)
 *    바로 실행   조회 · 환불 가능 확인 · 「오늘 할 일」
 *    한 번 눌러야 환불 실행 · 운송장 등록 · 손님에게 나가는 문자·메일   ← 전부 order-bot 카드 뒤에 있습니다
 *
 *  저장소 사본입니다. 배포는 supabase/functions/README.md 를 보세요.
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
const admin = createClient(URL_, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

async function secret(k: string) {
  const e = Deno.env.get(k);
  if (e) return e;
  const { data } = await admin.from('app_secrets').select('value').eq('key', k).maybeSingle();
  return data?.value || '';
}
async function setting(k: string, d = '') {
  const { data } = await admin.from('shop_settings').select('value').eq('key', k).maybeSingle();
  return data?.value || d;
}
async function requireAdmin(req: Request) {
  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!jwt) return null;
  const { data } = await admin.auth.getUser(jwt);
  const email = data?.user?.email;
  if (!email) return null;
  const { data: r } = await admin.from('admins').select('email').eq('email', email).maybeSingle();
  return r ? email : null;
}

/* 다른 함수를 부를 때 부른 사람의 권한을 그대로 넘깁니다 (order-bot 과 같은 방식) */
async function callFn(name: string, body: unknown, auth: string) {
  const r = await fetch(`${URL_}/functions/v1/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: Deno.env.get('SUPABASE_ANON_KEY') || '', Authorization: auth },
    body: JSON.stringify(body),
  });
  let d: any = {};
  try { d = await r.json(); } catch { /* 본문 없음 */ }
  return d;
}

async function snapshot() {
  const today = new Date().toISOString().slice(0, 10);
  const n = async (t: string, f?: (q: any) => any) => {
    let q = admin.from(t).select('*', { count: 'exact', head: true });
    if (f) q = f(q);
    const { count } = await q;
    return count || 0;
  };
  const [pending, paid, qna, subPend, subDue, sold, low, unsent, issues, plans, helps] =
    await Promise.all([
      n('orders', q => q.eq('status', 'pending').eq('is_test', false)),
      n('orders', q => q.in('status', ['paid', 'preparing']).eq('is_test', false)),
      n('posts', q => q.eq('board', 'qna').neq('answer_status', 'done').is('deleted_at', null)),
      n('subscriptions', q => q.eq('status', 'pending')),
      n('subscriptions', q => q.eq('status', 'active').lte('next_ship_date', today)),
      n('products', q => q.eq('active', true).lte('stock', 0)),
      n('products', q => q.eq('active', true).gt('stock', 0).lt('stock', 10)),
      n('notifications', q => q.eq('status', 'queued')),
      n('issues', q => q.eq('status', 'open')),
      n('subscription_plans', q => q.is('deleted_at', null)),
      n('help_requests', q => q.eq('status', 'queued')),
    ]);
  const { data: tok } = await admin.from('cafe24_tokens').select('mall_id').maybeSingle();
  const { data: recent } = await admin.from('orders')
    .select('order_no,buyer_name,pay_amount,status,created_at')
    .eq('is_test', false)
    .order('created_at', { ascending: false }).limit(5);
  const { data: logs } = await admin.from('audit_logs')
    .select('area,action,target_name,actor,created_at')
    .order('created_at', { ascending: false }).limit(5);

  return {
    orders: { pending, toShip: paid, recent: recent || [] },
    qnaWaiting: qna,
    subs: { pending: subPend, due: subDue, plans },
    stock: { soldOut: sold, low },
    notifQueued: unsent,
    issuesOpen: issues,
    helpQueued: helps,
    cafe24: !!tok,
    bank: { name: await setting('bank_name'), no: await setting('bank_account'),
      holder: await setting('bank_holder'), days: await setting('deposit_days', '7') },
    recentChanges: logs || [],
  };
}

function todos(s: any) {
  const t: any[] = [];
  if (s.qnaWaiting) t.push({ p: 1, t: `답변 대기 문의 ${s.qnaWaiting}건`,
    d: '고객이 기다리고 있습니다.', u: 'posts.html' });
  if (s.orders.pending) t.push({ p: 1, t: `입금 대기 주문 ${s.orders.pending}건`,
    d: '입금 확인 후 발송 준비를 해주세요.', u: 'orders.html' });
  if (s.orders.toShip) t.push({ p: 1, t: `발송할 주문 ${s.orders.toShip}건`,
    d: '운송장을 등록해 주세요.', u: 'orders.html', act: '발송할 주문 알려줘' });
  if (s.subs.due) t.push({ p: 1, t: `오늘 발송할 구독 ${s.subs.due}건`,
    d: '정기배송 예정일입니다.', u: 'subs-admin.html' });
  if (s.helpQueued) t.push({ p: 1, t: `담당자 요청 ${s.helpQueued}건`,
    d: '수정 요청이 접수되었습니다.', u: 'dev.html' });
  if (s.subs.pending) t.push({ p: 2, t: `구독 입금 대기 ${s.subs.pending}건`,
    d: '입금 확인 후 구독을 시작해 주세요.', u: 'subs-admin.html' });
  if (s.stock.soldOut) t.push({ p: 1, t: `품절 상품 ${s.stock.soldOut}건`,
    d: '판매가 멈춰 있습니다.', u: 'stock.html' });
  if (s.stock.low) t.push({ p: 2, t: `재고 부족 ${s.stock.low}건`,
    d: '10개 미만 남았습니다.', u: 'stock.html' });
  if (s.issuesOpen) t.push({ p: 2, t: `접수된 이슈 ${s.issuesOpen}건`,
    d: '사이트 수정 요청입니다.', u: 'issue.html' });
  if (!s.cafe24) t.push({ p: 2, t: '카페24 연동 미완료',
    d: '공식몰 주문·재고를 볼 수 없습니다.', u: 'cafe24.html' });
  return t.sort((a, b) => a.p - b.p);
}

/* 0단이 코드로 만드는 답 — Claude 없이 */
function todoText(s: any) {
  const t = todos(s);
  if (!t.length) return '지금 처리할 일이 없습니다.';
  return '지금 처리할 일 (급한 순)\n' + t.slice(0, 5).map((x, i) => `${i + 1}. ${x.t} — ${x.d} (${x.u})`).join('\n');
}

/* ── ai_patterns (CG-156-2): 통한 길을 적어 두고 같은 모양이면 0단에서 끝냅니다 ── */
const NO_RE = /\d{8}-\d{6}/;
function shapeOf(q: string) {
  return q.toLowerCase().replace(/\d{8}-\d{6}/g, 'ORDER').replace(/\d+/g, 'N').replace(/[^\p{L}\p{N} ]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 120);
}
async function patternFor(shape: string) {
  if (!shape) return null;
  const { data } = await admin.from('ai_patterns').select('tool,args_template,hits').eq('shape', shape).maybeSingle();
  return data || null;
}
async function remember(shape: string, tool: string, args: Record<string, unknown>) {
  if (!shape || !tool) return;
  try {
    const { data } = await admin.from('ai_patterns').select('id,hits').eq('shape', shape).maybeSingle();
    if (data) await admin.from('ai_patterns').update({ hits: (data.hits || 0) + 1, last_ok: new Date().toISOString(), tool, args_template: args }).eq('id', data.id);
    else await admin.from('ai_patterns').insert({ shape, tool, args_template: args });
  } catch { /* 패턴 저장 실패는 답을 막지 않습니다 */ }
}

const TODO_RE = /(할\s*일|해야\s*(할|될|하)|오늘\s*(뭐|무엇|현황|상황)|현황\s*(알려|보여)|처리할\s*(것|거|일))/;

/* ── 도구 (CG-156-1) ── 조회 둘은 바로, 바꾸는 일은 계획만 ── */
const TOOLS = [
  { name: 'orders_today',
    description: '지금 처리할 일과 주문 현황(입금 대기 · 발송할 것 · 최근 주문 5건)을 봅니다. 아무것도 바꾸지 않습니다.',
    input_schema: { type: 'object', properties: {} } },
  { name: 'refund_info',
    description: '주문 하나의 환불 가능 여부 · 남은 금액 · 결제 수단 · 고객의 취소 요청 내용을 봅니다. 아무것도 바꾸지 않습니다.',
    input_schema: { type: 'object', properties: { order_no: { type: 'string', description: '주문번호 (예: 20260820-142834)' } }, required: ['order_no'] } },
  { name: 'plan_orders',
    description: '발송(운송장 등록) · 주문 취소 · 환불 실행 · 배송지 수정처럼 주문을 실제로 바꾸는 일. 계획만 세워 운영자에게 카드로 보여 주고, 운영자가 「이대로 처리」를 눌러야 실행됩니다. 이 도구는 직접 바꾸지 않습니다. 돈이 나가거나 손님에게 연락이 나가는 일은 반드시 이 도구로 넘깁니다.',
    input_schema: { type: 'object', properties: { request: { type: 'string', description: '운영자의 요청을 주문번호 · 택배사 · 운송장번호 · 금액까지 그대로 담아서' } }, required: ['request'] } },
];

async function runTool(name: string, input: any, auth: string, state: { handoff: any }) {
  if (name === 'orders_today') {
    const s = await snapshot();
    return { text: JSON.stringify({ todos: todos(s), orders: s.orders, subs: s.subs, stock: s.stock }), tool: name, args: {} };
  }
  if (name === 'refund_info') {
    const order_no = String(input?.order_no || '').trim();
    if (!NO_RE.test(order_no)) return { text: '{"error":"주문번호 모양이 아닙니다"}', tool: name, args: {} };
    const d = await callFn('refund', { action: 'info', order_no }, auth);
    return { text: JSON.stringify(d), tool: name, args: { order_no: 'ORDER' } };
  }
  if (name === 'plan_orders') {
    const request = String(input?.request || '').slice(0, 800);
    const d = await callFn('order-bot', { action: 'ask', q: request }, auth);
    if (d?.ok) {
      state.handoff = { q: request, jobs: d.jobs || [], note: d.note || '' };
      const n = (d.jobs || []).length;
      return { text: n ? `계획 ${n}건을 카드로 보여 줍니다. 운영자가 「이대로 처리」를 누르면 실행됩니다. 처리 내용을 한두 줄로 요약해 주세요. 주문번호를 지어내지 마세요.` : `바꿀 것을 찾지 못했습니다: ${d.note || ''}`, tool: name, args: { request: '$q' } };
    }
    return { text: JSON.stringify({ error: d?.error || '계획을 세우지 못했습니다' }), tool: name, args: {} };
  }
  return { text: '{"error":"모르는 도구"}', tool: name, args: {} };
}

const SYS = `당신은 츄구미(ChewGumi) 쇼핑몰의 운영을 돕는 관리 비서입니다.

[문의하는 사람]
츄구미 운영자입니다. 개발자가 아니므로 기술 용어를 풀어서 설명합니다.

[답변 원칙]
1. 아래 제공된 현황 데이터와 도구 결과만 근거로 답합니다. 수치·주문번호를 지어내지 않습니다.
2. 데이터에 없는 것을 물으면 "그 정보는 지금 확인할 수 없습니다"라고 솔직히 말합니다.
3. 할 일을 물으면 급한 순서로 3개 이내로 알려줍니다.
4. 어느 화면에서 처리하는지 파일명을 함께 알려줍니다.
5. 건강기능식품 효능·치료 표현을 쓰지 않습니다.
6. 답변은 짧게. 불필요한 인사나 반복을 뺍니다.
7. 지난 대화가 있으면 맥락을 이어갑니다. 없으면 새로 시작합니다.

[도구 쓰는 법]
· 조회(orders_today · refund_info)는 바로 써도 됩니다.
· 주문을 바꾸는 요청(발송 · 취소 · 환불 · 배송지)은 plan_orders 로 넘깁니다. 직접 "처리했다"고 말하지 마세요 —
  운영자가 카드를 눌러야 처리됩니다. "카드를 확인하고 이대로 처리를 눌러 주세요"라고 안내합니다.
· 환불은 먼저 refund_info 로 가능한지 본 뒤 plan_orders 로 넘깁니다.

[주문 변경·취소 문의 응대 기준 — 전자상거래법]
· 발송 전: 자유롭게 변경·취소 가능. 바로 처리해 드리면 됩니다.
· 발송 후: 수령일로부터 7일 이내 청약철회 가능.
  단순 변심이면 왕복 배송비는 고객 부담입니다.
· 식품 예외: 개봉했거나 신선도가 떨어진 경우 반품 거절 가능.
  단, 주문서에 미리 안내했어야 합니다.
· 불량·오배송: 배송비를 포함해 판매자가 전액 부담합니다.
응대문을 써달라고 하면 위 기준을 반영해 공손하게 작성합니다.

[사이트 구조]
고객: index about product cart checkout join login mypage subscribe
  notice review qna reports faq guide tracking wish
관리: console orders(주문·배송) stock(재고) members posts(게시물)
  campaign(마케팅) subs-admin(구독) reports-admin(고객리포트)
  export-ai(수출) dev(AI 개발) github(개발현황) cafe24(API)
  grievance(규제) help(도움말) issue(이슈)`;

async function saveChat(who: string, q: string, text: string) {
  await admin.from('admin_chats').insert([
    { actor: who, scope: 'console', msg_role: 'user', msg_text: q },
    { actor: who, scope: 'console', msg_role: 'ai', msg_text: text }
  ]);
  admin.rpc('prune_admin_chats').then(() => {}).catch(() => {});
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const who = await requireAdmin(req);
  if (!who) return json({ error: '운영자 권한이 필요합니다.' }, 403);
  const auth = req.headers.get('Authorization') || '';

  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'invalid json' }, 400); }

  if (body.action === 'snapshot') {
    const s = await snapshot();
    const { data: past } = await admin.from('admin_chats')
      .select('msg_role,msg_text,created_at')
      .eq('actor', who).eq('scope', 'console')
      .order('created_at', { ascending: false }).limit(8);
    return json({ ok: true, snap: s, todos: todos(s),
      past: (past || []).reverse().map((m: any) => ({
        role: m.msg_role === 'user' ? 'me' : 'ai', text: m.msg_text })) });
  }

  if (body.action === 'clear') {
    await admin.from('admin_chats').delete().eq('actor', who).eq('scope', 'console');
    return json({ ok: true });
  }

  if (body.action === 'ask') {
    const q = String(body.q || '').slice(0, 1500).trim();
    if (!q) return json({ error: '무엇을 도와드릴까요?' }, 400);
    const shape = shapeOf(q);

    /* ── 0단: 코드로 답할 수 있는 것 (토큰 0) ── */
    if (TODO_RE.test(q) && q.length < 40) {
      const text = todoText(await snapshot());
      await saveChat(who, q, text);
      await remember(shape, 'orders_today', {});
      return json({ ok: true, text, tier: 0 });
    }
    const pat = await patternFor(shape);
    if (pat?.tool === 'orders_today') {
      const text = todoText(await snapshot());
      await saveChat(who, q, text);
      await remember(shape, 'orders_today', {});
      return json({ ok: true, text, tier: 0 });
    }
    if (pat?.tool === 'plan_orders') {
      /* 계획은 order-bot 이 세웁니다 (거기서 Claude 한 번). 여기서는 부르지 않습니다 */
      const d = await callFn('order-bot', { action: 'ask', q }, auth);
      if (d?.ok) {
        const n = (d.jobs || []).length;
        const text = n ? `아래 카드 ${n}건을 확인하고 「이대로 처리」를 눌러 주세요.` : (d.note || '바꿀 것을 찾지 못했습니다.');
        await saveChat(who, q, text);
        await remember(shape, 'plan_orders', { request: '$q' });
        return json({ ok: true, text, tier: 0, handoff: { q, jobs: d.jobs || [], note: d.note || '' } });
      }
    }
    if (pat?.tool === 'refund_info' && NO_RE.test(q)) {
      const order_no = (q.match(NO_RE) || [''])[0];
      const d = await callFn('refund', { action: 'info', order_no }, auth);
      if (d?.ok) {
        const text = `${d.order_no} · ${d.buyer || ''}\n환불 가능 ${d.can ? '예' : '아니요'}${d.why ? ' — ' + d.why : ''}\n결제 ${Number(d.pay_amount || 0).toLocaleString()}원 · 이미 환불 ${Number(d.refunded || 0).toLocaleString()}원 · 남은 금액 ${Number(d.left || 0).toLocaleString()}원 · 수단 ${d.pay_method || '-'}${d.need_account ? ' · 환불 계좌 필요' : ''}${d.cancel_req_note ? '\n고객 취소 요청: ' + d.cancel_req_note : ''}\n환불하려면 "이 주문 환불해줘"라고 말씀해 주세요.`;
        await saveChat(who, q, text);
        await remember(shape, 'refund_info', { order_no: 'ORDER' });
        return json({ ok: true, text, tier: 0 });
      }
    }

    /* ── 1단: Claude + 도구 ── */
    const AI = await secret('ANTHROPIC_API_KEY');
    if (!AI) return json({ error: 'AI 키가 등록되지 않았습니다.' }, 503);
    const s = await snapshot();
    const model = await setting('ai_model', 'claude-sonnet-5');

    const ctx = `[현재 현황 — ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}]
주문: 입금대기 ${s.orders.pending}건, 발송할 것 ${s.orders.toShip}건
최근 주문: ${(s.orders.recent || []).map((o: any) =>
      `${o.order_no} ${o.buyer_name} ${Number(o.pay_amount).toLocaleString()}원 (${o.status})`).join(' / ') || '없음'}
문의: 답변대기 ${s.qnaWaiting}건
재고: 품절 ${s.stock.soldOut}건, 10개 미만 ${s.stock.low}건
구독: 상품 ${s.subs.plans}개, 입금대기 ${s.subs.pending}건, 오늘발송 ${s.subs.due}건
담당자 요청: ${s.helpQueued}건 · 이슈: ${s.issuesOpen}건
카페24 연동: ${s.cafe24 ? '완료' : '미완료'}
입금계좌: ${s.bank.name} ${s.bank.no} (예금주 ${s.bank.holder}, 기한 ${s.bank.days}일)
최근 변경: ${(s.recentChanges || []).map((l: any) =>
      `${l.area} ${l.action} ${l.target_name}`).join(' / ') || '없음'}`;

    const { data: saved } = await admin.from('admin_chats')
      .select('msg_role,msg_text')
      .eq('actor', who).eq('scope', 'console')
      .order('created_at', { ascending: false }).limit(10);
    const hist = (saved || []).reverse().map((m: any) => ({
      role: m.msg_role === 'user' ? 'user' : 'assistant',
      content: String(m.msg_text || '').slice(0, 1200)
    }));

    const messages: any[] = [...hist, { role: 'user', content: q }];
    const state = { handoff: null as any };
    const used: { tool: string; args: Record<string, unknown> }[] = [];
    let text = '';

    for (let round = 0; round < 4; round++) {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': AI, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, max_tokens: 1200, system: SYS + '\n\n' + ctx, tools: TOOLS, messages })
      });
      const d = await r.json();
      if (!r.ok) return json({ error: d?.error?.message || 'AI 호출에 실패했습니다.' }, 400);
      const content = d.content || [];
      text = content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n').trim() || text;
      const calls = content.filter((c: any) => c.type === 'tool_use');
      if (d.stop_reason !== 'tool_use' || !calls.length) break;

      messages.push({ role: 'assistant', content });
      const results: any[] = [];
      for (const c of calls) {
        const out = await runTool(c.name, c.input, auth, state);
        used.push({ tool: out.tool, args: out.args });
        results.push({ type: 'tool_result', tool_use_id: c.id, content: out.text.slice(0, 6000) });
      }
      messages.push({ role: 'user', content: results });
    }

    if (!text) text = state.handoff ? '아래 카드를 확인하고 「이대로 처리」를 눌러 주세요.' : '답을 만들지 못했습니다. 다시 물어봐 주세요.';
    await saveChat(who, q, text);

    /* 도구 하나로 끝난 길만 기억합니다 — 다음엔 0단에서 끝나도록 */
    if (used.length === 1 && ['orders_today', 'plan_orders', 'refund_info'].includes(used[0].tool)) {
      await remember(shape, used[0].tool, used[0].args);
    }

    return json({ ok: true, text, tier: 1, tools: used.map(u => u.tool), handoff: state.handoff || undefined });
  }

  return json({ error: 'unknown action' }, 400);
});
