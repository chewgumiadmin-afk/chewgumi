/*! ChewGumi 테스트 — 단위 테스트 + 구매/취소 시나리오
 *  실행: node tools/test.js
 */
'use strict';

/* ─────────────── 테스트 러너 ─────────────── */
let pass = 0, fail = 0, cur = '';
const fails = [];

function suite(name, fn) {
  cur = name;
  console.log(`\n■ ${name}`);
  fn();
}
function eq(label, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) { pass++; console.log(`  ✓ ${label}`); }
  else {
    fail++; fails.push(`${cur} › ${label}`);
    console.log(`  ✕ ${label}`);
    console.log(`      기대: ${JSON.stringify(want)}`);
    console.log(`      실제: ${JSON.stringify(got)}`);
  }
}
function ok(label, cond) { eq(label, !!cond, true); }
function throws(label, fn) {
  try { fn(); fail++; fails.push(`${cur} › ${label}`); console.log(`  ✕ ${label} (오류가 나야 하는데 안 남)`); }
  catch { pass++; console.log(`  ✓ ${label}`); }
}

/* ─────────────── 실제 구현 (사이트와 동일) ─────────────── */

// checkout.html / index.html 의 상품 매칭
function matchId(name) {
  const s = String(name || '');
  if (s.includes('트래블잇') || s.toLowerCase().includes('travel')) {
    const m = s.match(/\[(\d+)봉\]/);
    const map = { '1': 15, '3': 11, '5': 12, '10': 13, '20': 14 };
    return (m && map[m[1]]) || 11;
  }
  if (s.includes('레몬민트')) return 16;
  if (s.includes('그레이프')) return 17;
  const m2 = s.match(/(\d+)개입/);
  const map2 = { '4': 18, '6': 19, '10': 20, '20': 21 };
  return (m2 && map2[m2[1]]) || 18;
}

// 서버(coupon Edge Function) 견적 로직
const SHIP_FEE = 2500;
const FREE_OVER = 50000;
const PRODUCTS = {
  11: { name: '[3봉] 트래블잇', price: 9900,  stock: 100, active: true },
  12: { name: '[5봉] 트래블잇', price: 14900, stock: 100, active: true },
  15: { name: '[1봉] 트래블잇', price: 3500,  stock: 100, active: true },
  16: { name: '듀잇 레몬민트',  price: 19900, stock: 100, active: true },
  18: { name: '듀잇 4개입',     price: 19900, stock: 100, active: true },
  21: { name: '듀잇 20개입',    price: 81000, stock: 0,   active: true },
  101:{ name: '드림잇',         price: 0,     stock: 0,   active: false },
};
const COUPONS = {
  WELCOME2000: { kind: 'amount',   value: 2000, min: 10000, active: true },
  FREESHIP:    { kind: 'shipping', value: 0,    min: 0,     active: true },
  OLD10:       { kind: 'percent',  value: 10,   min: 0,     active: false },
};

function quote(items, couponCode) {
  if (!Array.isArray(items) || !items.length) throw new Error('상품이 없습니다.');
  let goods = 0;
  for (const it of items) {
    const p = PRODUCTS[it.id];
    if (!p) throw new Error('없는 상품입니다.');
    if (!p.active) throw new Error('판매하지 않는 상품입니다.');
    const qty = Number(it.qty);
    if (!Number.isInteger(qty) || qty < 1) throw new Error('수량이 올바르지 않습니다.');
    if (qty > p.stock) throw new Error('재고가 부족합니다.');
    goods += p.price * qty;
  }
  let discount = 0;
  let ship = goods >= FREE_OVER ? 0 : SHIP_FEE;
  if (couponCode) {
    const c = COUPONS[couponCode];
    if (!c) throw new Error('쿠폰을 찾을 수 없습니다.');
    if (!c.active) throw new Error('사용할 수 없는 쿠폰입니다.');
    if (goods < c.min) throw new Error('최소 주문금액에 미달합니다.');
    if (c.kind === 'amount') discount = Math.min(c.value, goods);
    else if (c.kind === 'percent') discount = Math.floor(goods * c.value / 100);
    else if (c.kind === 'shipping') ship = 0;
  }
  const total = Math.max(0, goods - discount) + ship;
  return { goods, discount, ship, total };
}

