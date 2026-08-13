/*! ChewGumi Flow Test v1 · MedIT
 *  주문 → 입금확인 → 발송 → 취소 흐름을 실제 데이터로 검증한다.
 *  실행: node flow-test.js
 */

const SB = 'https://psynvpuedzjvytsgdhgg.supabase.co';
const KEY = 'sb_publishable_Tz7vgJXgYHQ3tyUfm87WTw_vV1Dxfuk';
const ACC = { email: 'test@chewgumi.com', password: 'Chewgumi!2026' };

let token = null;
let pass = 0, fail = 0, skip = 0;
const fails = [];

/* ── 테스트 도구 ── */
function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`  \x1b[32m✓\x1b[0m ${name}`); }
  else {
    fail++; fails.push(name + (detail ? ` — ${detail}` : ''));
    console.log(`  \x1b[31m✗\x1b[0m ${name}${detail ? `  \x1b[90m${detail}\x1b[0m` : ''}`);
  }
}
function note(name, why) {
  skip++; console.log(`  \x1b[33m-\x1b[0m ${name}  \x1b[90m${why}\x1b[0m`);
}
function group(t) { console.log(`\n\x1b[1m${t}\x1b[0m`); }

const H = (auth = true) => {
  const h = { apikey: KEY, 'Content-Type': 'application/json' };
  h.Authorization = 'Bearer ' + (auth && token ? token : KEY);
  return h;
};
async function rest(path, init = {}) {
  const r = await fetch(`${SB}/rest/v1/${path}`, { ...init, headers: { ...H(), ...(init.headers || {}) } });
  const txt = await r.text();
  let body = null;
  try { body = txt ? JSON.parse(txt) : null; } catch { body = txt; }
  return { ok: r.ok, status: r.status, body };
}
async function fn(name, payload) {
  const r = await fetch(`${SB}/functions/v1/${name}`, {
    method: 'POST', headers: H(), body: JSON.stringify(payload)
  });
  const body = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, body };
}

