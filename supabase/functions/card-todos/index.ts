/*  card-todos — 대표님 카드에 「오늘 할 일」을 보여 주기 위한 읽기 전용 창구
 *  ════════════════════════════════════════════════════════════════════
 *
 *  왜 따로 만들었나
 *  ---------------
 *  대표님이 보시는 setup.html 은 로그인이 아니라 한 번 쓰는 링크(토큰)로 열립니다.
 *  console.html 의 「지금 처리할 일」은 admin-chat 이 주는데, 그것은 운영자 JWT 를
 *  요구하므로 카드에서는 부를 수 없습니다.
 *
 *  무엇까지 내보내나 — 숫자만
 *  -------------------------
 *  「발송할 주문 3건」처럼 **세어 놓은 개수만** 나갑니다.
 *  주문번호 · 주문자 이름 · 금액 · 주소는 한 글자도 나가지 않습니다.
 *  바꾸는 일(발송·환불)은 여기에 없습니다. 그것은 로그인한 뒤 console.html 에서만 합니다.
 *
 *  왜 이만큼은 괜찮은가
 *  -------------------
 *  이 링크는 이미 「가게의 API 열쇠를 넣을 수 있는 권한」입니다.
 *  개수를 보여 주는 것은 그보다 훨씬 약합니다. 그래도 선은 분명히 둡니다 —
 *  **읽기만, 숫자만.** 이 파일에 쓰기(update·insert·delete)를 넣지 마세요.
 *
 *  주고받는 것
 *  ----------
 *    POST { token }  →  { ok, at, todos:[{p,t,d}] }
 *                       { ok:false, error }   링크가 없거나 닫혔거나 기한이 지남
 *
 *  todos 의 뜻은 admin-chat 의 것과 같게 맞춰 두었습니다.
 *  그쪽을 고치면 여기도 함께 고쳐야 숫자가 어긋나지 않습니다.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

const db = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

/* 개수만 셉니다 — head:true 라 줄 내용은 받아오지 않습니다 */
async function n(table: string, f?: (q: any) => any) {
  let q = db.from(table).select('*', { count: 'exact', head: true });
  if (f) q = f(q);
  const { count } = await q;
  return count || 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ ok: false, error: 'POST only' }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, error: 'invalid json' }, 400); }

  const token = String(body.token || '');
  if (!/^[0-9a-f]{48}$/.test(token)) return json({ ok: false, error: '링크가 올바르지 않습니다' }, 400);

  /* setup-wizard 와 똑같은 문지기 — 있는 링크인지, 닫히지 않았는지, 기한이 남았는지 */
  const { data: inv } = await db.from('setup_invites')
    .select('revoked,expires_at').eq('token', token).maybeSingle();
  if (!inv) return json({ ok: false, error: '링크를 찾지 못했습니다' }, 404);
  if (inv.revoked) return json({ ok: false, error: '이 링크는 닫혔습니다' }, 410);
  if (new Date(inv.expires_at) < new Date())
    return json({ ok: false, error: '링크 기한이 지났습니다' }, 410);

  const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10); /* 한국 날짜 */

  const [pending, toShip, qna, subPend, subDue, sold, low] = await Promise.all([
    n('orders', (q) => q.eq('status', 'pending')),
    n('orders', (q) => q.in('status', ['paid', 'preparing'])),
    n('posts', (q) => q.eq('board', 'qna').neq('answer_status', 'done').is('deleted_at', null)),
    n('subscriptions', (q) => q.eq('status', 'pending')),
    n('subscriptions', (q) => q.eq('status', 'active').lte('next_ship_date', today)),
    n('products', (q) => q.eq('active', true).lte('stock', 0)),
    n('products', (q) => q.eq('active', true).gt('stock', 0).lt('stock', 10)),
  ]);

  const t: { p: number; t: string; d: string }[] = [];
  if (qna)     t.push({ p: 1, t: `답변 대기 문의 ${qna}건`,        d: '고객이 기다리고 있습니다.' });
  if (pending) t.push({ p: 1, t: `입금 대기 주문 ${pending}건`,    d: '입금이 확인되면 발송 준비로 넘어갑니다.' });
  if (toShip)  t.push({ p: 1, t: `발송할 주문 ${toShip}건`,        d: '운송장을 넣으면 고객에게 안내가 나갑니다.' });
  if (subDue)  t.push({ p: 1, t: `오늘 발송할 구독 ${subDue}건`,   d: '정기배송 예정일입니다.' });
  if (sold)    t.push({ p: 1, t: `품절 상품 ${sold}건`,            d: '판매가 멈춰 있습니다.' });
  if (subPend) t.push({ p: 2, t: `구독 입금 대기 ${subPend}건`,    d: '입금이 확인되면 구독이 시작됩니다.' });
  if (low)     t.push({ p: 2, t: `재고 부족 ${low}건`,             d: '10개 미만 남았습니다.' });
  t.sort((a, b) => a.p - b.p);

  return json({
    ok: true,
    at: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
    todos: t,
  });
});
