/* 츄구미 — 발송 안내 메일 (ship-mail v2)
 * 저장소 사본 (2026-09-25 · Supabase 배포 v2 와 같음). 배포는 supabase/functions/README.md.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

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

const SITE = 'https://shop.chewgumi.com';
const esc = (s: unknown) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const won = (n: unknown) => Number(n || 0).toLocaleString('ko-KR');

/* 택배사 조회 주소 */
const TRACK: Record<string, string> = {
  '04': 'https://www.cjlogistics.com/ko/tool/parcel/tracking',
  '05': 'https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do',
  '08': 'https://www.lotteglogis.com/home/reservation/tracking/index',
  '06': 'https://www.epost.go.kr/search/trace/postal.jsp',
  '01': 'https://www.epost.go.kr/search/trace/postal.jsp',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ ok: false, error: 'POST only' });

  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }

  const on = (await setting('ship_notify_on', 'off')) === 'on';
  const mailOn = (await setting('ship_notify_email', 'off')) === 'on';
  if (!on || !mailOn) return json({ ok: false, error: '발송 알림이 꺼져 있습니다' });

  const no = String(body.order_no || '').trim();
  if (!no) return json({ ok: false, error: '주문번호가 없습니다' });

  const { data: o } = await db.from('orders')
    .select('*').eq('order_no', no).maybeSingle();
  if (!o) return json({ ok: false, error: '주문을 찾지 못했습니다' });
  if (!o.buyer_email) return json({ ok: false, error: '고객 메일이 없습니다' });

  const { data: items } = await db.from('order_items')
    .select('product_name,qty').eq('order_id', o.id);

  const rk = await secret('RESEND_API_KEY');
  if (!rk) return json({ ok: false, error: '메일 키가 없습니다' });
  const from = await setting('mail_from', 'ChewGumi <onboarding@resend.dev>');

  const list = (items || [])
    .map((i: any) => `${esc(i.product_name)} <span style="color:#797979">${i.qty}개</span>`)
    .join('<br>') || '상품';

  const trackUrl = TRACK[o.courier_code] || '';
  const trackBtn = o.tracking_no
    ? `<div style="margin-top:24px;text-align:center;">
         <a href="${SITE}/tracking.html?no=${esc(o.tracking_no)}"
           style="display:inline-block;min-width:190px;padding:15px 26px;border-radius:999px;
           text-decoration:none;font-weight:700;font-size:14.5px;color:#fff;
           background:linear-gradient(135deg,#E95073,#D82558);">배송 조회하기</a>
       </div>` : '';

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:24px;
  background:#FDF3F5;font-family:'SUIT Variable',-apple-system,BlinkMacSystemFont,
  'Apple SD Gothic Neo',sans-serif;color:#17171c;line-height:1.7;">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:20px;
  padding:32px 28px;box-shadow:0 10px 28px rgba(0,0,0,.07);">

  <div style="font-size:11px;letter-spacing:2.4px;color:#D82558;font-weight:700;">CHEWGUMI</div>
  <h1 style="margin:8px 0 0;font-size:21px;font-weight:800;letter-spacing:-.03em;">발송했습니다</h1>
  <p style="margin:9px 0 0;font-size:14px;color:#555;">
    ${esc(o.buyer_name)}님, 주문하신 상품을 보냈습니다.<br>
    보통 1~2일 안에 받으실 수 있습니다.</p>

  <div style="margin-top:24px;padding:20px 22px;border-radius:16px;
    background:#FFF4F7;border:1px solid #FFD6E0;">
    <p style="margin:0 0 9px;font-size:12px;font-weight:700;color:#D82558;
      letter-spacing:1.4px;">TRACKING</p>
    <p style="margin:0;font-size:18px;font-weight:800;letter-spacing:-.02em;">
      ${esc(o.tracking_no || '—')}</p>
    <p style="margin:5px 0 0;font-size:13px;color:#666;">${esc(o.courier || '택배')}</p>
    ${trackUrl ? `<p style="margin:9px 0 0;font-size:12px;">
      <a href="${trackUrl}" style="color:#D82558;">택배사 페이지에서 보기 ↗</a></p>` : ''}
  </div>

  ${trackBtn}

  <table style="width:100%;margin-top:26px;border-top:1px solid rgba(0,0,0,.08);
    border-collapse:collapse;">
    <tr><td style="padding:10px 0;font-size:13px;color:#797979;white-space:nowrap;" valign="top">주문번호</td>
        <td style="padding:10px 0 10px 16px;font-size:13.5px;font-weight:700;">${esc(o.order_no)}</td></tr>
    <tr><td style="padding:10px 0;font-size:13px;color:#797979;" valign="top">상품</td>
        <td style="padding:10px 0 10px 16px;font-size:13.5px;">${list}</td></tr>
    <tr><td style="padding:10px 0;font-size:13px;color:#797979;" valign="top">받는 곳</td>
        <td style="padding:10px 0 10px 16px;font-size:13.5px;">
          (${esc(o.zipcode)}) ${esc(o.addr1)} ${esc(o.addr2 || '')}</td></tr>
    <tr><td style="padding:10px 0;font-size:13px;color:#797979;" valign="top">결제 금액</td>
        <td style="padding:10px 0 10px 16px;font-size:13.5px;font-weight:700;">${won(o.pay_amount)}원</td></tr>
  </table>

  <p style="margin:24px 0 0;padding-top:20px;border-top:1px solid rgba(0,0,0,.06);
    font-size:12px;color:#9a9aa2;line-height:1.9;">
    받으신 뒤 후기를 남겨주시면 다른 분들께 큰 도움이 됩니다.<br>
    문의 · chewgumi24@gmail.com · 카카오톡 채널
  </p>
</div></body></html>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${rk}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [o.buyer_email],
        subject: `[츄구미] 발송했습니다 · ${o.order_no}`,
        html,
      }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return json({ ok: false, error: d?.message || `보내지 못했습니다 (${r.status})` });

    await db.from('order_logs').insert({
      order_no: no, kind: 'ship_mail',
      note: `${o.buyer_email} 로 발송 안내 보냄`,
    }).then(() => {}, () => {});

    return json({ ok: true, msg: `${o.buyer_email} 로 발송 안내를 보냈습니다` });
  } catch (e) {
    return json({ ok: false, error: String(e).slice(0, 140) });
  }
});