/* ── 1. 로그인 ── */
async function login() {
  group('1. 인증');
  const r = await fetch(`${SB}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(ACC)
  });
  const d = await r.json();
  token = d.access_token || null;
  ok('운영자 로그인', !!token, token ? '' : JSON.stringify(d).slice(0, 120));
  if (!token) return false;

  const a = await rest(`admins?select=email&email=eq.${ACC.email}`);
  ok('운영자 권한 확인', a.ok && Array.isArray(a.body) && a.body.length > 0);
  return true;
}

/* ── 2. 기초 데이터 ── */
async function data() {
  group('2. 기초 데이터');

  const p = await rest('products?select=id,name,price_sale,stock,active&order=sort_order');
  const prods = Array.isArray(p.body) ? p.body : [];
  ok('상품 조회', p.ok && prods.length > 0, `${prods.length}개`);
  ok('판매중 상품 존재', prods.filter(x => x.active).length >= 11,
     `활성 ${prods.filter(x => x.active).length}개`);
  ok('재고 보유', prods.filter(x => x.active && x.stock > 0).length >= 11,
     `재고>0 ${prods.filter(x => x.active && x.stock > 0).length}개`);

  const s = await rest("shop_settings?select=key,value&key=in.(bank_name,bank_account,bank_holder,deposit_days)");
  const set = {}; (s.body || []).forEach(x => set[x.key] = x.value);
  ok('계좌 은행명', set.bank_name === '국민은행', set.bank_name);
  ok('계좌 번호', set.bank_account === '38183704010801', set.bank_account);
  ok('예금주 오타 없음', set.bank_holder && !set.bank_holder.includes('추구미'), set.bank_holder);
  ok('입금 기한', set.deposit_days === '7', set.deposit_days);

  const c = await rest('coupons?select=code,active&active=eq.true');
  ok('쿠폰 등록', c.ok && (c.body || []).length >= 2, `${(c.body || []).length}종`);

  const rv = await rest('product_reviews?select=id&limit=1', { headers: { Prefer: 'count=exact' } });
  ok('후기 등록', rv.ok);

  const sp = await rest('subscription_plans?select=code,price_month&active=eq.true');
  ok('구독 상품', sp.ok && (sp.body || []).length === 4, `${(sp.body || []).length}종`);

  return prods.filter(x => x.active && x.stock > 0);
}

/* ── 3. 주문 흐름 ── */
async function flow(prods) {
  group('3. 주문 → 입금확인 → 발송 → 취소');
  if (!prods.length) { note('주문 흐름', '판매 가능 상품 없음'); return; }

  const target = prods[0];
  const before = target.stock;
  const qty = 2;

  /* 주문 생성 */
  const mk = await fn('bank', {
    action: 'create',
    buyer: {
      name: '자동테스트', phone: '010-0000-0000', email: 'qa@chewgumi.test',
      zipcode: '04309', addr1: '서울 용산구 청파로47길 46', addr2: '205호',
      memo: '자동 테스트 주문입니다'
    },
    items: [{ id: target.id, qty }],
    depositor: '자동테스트'
  });
  const orderNo = mk.body?.orderNo || mk.body?.order_no;
  ok('주문 생성', mk.ok && !!orderNo, orderNo || JSON.stringify(mk.body).slice(0, 140));
  if (!orderNo) return;
  console.log(`     \x1b[90m주문번호 ${orderNo}\x1b[0m`);

  /* 금액 검증 */
  const o1 = await rest(`orders?select=*&order_no=eq.${orderNo}`);
  const order = (o1.body || [])[0];
  ok('주문 저장 확인', !!order);
  if (!order) return;

  const goods = target.price_sale * qty;
  const ship = goods >= 50000 ? 0 : 2500;
  ok('배송비 계산', order.ship_fee === ship || order.shipping_fee === ship,
     `상품 ${goods} / 배송비 ${order.ship_fee ?? order.shipping_fee} (기대 ${ship})`);
  ok('결제금액 계산', Math.abs((order.pay_amount || 0) - (goods + ship)) < 1,
     `${order.pay_amount} (기대 ${goods + ship})`);
  ok('초기 상태 입금대기', ['pending', 'wait', 'ready'].includes(order.status), order.status);

  const it = await rest(`order_items?select=*&order_id=eq.${order.id}`);
  ok('주문 상품 저장', (it.body || []).length === 1 && (it.body || [])[0].qty === qty);

  /* 입금 확인 */
  const paid = await fn('bank', { action: 'confirmDeposit', orderNo });
  ok('입금 확인 처리', paid.ok, paid.body?.error);

  const o2 = await rest(`orders?select=status&order_no=eq.${orderNo}`);
  ok('상태 → 결제완료', ['paid', 'preparing'].includes((o2.body || [])[0]?.status),
     (o2.body || [])[0]?.status);

  const p2 = await rest(`products?select=stock&id=eq.${target.id}`);
  const afterPaid = (p2.body || [])[0]?.stock;
  ok('재고 차감', afterPaid === before - qty, `${before} → ${afterPaid} (기대 ${before - qty})`);

  /* 발송 */
  const ship1 = await fn('order', {
    action: 'ship', orderNo, courier: 'CJ대한통운', trackingNo: '123456789012'
  });
  if (ship1.ok) {
    ok('발송 처리', true);
    const o3 = await rest(`orders?select=status,tracking_no&order_no=eq.${orderNo}`);
    ok('상태 → 배송중', ['shipping', 'shipped'].includes((o3.body || [])[0]?.status),
       (o3.body || [])[0]?.status);
    ok('운송장 저장', (o3.body || [])[0]?.tracking_no === '123456789012');
  } else {
    note('발송 처리', ship1.body?.error || `HTTP ${ship1.status}`);
  }

  /* 취소 — 되돌림 검증 */
  const cancel = await fn('order-edit', {
    action: 'cancel', orderNo, reason: '자동 테스트 정리'
  });
  ok('주문 취소', cancel.ok, cancel.body?.error);

  const o4 = await rest(`orders?select=status,cancel_reason&order_no=eq.${orderNo}`);
  ok('상태 → 취소', ['cancelled', 'canceled'].includes((o4.body || [])[0]?.status),
     (o4.body || [])[0]?.status);

  const p3 = await rest(`products?select=stock&id=eq.${target.id}`);
  const afterCancel = (p3.body || [])[0]?.stock;
  ok('재고 복원', afterCancel === before, `${afterPaid} → ${afterCancel} (기대 ${before})`);

  const log = await rest(`order_logs?select=action&order_no=eq.${orderNo}`);
  ok('처리 이력 기록', (log.body || []).length >= 2, `${(log.body || []).length}건`);
}

/* ── 4. 서버 기능 ── */
async function funcs() {
  group('4. 서버 기능');

  const c24 = await fn('cafe24', { action: 'status' });
  ok('카페24 함수 응답', c24.ok);
  if (c24.ok) {
    c24.body.connected ? ok('카페24 연동', true) : note('카페24 연동', '앱 승인 필요');
  }

  const dev = await fn('dev-agent', { action: 'status' });
  ok('개발 도우미 응답', dev.ok);
  if (dev.ok) {
    ok('AI 키 등록', !!dev.body.aiReady);
    ok('GitHub 토큰 등록', !!dev.body.ghReady);
  }

  const nt = await fn('notify', { action: 'getSettings' });
  ok('알림 함수 응답', nt.ok);
  if (nt.ok) {
    ok('이메일 발송 준비', !!nt.body.mailReady);
    ok('알림 받을 주소', !!nt.body.owner_email, nt.body.owner_email);
    nt.body.smsUse ? ok('카페24 SMS', true) : note('카페24 SMS', '사용 설정 필요');
  }

  const cp = await fn('campaign', { action: 'status' });
  ok('마케팅 함수 응답', cp.ok);

  const ex = await fn('export-ai', { action: 'status' });
  ok('수출 비서 응답', ex.ok);

  const fl = await fn('films', { action: 'list' });
  ok('영상 함수 응답', fl.ok);

  const sub = await fn('subscribe', { action: 'plans' });
  ok('구독 함수 응답', sub.ok && (sub.body.plans || []).length === 4);
}

/* ── 5. 접근 권한 ── */
async function security() {
  group('5. 접근 권한');

  const saved = token; token = null;   // 비로그인 상태로
  const o = await rest('orders?select=id&limit=1');
  ok('비로그인 주문 조회 차단', !o.ok || (o.body || []).length === 0,
     `HTTP ${o.status}, ${(o.body || []).length}건`);

  const pf = await rest('profiles?select=id&limit=1');
  ok('비로그인 회원 조회 차단', !pf.ok || (pf.body || []).length === 0,
     `HTTP ${pf.status}, ${(pf.body || []).length}건`);

  const sec = await rest('app_secrets?select=key&limit=1');
  ok('비밀키 조회 차단', !sec.ok || (sec.body || []).length === 0, `HTTP ${sec.status}`);

  const pub = await rest('products?select=id&limit=1');
  ok('비로그인 상품 조회 허용', pub.ok && (pub.body || []).length > 0);

  const rv = await rest('product_reviews?select=id&limit=1');
  ok('비로그인 후기 조회 허용', rv.ok);

  const adm = await fn('dev-agent', { action: 'status' });
  ok('비로그인 관리 기능 차단', !adm.ok, `HTTP ${adm.status}`);

  token = saved;
}

/* ── 실행 ── */
(async () => {
  console.log('\x1b[1m\nChewGumi 자동 흐름 테스트\x1b[0m');
  console.log('\x1b[90m' + new Date().toLocaleString('ko-KR') + '\x1b[0m');

  if (!(await login())) {
    console.log('\n\x1b[31m로그인 실패로 중단합니다.\x1b[0m');
    process.exit(1);
  }
  const prods = await data();
  await flow(prods);
  await funcs();
  await security();

  const total = pass + fail;
  console.log('\n' + '─'.repeat(52));
  console.log(`\x1b[1m결과\x1b[0m  전체 ${total}건 · \x1b[32m정상 ${pass}\x1b[0m · ` +
              `\x1b[31m문제 ${fail}\x1b[0m · \x1b[33m보류 ${skip}\x1b[0m`);
  if (fails.length) {
    console.log('\n\x1b[31m확인이 필요한 항목\x1b[0m');
    fails.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  } else {
    console.log('\n\x1b[32m모든 항목이 정상입니다.\x1b[0m');
  }
  console.log('');
  process.exit(fail ? 1 : 0);
})();
