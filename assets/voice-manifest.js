/* ═════════════════════════════════════════════════════════
   츄구미 음성 명령 사전 — assets/voice-manifest.js   (2026-09-05)

   왜 만들었나
   ───────────
   손님이 말로 시키는 일을 AI 가 그때그때 코드로 만들어 실행하면,
   말이 조금만 달라져도 엉뚱한 곳을 누르거나 결제를 건드릴 수 있습니다.
   그래서 "이 화면에서 말로 할 수 있는 일" 을 미리 여기 목록으로 못 박아 두고,
   AI 는 이 목록에서 고르기만 합니다. 목록에 없으면 아무 일도 하지 않습니다.
   (실시간 코드 생성 금지 — issues #16 · fix_log #18)

   쓰는 법 — 화면의 </body> 앞, bot.js 보다 먼저 한 줄:
     <script src="assets/voice-manifest.js" defer></script>
   이 파일만으로는 아무 것도 바뀌지 않습니다. 화면에 붙이는 것은 4단계입니다.

   담긴 것
   · CG_VOICE.list(page)        — 그 화면에서 허용된 동작 목록
   · CG_VOICE.match(text,page)  — 손님 말 → 동작 하나 (없으면 null)
   · CG_VOICE.run(id,opt)       — 목록에 있는 동작만 실행
   · CG_VOICE.blocked(text)     — 카드번호·비밀번호처럼 말로 받으면 안 되는 말
   ═════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── 말로 받지 않는 것 (⑤ 원칙) ──
     카드번호·비밀번호·주민번호는 어떤 화면에서도 음성으로 받지 않습니다.
     이런 말이 들리면 동작을 찾지 않고 그 자리에서 멈춥니다. */
  var NEVER = [
    { re: /카드\s*번호|카드번호|cvc|cvv|보안\s*코드|유효\s*기간/i,
      say: '카드 정보는 말로 받지 않습니다. 결제창에 직접 입력해 주세요.' },
    { re: /비밀\s*번호|비번|암호|password|핀\s*번호/i,
      say: '비밀번호는 말로 받지 않습니다. 직접 입력해 주세요.' },
    { re: /주민\s*등록\s*번호|주민번호/i,
      say: '주민등록번호는 말로 받지 않습니다.' }
  ];

  /* ── 실행할 수 있는 방식은 네 가지뿐입니다 ──
     go    : 정해진 주소로 이동
     click : 정해진 요소 하나를 누름 (선택자도 이 파일에 적힌 것만)
     call  : 아래 CALLABLE 에 이름이 있는 함수만 호출
     read  : 화면의 글자를 읽어 줌 (아무 것도 바꾸지 않음)
     이 밖의 것은 실행하지 않습니다. */
  var CALLABLE = {
    cgbotToggle: 1, cgbotClear: 1, cgbotSpeakToggle: 1,
    openCart: 1, closeCart: 1, copyAcc: 1
  };

  /* ── 모든 화면에서 되는 것 ── */
  var COMMON = [
    { id: 'home',        label: '홈으로',            do: 'go',   to: 'index.html',
      say: ['홈', '처음', '메인', '첫 화면'] },
    { id: 'shop_all',    label: '전체 상품 보기',     do: 'go',   to: 'index.html#all',
      say: ['상품 보여', '상품 목록', '전체 상품', '뭐 파', '쇼핑'] },
    { id: 'line_travel', label: '트래블잇 보기',      do: 'go',   to: 'index.html?line=travel#all',
      say: ['트래블잇', '여행용', '트레블'] },
    { id: 'line_doit',   label: '듀잇 보기',          do: 'go',   to: 'index.html?line=doit#all',
      say: ['듀잇', '자일리톨', '캔디'] },
    { id: 'cart',        label: '장바구니',           do: 'go',   to: 'cart.html',
      say: ['장바구니', '카트', '담은 것'] },
    { id: 'checkout',    label: '주문서로',           do: 'go',   to: 'checkout.html',
      say: ['주문서', '결제하러', '주문하러', '계산'] },
    { id: 'order_lookup',label: '주문 조회',          do: 'go',   to: 'order-lookup.html',
      say: ['주문 조회', '내 주문', '주문 확인', '주문번호'] },
    { id: 'tracking',    label: '배송 조회',          do: 'go',   to: 'tracking.html',
      say: ['배송 조회', '배송 어디', '어디까지 왔', '송장', '택배'] },
    { id: 'mypage',      label: '마이페이지',         do: 'go',   to: 'mypage.html',
      say: ['마이페이지', '내 정보', '내정보'] },
    { id: 'guide',       label: '이용 안내',          do: 'go',   to: 'guide.html',
      say: ['이용 안내', '이용안내', '배송비', '얼마나 걸리'] },
    { id: 'faq',         label: '자주 묻는 질문',      do: 'go',   to: 'faq.html',
      say: ['자주 묻는', '자주묻는', 'faq', '궁금'] },
    { id: 'qna',         label: '문의하기',           do: 'go',   to: 'qna.html',
      say: ['문의', '질문 남기', '물어보'] },
    { id: 'notice',      label: '공지사항',           do: 'go',   to: 'notice.html',
      say: ['공지', '알림사항'] },
    { id: 'review',      label: '사용 후기',          do: 'go',   to: 'review.html',
      say: ['후기', '리뷰', '평점'] },
    { id: 'about',       label: '브랜드 이야기',      do: 'go',   to: 'about.html',
      say: ['브랜드', '회사', '어떤 곳', '소개'] },
    { id: 'terms',       label: '이용약관',           do: 'go',   to: 'terms.html',
      say: ['이용약관', '약관'] },
    { id: 'privacy',     label: '개인정보 처리방침',   do: 'go',   to: 'privacy.html',
      say: ['개인정보'] },
    { id: 'login',       label: '로그인',             do: 'go',   to: 'login.html',
      say: ['로그인', '들어갈래'] },
    { id: 'join',        label: '회원가입',           do: 'go',   to: 'join.html',
      say: ['회원가입', '가입할'] },

    { id: 'bot_toggle',  label: '상담창 열기·닫기',    do: 'call', fn: 'cgbotToggle',
      say: ['상담', '채팅 열', '채팅 닫', '상담창'] },
    { id: 'bot_clear',   label: '대화 지우기',        do: 'call', fn: 'cgbotClear', confirm: true,
      say: ['대화 지우', '기록 지우', '초기화'] },
    { id: 'tts_toggle',  label: '음성 답변 켜기·끄기', do: 'call', fn: 'cgbotSpeakToggle',
      say: ['읽어 줘', '읽어줘', '음성 답변', '소리 꺼', '소리 켜'] },

    { id: 'top',         label: '맨 위로',            do: 'scroll', to: 'top',
      say: ['맨 위', '위로', '처음으로 올려'] },
    { id: 'bottom',      label: '맨 아래로',          do: 'scroll', to: 'bottom',
      say: ['맨 아래', '아래로', '끝으로'] }
  ];

  /* ── 그 화면에서만 되는 것 ── */
  var PAGES = {
    'index.html': [
      { id: 'cart_panel', label: '장바구니 서랍 열기', do: 'call', fn: 'openCart',
        say: ['장바구니 열', '카트 열'] }
    ],
    'cart.html': [
      { id: 'to_checkout', label: '주문서로 넘어가기', do: 'go', to: 'checkout.html',
        say: ['주문할래', '결제할래', '다음'] },
      { id: 'read_total',  label: '합계 읽어주기', do: 'read',
        sel: ['#sPay', '#sGoods'],
        say: ['얼마', '합계', '총 얼마', '결제 금액'] }
    ],

    /* 상품 상세 — 담기·가격 확인까지. 되돌릴 수 없는 '바로 주문' 은 한 번 더 여쭙습니다.
       (주소가 p/여행-1.html 처럼 다른 상품 낱장은 위 COMMON 만 씁니다) */
    'product.html': [
      { id: 'add_cart',   label: '장바구니에 담기', do: 'click', sel: '#pCart',
        say: ['장바구니에 담', '담아 줘', '카트에 넣', '이거 담'] },
      { id: 'read_price', label: '가격 읽어주기', do: 'read',
        sel: ['#pTotal', '#pSale'],
        say: ['얼마', '가격 알려', '값이', '가격은'] },
      { id: 'cart_panel', label: '장바구니 서랍 열기', do: 'call', fn: 'openCart',
        say: ['장바구니 열', '카트 열'] },
      { id: 'buy_now',    label: '바로 주문하기', do: 'click', sel: '#pBuy', confirm: true,
        say: ['바로 주문', '바로 구매', '지금 살', '바로 결제'] }
    ],

    /* 배송 조회 — 누르기와 읽어주기만. 아무 것도 바꾸지 않습니다. */
    'tracking.html': [
      { id: 'do_track',   label: '배송 조회하기', do: 'click', sel: '#go',
        say: ['조회해', '찾아 줘', '확인해', '조회'] },
      { id: 'read_track', label: '배송 상태 읽어주기', do: 'read',
        sel: ['#steps', '#res'],
        say: ['어디까지', '배송 상태', '어디 있', '읽어 줘'] }
    ],

    /* 마이페이지 — 읽어주기만 (바꾸는 것은 손님이 직접) */
    'mypage.html': [
      { id: 'read_orders', label: '주문 내역 읽어주기', do: 'read', sel: ['#list'],
        say: ['주문 내역', '내 주문', '뭐 샀', '읽어 줘'] }
    ],

    /* 자주 묻는 질문 — 읽어주기만 */
    'faq.html': [
      { id: 'read_faq', label: '자주 묻는 질문 읽어주기', do: 'read', sel: ['#list'],
        say: ['읽어 줘', '알려 줘', '뭐가 있'] }
    ],
    'checkout.html': [
      { id: 'pay_bank',  label: '무통장입금 고르기', do: 'click', sel: '#ptBank',
        say: ['무통장', '계좌이체로', '입금할'] },
      { id: 'pay_vbank', label: '가상계좌 고르기',   do: 'click', sel: '#ptVbank',
        say: ['가상계좌', '가상 계좌', '내 계좌 받'] },
      { id: 'pay_card',  label: '카드·간편결제 고르기', do: 'click', sel: '#ptCard',
        say: ['카드로', '간편결제', '네이버페이'] },
      { id: 'read_account', label: '계좌번호 읽어주기', do: 'read',
        sel: ['#bkNoTx', '#bankBox'],
        /* 계좌가 아직 안 왔을 때 안내문을 계좌번호처럼 읽어 주던 문제 (issues #35) */
        needDigits: 4,
        notReady: '아직 계좌번호가 나오지 않았습니다. 잠시 뒤 다시 말씀해 주세요.',
        say: ['계좌번호 읽', '계좌 불러', '계좌번호 알려', '어디로 입금'] },
      { id: 'copy_account', label: '계좌번호 복사',   do: 'call', fn: 'copyAcc',
        say: ['계좌번호 복사', '계좌 복사'] },
      /* 되돌릴 수 없는 것 — 반드시 한 번 더 여쭙고 진행합니다 */
      { id: 'pay_submit', label: '결제·주문 확정',    do: 'click', sel: '#payBtn', confirm: true,
        say: ['결제해 줘', '주문 확정', '진행해 줘', '결제하기'] }
    ],
    'order-lookup.html': [
      { id: 'to_tracking', label: '배송 조회로', do: 'go', to: 'tracking.html',
        say: ['배송', '어디까지'] },
      { id: 'do_find',     label: '주문 조회하기', do: 'click', sel: '#findBtn',
        say: ['조회해', '찾아 줘', '확인해', '조회'] },
      { id: 'read_order',  label: '조회 결과 읽어주기', do: 'read', sel: ['#resBox'],
        say: ['읽어 줘', '결과 알려', '내 주문'] }
    ]
  };

  /* ── 도우미 ── */
  /* 화면이 "아직 준비 안 됨" 을 알리는 말버릇들 — 이 글자는 읽어 주지 않습니다 (issues #35)
     실제 본문에 같은 낱말이 섞여 있어도 막히지 않도록, 짧은 안내문일 때만 봅니다 (NOTREADY_MAX) */
  var NOTREADY = /불러오는\s*중|불러오지|가져오는\s*중|로딩|loading|잠시만|준비\s*중|없습니다|비어\s*있|실패|오류|다시\s*시도|\.\.\.|…/i;
  var NOTREADY_MAX = 60;

  function pageName(p) {
    if (p) return String(p);
    var f = (location.pathname || '').split('/').pop();
    return f && f.indexOf('.') > -1 ? f : 'index.html';
  }
  function norm(s) { return String(s == null ? '' : s).toLowerCase().replace(/\s+/g, ''); }

  function list(p) {
    var page = pageName(p);
    return (PAGES[page] || []).concat(COMMON);
  }

  function blocked(text) {
    var t = String(text || '');
    for (var i = 0; i < NEVER.length; i++) {
      if (NEVER[i].re.test(t)) return { blocked: true, say: NEVER[i].say };
    }
    return null;
  }

  /* 손님 말에서 동작 하나를 고릅니다.
     · 목록에 적힌 말이 들어 있으면 그 동작
     · 여러 개가 걸리면 그 화면 전용 동작 → 적힌 말이 긴 쪽 순서
     · 못 고르면 null (그러면 평소처럼 상담 답변으로 갑니다) */
  function match(text, p) {
    var stop = blocked(text);
    if (stop) return stop;
    var t = norm(text);
    if (!t) return null;
    var items = list(p), best = null, bestLen = 0, bestOwn = false;
    for (var i = 0; i < items.length; i++) {
      var a = items[i], own = i < (PAGES[pageName(p)] || []).length;
      for (var k = 0; k < a.say.length; k++) {
        var w = norm(a.say[k]);
        if (!w || t.indexOf(w) === -1) continue;
        if ((own && !bestOwn) || (own === bestOwn && w.length > bestLen)) {
          best = a; bestLen = w.length; bestOwn = own;
        }
      }
    }
    return best;
  }

  function find(a) {
    var sels = a.sel instanceof Array ? a.sel : [a.sel];
    for (var i = 0; i < sels.length; i++) {
      var e = document.querySelector(sels[i]);
      if (e) return e;
    }
    return null;
  }

  /* 목록에 있는 동작만 실행합니다.
     confirm 이 붙은 동작은 opt.confirmed 가 true 일 때만 실제로 실행하고,
     아니면 "정말 진행할까요?" 를 돌려주어 한 번 더 여쭙게 합니다. */
  function run(id, opt) {
    opt = opt || {};
    var items = list(opt.page), a = null;
    for (var i = 0; i < items.length; i++) if (items[i].id === id) a = items[i];
    if (!a) return { ok: false, reason: 'unknown', say: '그건 아직 말로 할 수 없습니다.' };

    if (a.confirm && !opt.confirmed) {
      return { ok: false, reason: 'confirm', action: a.id,
        say: a.label + ' 할까요? "네" 라고 말씀해 주세요.' };
    }

    try {
      if (a.do === 'go') { location.href = a.to; return { ok: true, say: a.label }; }

      if (a.do === 'click') {
        var e = find(a);
        if (!e) return { ok: false, reason: 'missing', say: '이 화면에서는 찾지 못했습니다.' };
        if (e.disabled) return { ok: false, reason: 'disabled', say: '아직 누를 수 없는 단추입니다.' };
        e.click();
        return { ok: true, say: a.label };
      }

      if (a.do === 'call') {
        if (!CALLABLE[a.fn] || typeof window[a.fn] !== 'function')
          return { ok: false, reason: 'missing', say: '이 화면에서는 할 수 없습니다.' };
        window[a.fn]();
        return { ok: true, say: a.label };
      }

      if (a.do === 'read') {
        var r = find(a);
        var txt = r ? String(r.textContent || '').replace(/\s+/g, ' ').trim() : '';
        if (!txt) return { ok: false, reason: 'missing', say: '아직 읽어 드릴 내용이 없습니다.' };

        /* [1] 아직 불러오는 중이거나 실패 안내문이면 읽지 않습니다 (issues #35) */
        if (txt.length <= NOTREADY_MAX && NOTREADY.test(txt)) {
          return { ok: false, reason: 'notready',
            say: a.notReady || '아직 준비되지 않았습니다. 잠시 뒤 다시 말씀해 주세요.' };
        }
        /* [2] 계좌번호처럼 숫자가 있어야 하는 것은 숫자를 확인합니다 (issues #35) */
        if (a.needDigits) {
          var digits = (txt.match(/\d/g) || []).length;
          if (digits < a.needDigits) {
            return { ok: false, reason: 'notready',
              say: a.notReady || '아직 준비되지 않았습니다. 잠시 뒤 다시 말씀해 주세요.' };
          }
        }

        /* 숫자는 또박또박 읽히도록 사이를 띄웁니다 */
        var spoken = txt.replace(/\d{2,}/g, function (n) { return n.split('').join(' '); });
        if (typeof window.cgbotSpeak === 'function') window.cgbotSpeak(spoken);
        return { ok: true, say: txt, spoken: spoken };
      }

      if (a.do === 'scroll') {
        var y = a.to === 'bottom' ? document.body.scrollHeight : 0;
        window.scrollTo({ top: y, behavior: 'smooth' });
        return { ok: true, say: a.label };
      }
    } catch (err) {
      return { ok: false, reason: 'error', say: '실행하지 못했습니다.' };
    }
    return { ok: false, reason: 'unknown', say: '그건 아직 말로 할 수 없습니다.' };
  }

  window.CG_VOICE = {
    version: '2026-09-05',
    page: pageName,
    list: list,
    match: match,
    run: run,
    blocked: blocked,
    /* AI 에게 건네줄 목록 — 설명과 예시만, 코드는 넘기지 않습니다 */
    menu: function (p) {
      return list(p).map(function (a) {
        return { id: a.id, label: a.label, example: a.say[0], confirm: !!a.confirm };
      });
    }
  };
})();
