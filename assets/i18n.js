/* ChewGumi 공용 언어 전환 — assets/i18n.js  (표식: cgI18nShared)
 *
 * 각 화면은 아래 한 줄만 넣습니다.
 *   <script src="assets/i18n.js" defer></script>
 *
 * 하는 일
 *  1) 우상단에 EN/KR 버튼을 자동으로 답니다(이미 #langBtn 이 있으면 그것을 씁니다).
 *  2) 고른 언어를 localStorage(cg_lang)에 기억해 화면을 옮겨도 유지합니다.
 *  3) 아래 사전에 있는 문구만 바꿉니다. 사전에 없는 글(손님 후기·문의 본문 등)은 그대로 둡니다.
 *  4) 자바스크립트가 나중에 그린 내용도 다시 훑어 바꿉니다.
 *
 * 안전장치
 *  · 문구 전체가 사전과 똑같을 때만 바꿉니다(부분 치환 없음).
 *  · script·style·textarea·input·code·pre 안은 건드리지 않습니다.
 *  · data-noi18n 이 붙은 요소와 그 안쪽은 통째로 건너뜁니다.
 *  · 원문을 노드마다 보관하므로 KR 로 되돌리면 100% 원래대로 돌아옵니다.
 */
(function () {
  'use strict';
  if (window.cgI18nShared) return;
  window.cgI18nShared = true;

  /* ─────────── 공용 사전 (한국어 → 영어) ───────────
     화면 전체에서 쓰는 UI 문구만 담습니다. 상품 설명·후기 본문은 넣지 않습니다. */
  var DICT = {
    /* 브랜드 · 공통 */
    '츄구미': 'ChewGumi',
    '한입에 건강을 더하다, 츄구미': 'ChewGumi — wellness in one bite',
    'ChewGumi 츄구미 — 한입에 건강을 더하다': 'ChewGumi — wellness in one bite',
    '한입에 건강을 더하는 츄구미의 모든 제품을 만나보세요': 'Every ChewGumi product — wellness in one bite',

    /* 머리말 · 길찾기 */
    '홈': 'Home',
    '← 홈으로': '← Home',
    /* 화면 아래쪽 '홈으로' 는 화살표 없이 쓰는 곳이 많아 따로 넣습니다.
       product · notice · qna · review · cart · checkout 여섯 곳에서 한국어로 남아 있었습니다 (issues #5) */
    '홈으로': 'Home',
    '공지': 'Notice',
    '전체상품': 'Shop All',
    '전체 상품 목록': 'All products',
    '회사소개': 'About',
    '이용안내': 'Guide',
    '문의하기': 'Contact',
    '문의 남기기': 'Leave a question',
    '자주묻는질문': 'FAQ',
    '자주묻는질문(FAQ)': 'FAQ',
    '자주 묻는 질문': 'FAQ',
    '고객센터': 'Customer Care',
    '카카오톡 문의': 'KakaoTalk',
    '장바구니': 'Cart',
    '관심상품': 'Wishlist',
    '나의 위시리스트': 'My wishlist',
    '마이페이지': 'My Page',
    '주문 조회': 'Order Lookup',
    '주문조회': 'Order Lookup',
    '배송조회': 'Track Delivery',
    '로그인': 'Log in',
    '로그아웃': 'Log out',
    '회원가입': 'Sign up',
    '회원 가입 하고': 'Sign up and get a',
    '2000원 할인 쿠폰': '₩2,000 coupon',
    '받기!': '!',
    '정기구독': 'Subscribe',
    '후기': 'Reviews',
    '공지사항': 'Notice',
    '문의': 'Q&A',
    '전체': 'All',
    '영상': 'Video',
    '배송': 'Shipping',
    '섭취': 'How to take',
    '보관': 'Storage',
    '트래블잇': 'Travel-it',
    '듀잇': 'Dew-it',
    '트래블잇 Travel-it': 'Travel-it',
    '듀잇 Dew-it': 'Dew-it',

    /* 상태 · 안내 */
    '불러오는 중…': 'Loading…',
    '불러오는 중...': 'Loading…',
    '로그인 상태를 확인하고 있습니다…': 'Checking your sign-in…',
    '계좌 정보를 불러오는 중…': 'Loading account details…',
    '후기를 불러오지 못했습니다.': 'Could not load reviews.',
    '장바구니가 비어 있습니다': 'Your cart is empty',
    '선택': 'Select',
    '보기': 'View',
    '취소': 'Cancel',
    '저장하기': 'Save',
    '닫기': 'Close',
    '지우기': 'Clear',
    '더 보기': 'See more',
    '등록하기': 'Submit',
    '글쓰기': 'Write',
    '계속 쇼핑하기': 'Continue shopping',
    '쇼핑 계속하기': 'Continue shopping',
    '장바구니 비우기': 'Empty cart',
    '장바구니 페이지에서 보기': 'Open cart page',
    '상세정보': 'Details',
    '배송·교환': 'Shipping & Returns',

    /* 정렬 · 목록 */
    '신상품순': 'Newest',
    '낮은 가격순': 'Price: low to high',
    '높은 가격순': 'Price: high to low',
    '상품명순': 'Name',

    /* 장바구니 · 주문서 */
    '총 상품금액': 'Subtotal',
    '배송비': 'Shipping fee',
    '쿠폰 할인': 'Coupon discount',
    '할인 쿠폰': 'Coupon',
    '쿠폰 선택 안 함': 'No coupon',
    '결제 예정 금액': 'Total due',
    '주문/결제': 'Checkout',
    '← 장바구니': '← Cart',
    '주문서 작성하기': 'Go to checkout',
    '주문서에서 배송지와 결제 수단을 고르실 수 있습니다.': 'You can choose the delivery address and payment method on the order page.',
    'ORDERER · 주문자 정보': 'ORDERER',
    'SHIPPING · 배송지': 'SHIPPING',
    'ORDER · 주문 상품': 'ORDER',
    'PAYMENT · 결제수단': 'PAYMENT',
    '결제하기': 'Pay now',
    '주문이 완료되었습니다': 'Your order is complete',
    '결제가 정상적으로 승인되었습니다.': 'Your payment was approved.',
    '주문 내역은 입력하신 연락처로 안내드립니다.': 'We will send order updates to the contact details you entered.',
    '주문 내역 보기': 'View order',

    /* 결제수단 */
    '신용카드': 'Credit card',
    '계좌이체': 'Bank transfer',
    '가상계좌': 'Virtual account',
    '무통장입금': 'Direct deposit',
    '네이버페이': 'NaverPay',
    '카드 · 간편결제': 'Card · Easy pay',
    '신용카드 · 네이버페이': 'Credit card · NaverPay',
    '에스크로 적용': 'Escrow protected',
    '에스크로': 'Escrow',
    '입금자명': 'Depositor name',
    '입금 기한': 'Payment due',
    '3일': '3 days',
    '가상계좌로 결제합니다': 'Pay by virtual account',
    '결제하면 나만의 계좌번호가 나옵니다.': 'You will receive your own account number after checkout.',
    '그 계좌로 입금하시면 자동으로 확인됩니다.': 'Transfer to that account and payment is confirmed automatically.',
    '입금이 확인되면 바로 발송합니다': 'We ship as soon as the deposit is confirmed',
    '주문 후 안내되는 계좌로 입금해 주시면, 확인 후 발송해 드립니다.': 'Transfer to the account shown after checkout and we will ship once confirmed.',
    '현금영수증은 입금 후 마이페이지에서 신청하실 수 있습니다.': 'You can request a cash receipt from My Page after payment.',
    '이지페이로 안전하게 결제합니다': 'Secured by EasyPay',
    '신용카드 · 계좌이체 · 가상계좌 · 네이버페이로 결제하실 수 있습니다.': 'Pay by credit card, bank transfer, virtual account or NaverPay.',
    '업데이트': 'update',

    /* 폼 라벨 */
    '이름': 'Name',
    '주문자명': 'Orderer name',
    '휴대전화': 'Mobile',
    '이메일': 'Email',
    '주소': 'Address',
    '우편번호': 'Postcode',
    '주소 찾기': 'Find address',
    '상세주소': 'Address line 2',
    '배송 메모': 'Delivery note',
    '비밀번호': 'Password',
    '비밀번호 확인': 'Confirm password',
    '아이디 (이메일)': 'Email (used as your ID)',
    '아이디 찾기': 'Find my ID',
    '비밀번호를 잊으셨나요?': 'Forgot your password?',
    '재설정하기': 'Reset it',
    '재설정 메일 받기': 'Send reset email',

    /* 로그인 · 가입 */
    '츄구미 회원으로 더 달콤한 혜택을 받아보세요': 'Join ChewGumi for sweeter rewards',
    'LOGIN — 로그인': 'LOGIN',
    'JOIN US — 가입하고 2,000원 쿠폰 받기': 'JOIN US — get a ₩2,000 coupon',
    '로그인 유지': 'Keep me signed in',
    '7일 동안': 'for 7 days',
    '공용 컴퓨터에서는 체크하지 마세요.': 'Do not tick this on a shared computer.',
    'SNS 계정으로 간편하게': 'Or continue with',
    '구글로 계속하기': 'Continue with Google',
    '카카오로 계속하기': 'Continue with Kakao',
    '네이버로 계속하기': 'Continue with Naver',
    '카드 결제는 안전을 위해 공식몰에서 진행됩니다.': 'Card payments are handled on the official store for your security.',
    '이미 회원이신가요?': 'Already a member?',
    '로그인하기': 'Log in',
    '[필수]': '[Required]',
    '[선택]': '[Optional]',
    '1. 정보입력 · 약관동의': '1. Details & terms',
    '2. 가입완료': '2. Done',
    '이메일 인증 후 가입이 완료됩니다.': 'Your account is created after email verification.',
    '인증 메일 받기': 'Send verification email',
    '인증 확인': 'Verify',
    '가입하신 이메일 주소가 로그인 아이디가 됩니다.': 'Your email address becomes your login ID.',
    '메일함에서 인증 링크를 눌러주세요. 인증이 확인되면 자동으로 다음 단계가 열립니다.': 'Open the link in your inbox. The next step unlocks automatically once verified.',
    '8자 이상 · 영문·숫자·기호 중 2가지 이상': '8+ characters, mixing at least two of letters, numbers and symbols',
    'ACCOUNT · 계정 정보': 'ACCOUNT',
    'PROFILE · 기본 정보': 'PROFILE',
    'AGREEMENT · 약관 동의': 'AGREEMENT',
    '주문·배송 안내를 받으실 번호입니다.': 'We use this number for order and delivery updates.',
    '전체 동의': 'Agree to all',
    '필수 및 선택 항목에 모두 동의합니다.': 'I agree to all required and optional items.',
    '이용약관 동의': 'Agree to the Terms of Service',
    '개인정보 수집 및 이용 동의': 'Agree to the collection and use of personal data',
    '만 14세 이상입니다': 'I am 14 or older',
    '쇼핑정보 수신 동의': 'Agree to receive shopping updates',
    'SMS 수신 동의': 'Agree to receive SMS',
    '이메일 수신 동의': 'Agree to receive email',
    '동의하신 내역(항목·일시)은 관계 법령에 따라 회원 탈퇴 시까지 보관됩니다.': 'Your consent record (items and timestamps) is kept until you close your account, as required by law.',
    '가입하기': 'Create account',
    '가입이 완료되었습니다': 'Welcome to ChewGumi',
    '🎉 2,000원 할인쿠폰이 지급되었습니다': '🎉 A ₩2,000 coupon has been added to your account',
    '츄구미가 드리는 나만의 색입니다.': 'This is the colour ChewGumi picked for you.',
    '후기와 게시글에 이 이름으로 표시됩니다.': 'This name appears on your reviews and posts.',
    '가입하실 때 받으신 나만의 색입니다.': 'The colour you received when you joined.',

    /* 마이페이지 */
    'MY INFO · 회원 정보': 'MY INFO',
    'COUPON · 보유 쿠폰': 'COUPONS',
    'ORDERS · 주문 내역': 'ORDERS',
    '보유 적립금': 'Points',
    '총 주문': 'Total orders',
    '누적 구매액': 'Lifetime spend',
    '구매 확정 시 결제 금액의 1%가 적립됩니다.': 'You earn 1% of each confirmed purchase as points.',
    'SMS 마케팅 수신 동의': 'Agree to marketing SMS',
    '이메일 마케팅 수신 동의': 'Agree to marketing email',
    '동의 내역 보기': 'View consent record',
    '회원 탈퇴': 'Close account',
    '탈퇴 시 회원 정보와 동의 내역은 즉시 파기됩니다.': 'Your profile and consent record are deleted immediately when you close your account.',
    '다만 전자상거래법에 따라 주문·결제 기록은 5년간 별도 보관되며, 회원 정보와 분리되어 관리됩니다.': 'Order and payment records are kept separately for 5 years as required by the E-Commerce Act, unlinked from your profile.',

    /* 주문 조회 */
    '주문번호와 주문자명으로': 'With your order number and name,',
    '비회원도 조회': 'guests can check too',
    '주문하실 때 받으신 주문번호와 주문자명을 넣어주세요.': 'Enter the order number and name you used at checkout.',
    '주문자명 또는 전화 뒷 4자리': 'Orderer name or last 4 digits of phone',
    '주문 조회하기': 'Look up order',
    '주문번호는': 'You can find your order number on the',
    '주문 완료 화면': 'order complete screen',
    '주문 확인 메일': 'order confirmation email',
    '에서 보실 수 있습니다.': '.',
    '회원이시면': 'Members can see everything in',
    '에서 한 번에 보실 수 있습니다.': '.',
    '로그인하시면': 'Log in to see',
    '을 확인하실 수 있습니다.': '.',

    /* 바닥글 · 사업자 정보 라벨 */
    '개인정보처리방침': 'Privacy Policy',
    '이용약관': 'Terms of Service',
    '상호명': 'Company',
    '대표자': 'CEO',
    '사업장 주소': 'Address',
    '사업자등록번호': 'Business reg. no.',
    '통신판매업 신고번호': 'E-commerce reg. no.',
    '평일 10:00 - 17:00 · 점심 12:00 - 13:00': 'Weekdays 10:00–17:00 · Lunch 12:00–13:00',
    '평일 09:00 – 18:00 (주말·공휴일 휴무)': 'Weekdays 09:00–18:00 (closed weekends & holidays)',
    '배송 안내 (평일 오후 2시 이전 주문 시 당일 출고)': 'Shipping — orders placed before 2 PM on weekdays ship the same day',

    /* 홈 화면 문구 */
    '세 가지 순간을 위한': 'For three kinds of moments,',
    '세 가지 맛': 'three flavours',
    '트리플 잇 미리 보기': 'Triple-it preview',
    '여행의 모든 순간을 가볍게': 'Travel light, every moment',
    '매달 알아서 도착하는 츄구미': 'ChewGumi, delivered every month',
    '챙기는 걸 잊어도 괜찮도록. 구독가로 더 합리적으로 만나보세요.': 'So you never have to remember. Better value with a subscription.',
    '정기구독 보기 →': 'See subscriptions →',
    '새 소식과 사진을 먼저 만나보세요': 'See our news and photos first',
    '인스타그램에서 보기': 'View on Instagram',
    '드림 잇': 'Dream-it',
    '스파크 잇': 'Spark-it',
    '리셋 잇': 'Reset-it',
    '드림 잇 · 복숭아맛': 'Dream-it · Peach',
    '스파크 잇 · 블루베리맛': 'Spark-it · Blueberry',
    '리셋 잇 · 청포도맛': 'Reset-it · Green grape',
    '당 걱정 없이 개운하게': 'Refreshing, with no sugar worries',
    '배송은 얼마나 걸리나요?': 'How long does delivery take?',
    '하루에 몇 개까지 먹어도 되나요?': 'How many can I have a day?',
    '보관은 어떻게 하나요?': 'How should I store it?',

    /* 상품 이름 (DB 값 — 고정 상품명이라 사전에 둡니다) */
    '[1봉] 트래블잇 Travel-it (40g)': '[1 pack] Travel-it (40g)',
    '[3봉] 트래블잇 Travel-it (40g)': '[3 packs] Travel-it (40g)',
    '[5봉] 트래블잇 Travel-it (40g)': '[5 packs] Travel-it (40g)',
    '[10봉] 트래블잇 Travel-it (40g)': '[10 packs] Travel-it (40g)',
    '[20봉] 트래블잇 Travel-it (40g)': '[20 packs] Travel-it (40g)',
    '듀잇 레몬민트': 'Dew-it Lemon Mint',
    '듀잇 그레이프': 'Dew-it Grape',
    '듀잇 4개입': 'Dew-it 4-pack',
    '듀잇 6개입': 'Dew-it 6-pack',
    '듀잇 10개입': 'Dew-it 10-pack',
    '듀잇 20개입': 'Dew-it 20-pack',

    /* 빈 목록 · 오류 안내 */
    '불러오지 못했습니다. 잠시 후 다시 시도해 주세요.': 'Could not load. Please try again in a moment.',
    '계좌 정보를 불러오지 못했습니다.': 'Could not load the account details.',
    '장바구니에 담긴 상품이 없습니다': 'There is nothing in your cart',
    '마음에 드는 츄구미를 담아보세요.': 'Add the ChewGumi you like.',
    '상품 보러 가기': 'Browse products',

    /* 주문 조회 · 로그인 잔여 */
    '가능합니다': 'is available',
    '주문번호': 'Order number',
    '과': 'and',
    '또는': 'or',
    '배송 조회': 'delivery tracking',
    '비밀번호 재설정': 'Reset password',
    '주문 내역': 'your orders',
    '적립금': 'points',
    '문의 · chewgumi24@gmail.com': 'Contact · chewgumi24@gmail.com',

    /* 가입 잔여 */
    '가입 시 주문 배송지가 자동 입력되고, 결제 금액의': 'Your delivery address is filled in automatically, and you earn',
    '1%가 적립': '1% back in points',
    '됩니다.': '.',
    '8자 이상 입력해 주세요.': 'Please enter at least 8 characters.',
    '선택 항목에 동의하지 않아도 가입 및 서비스 이용에 제한이 없습니다. 수신 동의는 가입 후 마이페이지에서 언제든 변경하실 수 있습니다.': 'Declining the optional items does not limit sign-up or your use of the service. You can change your marketing preferences at any time from My Page.',
    '이메일 인증 후 가입 가능': 'Verify your email to continue',

    /* 주문서 잔여 */
    '주문하기 (무통장입금)': 'Place order (direct deposit)',
    '결제 정보는 이지페이(KICC)를 통해 안전하게 처리되며, 주문 내역은 츄구미 서버에 저장됩니다. 결제 금액은 서버에서 재계산되어 위·변조가 차단됩니다.': 'Payment details are handled securely by EasyPay (KICC), and your order is stored on ChewGumi servers. The amount is recalculated on the server, so it cannot be tampered with.',
    '점검 모드 · 이 주문은 테스트로 기록됩니다': 'Maintenance mode — this order is recorded as a test',

    /* 회사소개 (about) */
    '한입에 건강을 더하다,': 'Wellness in one bite,',
    '건강을 챙겨야 한다는 건 알지만, 매일 꼬박꼬박 챙기는 일은 생각보다 어렵습니다.': 'We all know we should look after our health — but keeping it up every single day is harder than it sounds.',
    '물을 찾아야 하고, 알약을 꺼내야 하고, 어느 순간엔 챙기는 것 자체를 잊어버리기도 하죠.': 'You need water, you need to dig out the pills, and sooner or later you forget altogether.',
    '그래서 츄구미는 조금 다르게 생각했습니다.': 'So ChewGumi thought about it differently.',
    '더 간편하게, 더 맛있게. 물 없이 어디서든 가볍게 씹어 먹을 수 있도록 만들었습니다.': 'Simpler and tastier — something you can chew anywhere, with no water needed.',
    '왜 젤리와 캔디였을까요?': 'Why jelly and candy?',
    '좋은 성분을 담는 것만큼 매일 손이 가는 형태를 만드는 것도 중요하다고 생각했습니다. 챙겨 먹는 일이 부담스럽지 않도록, 가방에 쏙 넣어 다닐 수 있도록, 그리고 맛있어서 한 번 더 찾게 되도록. 츄구미는 그렇게 시작했습니다.': 'We believe the form matters as much as the ingredients. Easy to keep up with, small enough to slip into a bag, and tasty enough that you reach for it again. That is how ChewGumi began.',
    '물 없이 간편하게': 'No water needed',
    '비행기 안에서도, 이동 중에도, 바쁜 하루 중에도. 물을 따로 준비하지 않아도 가볍게 챙길 수 있습니다.': 'On a plane, on the move, in the middle of a busy day — no water required.',
    '어디든 가볍게': 'Light enough for anywhere',
    '여행 가방부터 작은 파우치까지 부담 없이 넣어 다닐 수 있습니다.': 'From a suitcase to a small pouch, it travels easily.',
    '맛있으니까 더 자주': 'Tasty, so you keep going',
    '건강을 위해 억지로 먹는 것이 아니라, 맛있어서 자연스럽게 손이 가도록. 감귤부터 복숭아, 블루베리, 청포도, 포도, 레몬민트까지 자연의 원물과 영양소를 가득 담아 츄구미만의 맛을 담았습니다.': 'Not something you force down for your health, but something you reach for because it tastes good. From tangerine to peach, blueberry, green grape, grape and lemon mint — real ingredients and nutrients in a flavour that is ours alone.',
    '필요한 순간에, 필요한 한입': 'The right bite for the moment',
    '매일 똑같은 걸 챙기기보다 지금 내게 필요한 것에 맞춰 골라 먹을 수 있도록. 츄구미는 일상 속 다양한 순간을 생각해 제품을 만들고 있습니다.': 'Rather than the same thing every day, choose what you need right now. ChewGumi builds products around the different moments of everyday life.',
    '트래블 잇 · 감귤맛': 'Travel-it · Tangerine',
    '여행 중에도 가볍게 챙기는 영양 한 봉.': 'A light pack of nutrition for the road.',
    '종합비타민을 비롯해 비타민C, 마그네슘, 타우린 등 12가지 영양 성분을 한 봉에 담았습니다.': 'Twelve nutrients in one pack, including a multivitamin, vitamin C, magnesium and taurine.',
    '제품 보기 →': 'View product →',
    '듀 잇 · 레몬민트 · 그레이프': 'Dew-it · Lemon Mint · Grape',
    '입안이 텁텁한 순간, 한 알로 상쾌하게.': 'One piece to freshen up a dull mouth.',
    '핀란드산 자일리톨을 93% 함유한 무설탕 자일리톨 캔디입니다.': 'A sugar-free xylitol candy with 93% Finnish xylitol.',
    '여행 전부터 여행 후까지, 상황에 따라 골라 먹는 3가지 젤리.': 'Three jellies to choose from, before, during and after a trip.',
    '편안한 밤을 위한 Dream-it, 활력이 필요한 순간의 Spark-it, 여행 후 가볍게 챙기는 Reset-it.': 'Dream-it for a restful night, Spark-it when you need energy, Reset-it to settle back in after travel.',
    '숫자로 보는 츄구미': 'ChewGumi in numbers',
    '개국 바이어와': 'countries — buyers',
    '연결': 'connected',
    '개국 수출 경험': 'countries exported to',
    '누적 제품 생산': 'units produced to date',
    '상황별 제품 라인': 'product lines by occasion',
    '미국 · 홍콩 · 대만 · 인도네시아 · 라오스 · 뉴질랜드 · 칠레 등': 'USA · Hong Kong · Taiwan · Indonesia · Laos · New Zealand · Chile and more',
    '오늘부터 한입': 'Start with one bite today',
    '회원가입하시면': 'Sign up and get a',
    '2,000원 할인쿠폰': '₩2,000 coupon',
    '을 드립니다.': '.',
    '구매 금액의 1%는 적립금으로 돌려드려요.': 'You also earn 1% of every purchase back in points.',
    '제품 보러 가기': 'Browse products',
    '인스타그램': 'Instagram',

    /* 이용안내 FAQ */
    '홈 › 고객센터 › 이용안내 FAQ': 'Home › Customer Care › FAQ',
    '홈 › 고객센터 › 이용안내': 'Home › Customer Care › Guide',
    '이용안내 FAQ': 'FAQ',
    '자주 묻는 질문을 모았습니다. 원하는 답을 찾지 못하셨다면 언제든 문의해 주세요.': 'The questions we hear most often. If you cannot find your answer, please get in touch.',
    '자주 묻는 질문을 모았습니다': 'The questions we hear most often',
    '쿠폰': 'Coupons',
    '반품': 'Returns',
    '주문': 'Orders',
    '회원': 'Members',
    '비회원': 'Guests',
    '상품': 'Products',
    '구매': 'Purchase',
    '포장': 'Packaging',
    '아이디어': 'Ideas',
    '쿠폰을 어떻게 사용하나요?': 'How do I use a coupon?',
    '발급 받은 쿠폰은 어디서 확인할 수 있나요?': 'Where can I see the coupons I have?',
    '반품이나 교환은 어떻게 신청하나요?': 'How do I request a return or exchange?',
    '교환/반품은 어떻게 신청하나요?': 'How do I request an exchange or return?',
    '언제까지 반품할 수 있나요?': 'How long do I have to return an item?',
    '환불은 언제 되나요?': 'When will I be refunded?',
    '상품 반품/교환 진행 시, 배송비가 부과되나요?': 'Is there a shipping charge for returns or exchanges?',
    '주문 내역 조회는 어디서 하나요?': 'Where do I check my orders?',
    '아이디, 비밀번호가 기억이 나지 않습니다.': 'I forgot my ID or password.',
    '회원정보를 수정하고 싶습니다.': 'I want to update my account details.',
    '회원 탈퇴는 어떻게 하나요?': 'How do I close my account?',
    '비회원 구매 후 주문번호(비밀번호)가 기억나지 않습니다.': 'I ordered as a guest and forgot my order number or password.',
    '비회원의 주문 내역 조회는 어떻게 하나요?': 'How can a guest check an order?',
    '비회원 구매 가능한가요?': 'Can I buy without an account?',
    '대량 구매(단체·행사)도 가능한가요?': 'Do you take bulk orders for groups or events?',
    '원하는 답을 못 찾으셨나요?': 'Still cannot find your answer?',
    '평일 9:00–18:00 · chewgumi24@gmail.com': 'Weekdays 9:00–18:00 · chewgumi24@gmail.com',
    '상품에 대한 문의는 문의 게시판에 남겨주시면 순차적으로 답변드립니다.': 'For product questions, please post on the Q&A board and we will reply in turn.',

    /* 이용안내 (guide) */
    '결제·배송·교환·반품에 대한 안내입니다. 주문 전 한 번 확인해 주세요.': 'How payment, delivery, exchanges and returns work. Worth a look before you order.',
    'PAYMENT · 결제안내': 'PAYMENT',
    'DELIVERY · 배송안내': 'DELIVERY',
    'EXCHANGE · 교환 / 반품 안내': 'EXCHANGES & RETURNS',
    'PRODUCT · 섭취 및 보관': 'HOW TO TAKE & STORE',
    '네이버페이, 신용카드, 계좌이체, 가상계좌, 무통장입금으로 결제하실 수 있습니다.': 'You can pay by NaverPay, credit card, bank transfer, virtual account or direct deposit.',
    '고액 결제의 경우 안전을 위해 카드사에서 확인 전화를 드릴 수 있습니다.': 'For large payments your card issuer may call to confirm, for your security.',
    '무통장입금은 주문 시 입력한': 'For direct deposit, the',
    '입금자명과 실제 입금자명이 일치': 'depositor name must match the one entered at checkout',
    '해야 확인됩니다.': '.',
    '입금되지 않은 주문은': 'Unpaid orders are',
    '7일 후 자동 취소': 'cancelled automatically after 7 days',
    '배송 방법': 'Method',
    '택배': 'Courier',
    '배송 지역': 'Area',
    '전국': 'Nationwide (Korea)',
    '배송 비용': 'Cost',
    '2,500원 ·': '₩2,500 ·',
    '50,000원 이상 구매 시 무료': 'free over ₩50,000',
    '출고 기준': 'Dispatch',
    '평일 오후 2시 이전 결제 완료 시 당일 출고': 'Same-day dispatch for weekday payments completed before 2 PM',
    '배송 기간': 'Transit time',
    '출고 후 1~2일 (주말·공휴일 제외)': '1–2 days after dispatch (excluding weekends and holidays)',
    '산간·도서 지역은 배송이 1~2일 더 소요되거나 추가 비용이 발생할 수 있습니다. 상품 종류나 물량에 따라 배송이 다소 지연될 수 있는 점 양해 부탁드립니다.': 'Remote and island areas may take 1–2 days longer or incur an extra charge. Delivery may also be slightly delayed depending on the item and volume.',
    '신청 방법': 'How to request',
    '주문 내역에서 직접 신청하실 수 있습니다.': 'You can request it yourself from your order history.',
    '회원은': 'Members use',
    ', 비회원은': ', guests use',
    '에서 해당 주문의': ', then press',
    '[반품 · 교환 신청]': '[Request return or exchange]',
    '을 눌러 주세요. 접수되면 하루 안에 연락드립니다.': ' on that order. We will contact you within a day.',
    '가능한 경우': 'When you can return',
    '— 전자상거래법 제17조 청약철회': '— withdrawal under Article 17 of the E-Commerce Act',
    '상품을 공급받은 날부터': 'Within',
    '7일 이내': '7 days',
    ', 미개봉 상태인 경우': ' of delivery, unopened',
    '표시·광고 내용과 다르거나 계약과 다르게 이행된 경우 — 공급받은 날부터 3개월 이내, 그 사실을 안 날부터 30일 이내': 'If the item differs from its description or the contract — within 3 months of delivery, or 30 days from when you noticed',
    '불가능한 경우': 'When you cannot return',
    '고객님 책임으로 상품이 멸실·훼손된 경우 (내용 확인을 위한 포장 훼손은 제외)': 'The item was lost or damaged through your own fault (opening the packaging to check the contents does not count)',
    '개봉 또는 일부 섭취로 상품 가치가 현저히 감소한 경우': 'The value has dropped significantly because it was opened or partly consumed',
    '시간 경과로 재판매가 곤란할 정도로 가치가 감소한 경우': 'Too much time has passed for the item to be resold',
    '배송비 부담': 'Who pays shipping',
    '상품 하자 · 오배송 · 배송 중 분실': 'Faulty item, wrong item or lost in transit',
    '— 배송비 전액 저희가 부담합니다': '— we cover the full shipping cost',
    '단순 변심': 'Change of mind',
    '— 왕복 배송비': '— round-trip shipping of',
    '5,000원': '₩5,000',
    '을 고객님께서 부담하십니다 (편도 2,500원)': ' is paid by you (₩2,500 each way)',
    '5만원 이상 무료배송으로 받으신 뒤 반품하여': 'If free shipping applied over ₩50,000 and your return brings the total',
    '5만원 미만': 'under ₩50,000',
    '이 되면, 처음 면제된 배송비 2,500원이 함께 차감됩니다': ', the ₩2,500 originally waived is deducted as well',
    '반품 주소 · [04309] 서울 용산구 청파로47길 46 205호': 'Return address · 46 Cheongpa-ro 47-gil, Room 205, Yongsan-gu, Seoul 04309, Korea',
    '환불 시기': 'Refund timing',
    '반품 확인 후': 'Within',
    '3영업일 이내': '3 business days',
    '에 결제하신 수단으로 환불해 드립니다. 신용카드는 승인을 취소하여 대금이 청구되지 않게 합니다. 다만 카드 결제일과 겹치면 청구된 뒤 다음 달에 카드사에서 환급됩니다.': ' of receiving the return, refunded to your original payment method. Card payments are voided so you are not charged; if this overlaps your billing date, the charge is refunded by your card issuer the following month.',
    '식품 특성상 개봉 후 반품이 어려운 점 양해 부탁드립니다. 화면에서 신청이 어려우시면 chewgumi24@gmail.com 또는 문의 게시판으로 연락 주셔도 됩니다.': 'As a food product, opened items generally cannot be returned. If you have trouble requesting online, email chewgumi24@gmail.com or use the Q&A board.',
    'FAQ 보기': 'See FAQ',
    '권장 섭취량 — 트래블잇 1일 1팩, 듀잇 1일 2~3알': 'Suggested serving — Travel-it: 1 pack a day; Dew-it: 2–3 pieces a day',
    '자일리톨 특성상 한 번에 많이 드시면 배가 불편할 수 있습니다.': 'Eating a lot of xylitol at once may upset your stomach.',
    '직사광선을 피해 서늘하고 건조한 곳에 보관해 주세요.': 'Store in a cool, dry place out of direct sunlight.',
    '개봉 후에는 밀봉하여 가능한 빨리 드시기를 권합니다.': 'Once opened, reseal and finish it before too long.',
    '알레르기 체질, 임신·수유 중이신 경우 성분을 확인하고 전문가와 상담 후 드세요.': 'If you have allergies or are pregnant or breastfeeding, check the ingredients and consult a professional first.',

    /* 배송 조회 */
    '주문번호 또는 운송장 번호로 배송 상황을 확인하실 수 있습니다.': 'Track your parcel with an order number or a waybill number.',
    '주문번호로 조회': 'By order number',
    '운송장으로 조회': 'By waybill number',
    '연락처 뒤 4자리': 'Last 4 digits of phone',
    '주문 시 입력하신 휴대전화 뒤 4자리를 넣어주세요. 본인 확인용입니다.': 'Enter the last 4 digits of the mobile number used at checkout. This is to confirm it is you.',
    '배송 조회하기': 'Track parcel',

    /* 관심상품 · 후기 쓰기 · 재설정 */
    '관심상품은 로그인하신 계정에 저장됩니다.': 'Your wishlist is saved to your account.',
    '로그인이 필요합니다': 'Please log in',
    '관심상품은 회원 계정에 저장되어': 'Your wishlist is saved to your account, so you',
    '어느 기기에서나 확인하실 수 있어요.': 'can see it from any device.',
    '로그인 · 회원가입': 'Log in · Sign up',
    '후기를 남겨주시면': 'Leave a review and get',
    '을 드립니다': '',
    '좀 어떠셨나요?': 'How was it?',
    '주소가 올바르지 않습니다.': 'That address is not valid.',
    '유효한 재설정 링크로 접속해 주세요. 메일에 있는 링크를 눌러 주세요.': 'Please use a valid reset link — open the link in your email.',
    '← 로그인으로': '← Back to log in',

    /* 정기구독 */
    '전체 상품': 'All products',
    '개별 상품': 'One-off',
    '정기 구독': 'Subscription',
    '매달 알아서 도착하는': 'Arrives every month, on its own',
    '챙기는 걸 잊어도 괜찮도록. 필요한 만큼 골라 구독하시면 매달 정해진 날짜에 보내 드립니다. 언제든 쉬거나 그만두실 수 있습니다.': 'So you never have to remember. Pick what you need and we send it on the same date each month. Pause or stop whenever you like.',
    '매달 자동 배송': 'Delivered automatically',
    '주문할 필요 없이 정해진 날짜에 도착합니다.': 'It arrives on schedule with no need to reorder.',
    '구독가 적용': 'Subscription price',
    '낱개로 사실 때보다 더 합리적입니다.': 'Better value than buying one at a time.',
    '부담 없이 조정': 'Change it freely',
    '쉬거나 그만두는 데 위약금이 없습니다.': 'No penalty for pausing or stopping.',
    '불러오지 못했습니다.': 'Could not load.',
    '언제든 그만둘 수 있나요?': 'Can I stop at any time?',
    '네. 위약금 없이 언제든 중단하실 수 있습니다. 마이페이지에서 신청하시거나 카카오톡으로 문의해 주세요.': 'Yes — stop any time with no penalty. Request it from My Page or message us on KakaoTalk.',
    '배송 날짜를 바꿀 수 있나요?': 'Can I change the delivery date?',
    '가능합니다. 다음 배송 3일 전까지 알려주시면 원하시는 날짜로 조정해 드립니다.': 'Yes. Tell us at least 3 days before the next delivery and we will move it.',
    '구성을 중간에 바꿀 수 있나요?': 'Can I change what is in it?',
    '맛 조합은 매달 변경 가능합니다. 구독 상품 자체를 바꾸시려면 기존 구독을 중단하고 새로 신청해 주세요.': 'You can change the flavour mix each month. To switch to a different subscription product, stop the current one and sign up again.',
    '결제는 어떻게 하나요?': 'How does payment work?',
    '현재는 무통장입금으로 매달 안내드립니다. 자동결제는 준비 중입니다.': 'For now we send a direct-deposit request each month. Automatic payment is on the way.',

    /* 고객 리포트 */
    '여러분의 의견이': 'Your feedback',
    '다음 제품을 만듭니다': 'shapes what we make next',
    '맛, 포장, 배송, 응대 — 무엇이든 좋습니다. 불편했던 점도, 이런 게 있으면 좋겠다는 생각도 들려주세요. 실제로 반영된 의견은 이 게시판에 공개합니다.': 'Flavour, packaging, delivery, service — anything at all. Tell us what bothered you, or what you wish existed. Feedback we act on is posted here.',
    '의견 남기기': 'Leave feedback',
    '어떤 이야기인가요': 'What is it about',
    '개선 제안': 'Suggestion',
    '사용 리포트': 'Usage report',
    '맛 · 식감': 'Taste & texture',
    '포장 · 디자인': 'Packaging & design',
    '응대 · 서비스': 'Service',
    '신제품 아이디어': 'New product idea',
    '한 줄 요약': 'One-line summary',
    '자세한 내용': 'Details',
    '10자 이상 적어주세요. 구체적일수록 반영될 가능성이 높습니다.': 'At least 10 characters. The more specific, the more likely we can act on it.',
    '사진 · 영상 (선택)': 'Photo or video (optional)',
    '사진 · 영상 올리기': 'Upload photo or video',
    '올려주신 사진은 확인 후 메인 화면에 소개해 드립니다. 계정을 함께 표기하며, 원치 않으시면 알려주세요.': 'We may feature your photo on the home page with a credit to your account. Let us know if you would rather we did not.',
    '만족도 (선택)': 'Rating (optional)',
    '이름 또는 별명 (선택)': 'Name or nickname (optional)',
    '연락처 (선택)': 'Contact (optional)',
    '연락처는 공개되지 않으며 답변 목적으로만 사용됩니다.': 'Your contact details are never shown publicly and are used only to reply.',
    '의견 보내기': 'Send feedback',
    '다른 분들의 의견': 'What others said',
    '최신순': 'Newest',
    '공감순': 'Most liked',
    '브랜드 소개': 'About the brand',
    '상품 문의': 'Product Q&A',

    /* 상품 상세 */
    '구매 순서': 'How to order',
    '로그인 또는 회원가입': 'Log in or sign up',
    '회원가입하시면 주문조회와 쿠폰을 쓰실 수 있습니다. 비회원 주문도 됩니다.': 'An account lets you track orders and use coupons. Guest orders are fine too.',
    '회원가입 · 2,000원 쿠폰': 'Sign up · ₩2,000 coupon',
    '옵션·수량 선택': 'Choose option and quantity',
    '위에서 구성과 수량을 고르고 [BUY NOW] 또는 [장바구니]를 누릅니다.': 'Pick the pack size and quantity above, then press [BUY NOW] or [Cart].',
    '결제': 'Payment',
    '신용카드·계좌이체·가상계좌·무통장입금 중 고르실 수 있습니다.': 'Choose credit card, bank transfer, virtual account or direct deposit.',
    '비회원으로도 구매하실 수 있지만, 회원가입 시 2,000원 할인쿠폰과 주문조회 기능을 이용하실 수 있습니다.': 'You can order as a guest, but signing up gets you a ₩2,000 coupon and order tracking.',
    '택배 · 5만원 이상 무료배송(미만 2,500원) · 평일 14시 이전 결제 시 당일 출고': 'Courier · free over ₩50,000 (₩2,500 under) · same-day dispatch for weekday payments before 2 PM',
    '교환/반품': 'Exchanges & returns',
    '미개봉 상태에 한해 수령 후 7일 이내 가능': 'Within 7 days of delivery, unopened only',
    '카카오톡 채널 · chewgumi24@gmail.com': 'KakaoTalk channel · chewgumi24@gmail.com',
    '더 궁금한 점이 있으신가요?': 'Anything else you would like to know?',
    '카카오톡 공유': 'Share on KakaoTalk',
    '링크 복사': 'Copy link',
    '후기를 불러오는 중…': 'Loading reviews…',
    '가볍게 시작하는 3봉 구성. 짧은 여행이나 첫 구매에 적당합니다.': 'An easy 3-pack to start with — good for a short trip or a first order.',
    '[1봉] 츄구미 여행용젤리 트래블잇 Travel-it (40g)': '[1 pack] ChewGumi Travel-it travel jelly (40g)',
    '[3봉] 츄구미 여행용젤리 트래블잇 Travel-it (40g)': '[3 packs] ChewGumi Travel-it travel jelly (40g)',
    '[5봉] 츄구미 여행용젤리 트래블잇 Travel-it (40g)': '[5 packs] ChewGumi Travel-it travel jelly (40g)',
    '[10봉] 츄구미 여행용젤리 트래블잇 Travel-it (40g)': '[10 packs] ChewGumi Travel-it travel jelly (40g)',
    '[20봉] 츄구미 여행용젤리 트래블잇 Travel-it (40g)': '[20 packs] ChewGumi Travel-it travel jelly (40g)',

    /* 홈 화면 잔여 */
    '지금 만나보세요': 'See it now',
    '설레는 여행, 컨디션까지': 'For the trip — and how you feel on it',
    '보러 가기 →': 'Take a look →',
    '츄구미의 새로운 소식을 알려드립니다': 'The latest from ChewGumi',

    /* 상담 챗봇 (assets/bot.js) */
    '츄구미 상담': 'ChewGumi Support',
    '상담 · 주문 · 음성으로 이용하세요': 'Chat, order, or use your voice',
    '답변이 정확하지 않을 수 있습니다. 중요한 문의는 카카오톡으로 연결해 주세요.': 'Answers may not always be accurate. For anything important, please reach us on KakaoTalk.',

    /* 게시판 직원용 단추 */
    '운영자': 'Staff',
    '글 관리': 'Manage posts',
    '관리자 홈': 'Admin home',

    /* 사업자 정보 — 값은 로마자로만 옮깁니다 (내용을 바꾸지 않습니다) */
    '윤소호': 'Yun So-ho',
    '04309 서울 용산구 청파로47길 46, 205호': 'Room 205, 46 Cheongpa-ro 47-gil, Yongsan-gu, Seoul 04309, Republic of Korea',
    '04309 서울 용산구 청파로47길 46 205호': 'Room 205, 46 Cheongpa-ro 47-gil, Yongsan-gu, Seoul 04309, Republic of Korea',
    '제2024-서울용산-1327호': 'No. 2024-Seoul Yongsan-1327',
    'COMPANY : ChewGumi | CEO : 윤소호': 'COMPANY : ChewGumi | CEO : Yun So-ho',
    'ADDRESS : 04309 서울 용산구 청파로47길 46 205호': 'ADDRESS : Room 205, 46 Cheongpa-ro 47-gil, Yongsan-gu, Seoul 04309, Republic of Korea',
    'BUSINESS NUMBER : 358-04-03258 | E-COMMERCE NUMBER : 제2024-서울용산-1327호': 'BUSINESS NUMBER : 358-04-03258 | E-COMMERCE NUMBER : No. 2024-Seoul Yongsan-1327',
    'PERSONAL INFO MANAGER : 윤소호 (chewgumi24@gmail.com)': 'PERSONAL INFO MANAGER : Yun So-ho (chewgumi24@gmail.com)',
    '실제 소비자들의 생생한 후기': 'Real reviews from real customers'
  };

  /* 화면별 추가 사전 — 이 파일보다 먼저 window.cgI18nExtra 를 채워 두면 합칩니다.
     (약관·개인정보처리방침처럼 그 화면에서만 쓰는 긴 사전을 따로 두기 위한 것입니다) */
  if (window.cgI18nExtra) {
    for (var _k in window.cgI18nExtra) {
      if (Object.prototype.hasOwnProperty.call(window.cgI18nExtra, _k) && !DICT.hasOwnProperty(_k)) {
        DICT[_k] = window.cgI18nExtra[_k];
      }
    }
  }

  var LS_KEY = 'cg_lang';
  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, INPUT: 1, SELECT: 1, OPTION: 1, CODE: 1, PRE: 1, SVG: 1 };
  var ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
  var lang = 'ko';
  var observer = null;

  /* 줄바꿈·연속 공백을 하나로 눌러 비교합니다 — 마크업이 줄을 나눠 놓아도 같은 문구로 봅니다 */
  function norm(s) { return (s || '').replace(/\s+/g, ' ').trim(); }
  function lead(s) { return (s.match(/^\s*/) || [''])[0]; }
  function tail(s) { return (s.match(/\s*$/) || [''])[0]; }

  function saved() {
    try { return localStorage.getItem(LS_KEY); } catch (e) { return null; }
  }
  function remember(l) {
    try { localStorage.setItem(LS_KEY, l); } catch (e) {}
  }

  /* data-noi18n 이 붙은 조상이 있으면 건너뜁니다 */
  function blocked(el) {
    for (var n = el; n && n !== document.body; n = n.parentElement) {
      if (n.hasAttribute && n.hasAttribute('data-noi18n')) return true;
    }
    return false;
  }

  function walkText(fn) {
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    var list = [], n;
    while ((n = w.nextNode())) list.push(n);
    for (var i = 0; i < list.length; i++) {
      var node = list[i], el = node.parentElement;
      if (!el || SKIP_TAGS[el.tagName]) continue;
      if (el.hasAttribute('data-en')) continue;   /* 화면이 스스로 처리하는 요소는 그대로 둡니다 */
      if (blocked(el)) continue;
      fn(node);
    }
  }

  function apply(l) {
    if (observer) observer.disconnect();

    walkText(function (node) {
      if (node.__cgKo === undefined) {
        var raw = node.nodeValue;
        var key = norm(raw);
        if (!key || !DICT.hasOwnProperty(key)) return;   /* 사전에 없으면 영원히 건드리지 않습니다 */
        node.__cgKo = raw;
        node.__cgEn = lead(raw) + DICT[key] + tail(raw); /* 앞뒤 공백은 그대로 보존 */
      }
      var want = (l === 'en') ? node.__cgEn : node.__cgKo;
      if (node.nodeValue !== want) node.nodeValue = want;
    });

    /* placeholder·title 등 속성 */
    var els = document.querySelectorAll('[placeholder],[title],[aria-label],[alt]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (blocked(el)) continue;
      for (var a = 0; a < ATTRS.length; a++) {
        var name = ATTRS[a];
        if (!el.hasAttribute(name)) continue;
        var store = '__cgA_' + name;
        if (el[store] === undefined) {
          var v = el.getAttribute(name) || '', k = norm(v);
          if (!k || !DICT.hasOwnProperty(k)) { el[store] = null; continue; }
          el[store] = { ko: v, en: lead(v) + DICT[k] + tail(v) };
        }
        if (!el[store]) continue;
        el.setAttribute(name, l === 'en' ? el[store].en : el[store].ko);
      }
    }

    document.documentElement.lang = l;
    var btn = document.getElementById('langBtn');
    if (btn) btn.textContent = (l === 'en') ? 'KR' : 'EN';

    if (observer) observer.observe(document.body, { childList: true, subtree: true, characterData: false });

    /* 화면이 언어 변경에 반응할 수 있게 알려 줍니다 */
    try { document.dispatchEvent(new CustomEvent('cg:lang', { detail: l })); } catch (e) {}
  }

  /* 화면에 언어 버튼이 없으면 만들어 답니다 */
  function ensureButton() {
    var have = document.getElementById('langBtn');
    if (have) {
      /* 화면에 이미 있는 버튼도 우리 것을 거치게 합니다 — 그래야 고른 언어가 기억됩니다 */
      have.onclick = function () { window.cgSetLang(lang === 'ko' ? 'en' : 'ko'); return false; };
      return;
    }
    var btn = document.createElement('button');
    btn.id = 'langBtn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Language');
    btn.textContent = (lang === 'en') ? 'KR' : 'EN';
    btn.onclick = function () { window.cgSetLang(lang === 'ko' ? 'en' : 'ko'); };

    var util = document.querySelector('header .util');
    if (util) {
      btn.style.cssText = 'font-size:11px;letter-spacing:1px;font-weight:600;color:inherit;background:none;border:0;cursor:pointer;padding:0 6px;';
      util.insertBefore(btn, util.lastElementChild);
      return;
    }
    btn.style.cssText = 'position:fixed;top:10px;right:12px;z-index:9998;font-size:11px;letter-spacing:1px;' +
      'font-weight:600;background:#fff;color:#333;border:1px solid #ddd;border-radius:14px;' +
      'padding:5px 11px;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.12);';
    document.body.appendChild(btn);
  }

  /* 공개 함수 — 화면에 이미 setLang 이 있으면 그것도 함께 부릅니다 */
  var pageSetLang = (typeof window.setLang === 'function') ? window.setLang : null;
  window.cgSetLang = function (l) {
    l = (l === 'en') ? 'en' : 'ko';
    lang = l;
    remember(l);
    if (pageSetLang) { try { pageSetLang(l); } catch (e) {} }
    apply(l);
  };
  if (!pageSetLang) window.setLang = window.cgSetLang;
  window.cgGetLang = function () { return lang; };

  function start() {
    /* 화면이 자체 setLang 을 늦게 정의했을 수 있어 다시 확인합니다 */
    if (!pageSetLang && typeof window.setLang === 'function' && window.setLang !== window.cgSetLang) {
      pageSetLang = window.setLang;
    }

    var s = saved();
    if (s === 'en' || s === 'ko') lang = s;
    else lang = (navigator.language || 'ko').toLowerCase().indexOf('ko') === 0 ? 'ko' : 'en';

    ensureButton();

    /* 자바스크립트가 나중에 그린 내용도 훑습니다 (0.2초 묶음 처리) */
    var timer = null;
    observer = new MutationObserver(function () {
      if (timer) return;
      timer = setTimeout(function () { timer = null; apply(lang); }, 200);
    });

    window.cgSetLang(lang);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