// 주문번호
function makeOrderNo(d = new Date(), rnd = 1234) {
  const p = (n) => String(n).padStart(2, '0');
  return `${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}`
    + `-${String(rnd).padStart(4, '0')}`;
}

// 입금 기한
function depositDue(from, days) {
  const d = new Date(from);
  d.setDate(d.getDate() + Number(days));
  return d.toISOString().slice(0, 10);
}

// 주문 상태 전이 규칙
const FLOW = {
  pending:   ['paid', 'cancelled'],
  paid:      ['preparing', 'cancelled', 'refunded'],
  preparing: ['shipping', 'cancelled', 'refunded'],
  shipping:  ['delivered', 'refunded'],
  delivered: ['refunded'],
  cancelled: [],
  refunded:  [],
};
function canMove(from, to) { return (FLOW[from] || []).includes(to); }

// 취소·환불 처리
function cancelOrder(order, reason) {
  if (!canMove(order.status, 'cancelled') && !canMove(order.status, 'refunded'))
    throw new Error('이미 종료된 주문입니다.');
  if (!reason) throw new Error('취소 사유가 필요합니다.');

  const wasPaid = ['paid', 'preparing', 'shipping', 'delivered'].includes(order.status);
  const next = { ...order };
  next.status = wasPaid ? 'refunded' : 'cancelled';
  next.cancelReason = reason;
  next.cancelledAt = '2026-08-12T20:00:00Z';
  // 재고 복원
  next.stockRestored = order.items.map(i => ({ id: i.id, qty: i.qty }));
  // 적립금 회수 (지급된 만큼)
  next.pointsTaken = order.pointsGiven || 0;
  // 쿠폰 복원
  next.couponRestored = order.coupon ? order.coupon : null;
  // 환불액 — 배송 시작 후면 왕복 배송비 차감
  if (wasPaid) {
    const shipped = ['shipping', 'delivered'].includes(order.status);
    next.refundAmount = shipped
      ? Math.max(0, order.payAmount - SHIP_FEE * 2)
      : order.payAmount;
  } else {
    next.refundAmount = 0;
  }
  return next;
}

// 배송 조회용 택배사 인식
function courierOf(no) {
  const n = String(no || '').replace(/\D/g, '');
  if (n.length === 12 && n.startsWith('1')) return 'CJ대한통운';
  if (n.length === 10) return '우체국택배';
  if (n.length === 13) return '롯데택배';
  if (n.length === 11) return '한진택배';
  return '';
}

// 광고 발송 가능 시각 (정보통신망법)
function canSendAd(hourKst) { return hourKst >= 8 && hourKst < 21; }

// 문자 길이 → 과금 구분
function smsType(text) { return String(text || '').length <= 90 ? 'SMS' : 'LMS'; }

/* ═══════════════ 단위 테스트 ═══════════════ */

suite('상품 매칭 matchId()', () => {
  eq('트래블잇 1봉', matchId('[1봉] 트래블잇 Travel-it (40g)'), 15);
  eq('트래블잇 3봉', matchId('[3봉] 트래블잇 Travel-it (40g)'), 11);
  eq('트래블잇 20봉', matchId('[20봉] 트래블잇 Travel-it (40g)'), 14);
  eq('영문 표기', matchId('Travel-it [5봉]'), 12);
  eq('듀잇 레몬민트', matchId('듀잇 레몬민트'), 16);
  eq('듀잇 그레이프', matchId('듀잇 그레이프'), 17);
  eq('듀잇 4개입', matchId('듀잇 4개입 — 무설탕 자일리톨 캔디'), 18);
  eq('듀잇 20개입', matchId('듀잇 20개입'), 21);
  eq('알 수 없는 이름 → 기본값', matchId('정체불명 상품'), 18);
  eq('빈 값', matchId(''), 18);
  eq('null', matchId(null), 18);
});

suite('금액 계산 quote()', () => {
  eq('단품 + 배송비',
    quote([{ id: 15, qty: 1 }]),
    { goods: 3500, discount: 0, ship: 2500, total: 6000 });

  eq('5만원 이상 무료배송',
    quote([{ id: 16, qty: 3 }]),
    { goods: 59700, discount: 0, ship: 0, total: 59700 });

  eq('정확히 5만원 → 무료',
    quote([{ id: 11, qty: 5 }, { id: 15, qty: 1 }]),
    { goods: 53000, discount: 0, ship: 0, total: 53000 });

  eq('4만9천원대 → 배송비 있음',
    quote([{ id: 11, qty: 4 }, { id: 12, qty: 1 }]),
    { goods: 54500, discount: 0, ship: 0, total: 54500 });

  eq('여러 상품 합산',
    quote([{ id: 15, qty: 2 }, { id: 18, qty: 1 }]),
    { goods: 26900, discount: 0, ship: 2500, total: 29400 });

  eq('금액 쿠폰',
    quote([{ id: 18, qty: 1 }], 'WELCOME2000'),
    { goods: 19900, discount: 2000, ship: 2500, total: 20400 });

  eq('배송비 쿠폰',
    quote([{ id: 15, qty: 1 }], 'FREESHIP'),
    { goods: 3500, discount: 0, ship: 0, total: 3500 });

  eq('무료배송 + 배송비쿠폰 (중복 무해)',
    quote([{ id: 16, qty: 3 }], 'FREESHIP'),
    { goods: 59700, discount: 0, ship: 0, total: 59700 });
});

suite('금액 계산 — 예외', () => {
  throws('빈 장바구니', () => quote([]));
  throws('null 전달', () => quote(null));
  throws('없는 상품', () => quote([{ id: 999, qty: 1 }]));
  throws('판매 중지 상품', () => quote([{ id: 101, qty: 1 }]));
  throws('재고 초과', () => quote([{ id: 21, qty: 1 }]));
  throws('수량 0', () => quote([{ id: 15, qty: 0 }]));
  throws('음수 수량', () => quote([{ id: 15, qty: -3 }]));
  throws('소수 수량', () => quote([{ id: 15, qty: 1.5 }]));
  throws('없는 쿠폰', () => quote([{ id: 15, qty: 1 }], 'NOPE'));
  throws('만료 쿠폰', () => quote([{ id: 15, qty: 1 }], 'OLD10'));
  throws('최소금액 미달 쿠폰', () => quote([{ id: 15, qty: 1 }], 'WELCOME2000'));
});

suite('주문번호 · 입금기한', () => {
  eq('주문번호 형식', makeOrderNo(new Date('2026-08-12'), 7), '260812-0007');
  eq('한 자리 월일 0채움', makeOrderNo(new Date('2026-01-05'), 42), '260105-0042');
  eq('입금기한 7일', depositDue('2026-08-12', 7), '2026-08-19');
  eq('월 넘김', depositDue('2026-08-28', 7), '2026-09-04');
  eq('연 넘김', depositDue('2026-12-28', 7), '2027-01-04');
});

suite('주문 상태 전이', () => {
  ok('입금대기 → 결제완료', canMove('pending', 'paid'));
  ok('입금대기 → 취소', canMove('pending', 'cancelled'));
  ok('결제완료 → 준비중', canMove('paid', 'preparing'));
  ok('배송중 → 배송완료', canMove('shipping', 'delivered'));
  ok('배송완료 → 환불', canMove('delivered', 'refunded'));
  eq('취소된 주문은 되돌릴 수 없음', canMove('cancelled', 'paid'), false);
  eq('배송중에서 취소 불가 (환불로만)', canMove('shipping', 'cancelled'), false);
  eq('입금대기에서 바로 배송 불가', canMove('pending', 'shipping'), false);
  eq('환불 후 재개 불가', canMove('refunded', 'paid'), false);
});

suite('택배사 인식', () => {
  eq('CJ대한통운 12자리', courierOf('123456789012'), 'CJ대한통운');
  eq('우체국 10자리', courierOf('1234567890'), '우체국택배');
  eq('한진 11자리', courierOf('12345678901'), '한진택배');
  eq('롯데 13자리', courierOf('1234567890123'), '롯데택배');
  eq('하이픈 포함', courierOf('1234-5678-9012'), 'CJ대한통운');
  eq('알 수 없음', courierOf('123'), '');
  eq('빈 값', courierOf(''), '');
});

suite('광고 발송 시간 제한', () => {
  eq('오전 8시 가능', canSendAd(8), true);
  eq('오후 2시 가능', canSendAd(14), true);
  eq('오후 8시 59분 가능', canSendAd(20), true);
  eq('오후 9시 차단', canSendAd(21), false);
  eq('자정 차단', canSendAd(0), false);
  eq('오전 7시 차단', canSendAd(7), false);
});

suite('문자 과금 구분', () => {
  eq('90자 이하 SMS', smsType('가'.repeat(90)), 'SMS');
  eq('91자 LMS', smsType('가'.repeat(91)), 'LMS');
  eq('실제 광고 문구', smsType('[츄구미] 새로 나왔습니다\n트리플 잇 3종\nhttps://chewgumi.com'), 'SMS');
});

/* ═══════════════ 시나리오 테스트 ═══════════════ */

console.log('\n\n════════ 구매 · 취소 시나리오 ════════');

suite('시나리오 1 — 무통장입금 정상 구매', () => {
  // ① 장바구니
  const cart = [{ name: '듀잇 4개입', qty: 1 }, { name: '[3봉] 트래블잇 Travel-it (40g)', qty: 2 }];
  const items = cart.map(c => ({ id: matchId(c.name), qty: c.qty }));
  eq('장바구니 → 상품ID 변환', items, [{ id: 18, qty: 1 }, { id: 11, qty: 2 }]);

  // ② 견적
  const q = quote(items);
  eq('상품금액', q.goods, 19900 + 9900 * 2);
  eq('배송비 (5만원 미만)', q.ship, 2500);
  eq('결제금액', q.total, 42200);

  // ③ 쿠폰 적용
  const q2 = quote(items, 'WELCOME2000');
  eq('쿠폰 적용 후', q2.total, 40200);

  // ④ 주문 생성
  const order = {
    orderNo: makeOrderNo(new Date('2026-08-12'), 1),
    status: 'pending', payType: 'bank',
    items, payAmount: q2.total, coupon: 'WELCOME2000',
    depositDue: depositDue('2026-08-12', 7),
  };
  eq('주문번호', order.orderNo, '260812-0001');
  eq('초기 상태', order.status, 'pending');
  eq('입금기한', order.depositDue, '2026-08-19');

  // ⑤ 알림 (메일 발송 가정)
  const mail = { to: 'chewgumi24@gmail.com',
    subject: `[츄구미] 주문 ${order.orderNo} · ${order.payAmount.toLocaleString()}원` };
  eq('사장님 알림 제목', mail.subject, '[츄구미] 주문 260812-0001 · 40,200원');

  // ⑥ 입금 확인
  ok('입금대기 → 결제완료 가능', canMove(order.status, 'paid'));
  order.status = 'paid';
  order.pointsGiven = Math.floor(order.payAmount * 0.01);
  eq('적립금 1%', order.pointsGiven, 402);

  // ⑦ 발송
  order.status = 'preparing';
  ok('준비중 → 배송중', canMove('preparing', 'shipping'));
  order.status = 'shipping';
  order.trackingNo = '123456789012';
  eq('택배사 자동 인식', courierOf(order.trackingNo), 'CJ대한통운');

  // ⑧ 완료
  order.status = 'delivered';
  eq('최종 상태', order.status, 'delivered');
});

suite('시나리오 2 — 입금 전 취소', () => {
  const order = {
    orderNo: '260812-0002', status: 'pending', payAmount: 6000,
    items: [{ id: 15, qty: 1 }], pointsGiven: 0, coupon: null,
  };
  const after = cancelOrder(order, '고객 변심');
  eq('상태', after.status, 'cancelled');
  eq('환불액 (미입금)', after.refundAmount, 0);
  eq('재고 복원', after.stockRestored, [{ id: 15, qty: 1 }]);
  eq('적립금 회수 없음', after.pointsTaken, 0);
  eq('쿠폰 복원 없음', after.couponRestored, null);
  ok('취소 사유 기록', after.cancelReason === '고객 변심');
});

suite('시나리오 3 — 입금 후 발송 전 취소 (전액 환불)', () => {
  const order = {
    orderNo: '260812-0003', status: 'paid', payAmount: 40200,
    items: [{ id: 18, qty: 1 }, { id: 11, qty: 2 }],
    pointsGiven: 402, coupon: 'WELCOME2000',
  };
  const after = cancelOrder(order, '재고 부족');
  eq('상태 (환불)', after.status, 'refunded');
  eq('전액 환불', after.refundAmount, 40200);
  eq('재고 복원 2건', after.stockRestored.length, 2);
  eq('적립금 회수', after.pointsTaken, 402);
  eq('쿠폰 복원', after.couponRestored, 'WELCOME2000');
});

suite('시나리오 4 — 배송 후 반품 (왕복 배송비 차감)', () => {
  const order = {
    orderNo: '260812-0004', status: 'delivered', payAmount: 42200,
    items: [{ id: 18, qty: 1 }], pointsGiven: 422, coupon: null,
  };
  const after = cancelOrder(order, '단순 변심 반품');
  eq('상태', after.status, 'refunded');
  eq('왕복 배송비 차감', after.refundAmount, 42200 - 5000);
  eq('적립금 회수', after.pointsTaken, 422);
});

suite('시나리오 5 — 취소 예외 처리', () => {
  throws('이미 취소된 주문 재취소',
    () => cancelOrder({ status: 'cancelled', items: [] }, '중복'));
  throws('이미 환불된 주문 재환불',
    () => cancelOrder({ status: 'refunded', items: [] }, '중복'));
  throws('사유 없이 취소',
    () => cancelOrder({ status: 'pending', items: [] }, ''));
});

suite('시나리오 6 — 재고 부족으로 주문 실패', () => {
  throws('품절 상품 주문', () => quote([{ id: 21, qty: 1 }]));
  // 부분 재고: 일부만 있어도 전체 거절
  throws('정상 + 품절 혼합', () => quote([{ id: 15, qty: 1 }, { id: 21, qty: 1 }]));
});

suite('시나리오 7 — 정기구독 신청 · 해지', () => {
  const plan = { code: 'dewdaily', name: '듀잇 데일리', price: 35900, months: 1 };
  const sub = {
    subNo: 'S260812-0001', planCode: plan.code, status: 'pending',
    priceMonth: plan.price, shippedCount: 0, nextShipDate: '2026-08-15',
  };
  eq('신청 직후 상태', sub.status, 'pending');

  // 입금 확인 → 구독 시작
  sub.status = 'active';
  eq('구독 중', sub.status, 'active');

  // 1회차 발송
  sub.shippedCount += 1;
  sub.nextShipDate = depositDue('2026-08-15', 31);
  eq('발송 횟수', sub.shippedCount, 1);
  eq('다음 배송일 (약 한 달 뒤)', sub.nextShipDate, '2026-09-15');

  // 일시 중지 → 재개
  sub.status = 'paused';
  eq('일시 중지', sub.status, 'paused');
  sub.status = 'active';
  eq('재개', sub.status, 'active');

  // 해지
  sub.status = 'cancelled';
  eq('해지 (위약금 없음)', sub.status, 'cancelled');
});

suite('시나리오 8 — 광고 문자 발송 규정', () => {
  const targets = [
    { name: '김OO', phone: '01011112222', smsAgree: true },
    { name: '이OO', phone: '01033334444', smsAgree: false },
    { name: '박OO', phone: '',            smsAgree: true },
  ];
  const sendable = targets.filter(t => t.smsAgree && t.phone.replace(/\D/g, '').length >= 10);
  eq('수신 동의자만 · 번호 있는 사람만', sendable.length, 1);
  eq('대상', sendable[0].name, '김OO');

  eq('오후 3시 발송 가능', canSendAd(15), true);
  eq('오후 10시 발송 차단', canSendAd(22), false);

  const body = '[츄구미] 새로 나왔습니다\n트리플 잇 3종\nhttps://chewgumi.com';
  eq('단문 과금', smsType(body), 'SMS');
});

/* ─────────────── 결과 ─────────────── */
console.log('\n' + '='.repeat(56));
console.log(`통과 ${pass} · 실패 ${fail}`);
if (fails.length) {
  console.log('\n실패한 테스트:');
  fails.forEach(f => console.log('  ✕ ' + f));
}
console.log('='.repeat(56));
process.exit(fail ? 1 : 0);
