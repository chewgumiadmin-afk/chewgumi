# 츄구미 자사몰 · 인수인계

윤소호 대표님께 넘겨드리는 문서입니다.
**무엇이 어디에 있고, 무엇을 하시면 되는지**만 담았습니다.

---

## 1. 사이트 주소

```
자사몰      https://shop.chewgumi.com
공식몰      https://chewgumi.com  (카페24, 그대로 운영 중)
저장소      github.com/chewgumiadmin-afk/chewgumi
```

**두 곳은 서로 독립**입니다. 자사몰은 이미지·후기·상품 정보를 모두 자체 서버에서 씁니다.
카페24를 내리셔도 자사몰은 그대로 작동합니다.

---

## 2. 관리자 계정

```
아이디                   비밀번호        권한
ceo@chewgumi.com        CeoQA!2026     대표 (모든 화면)
dev@chewgumi.com        DevQA!2026     개발자
design@chewgumi.com     DesignQA!2026  디자이너
```

> **오픈 전에 비밀번호를 바꿔주세요.** 지금 것은 개발용 임시 비밀번호입니다.

로그인: `shop.chewgumi.com/login.html`

---

## 3. 자주 쓰실 화면

| 화면 | 주소 | 무엇을 |
|---|---|---|
| 상품 관리 | `/products.html` | 가격·이미지·재고 고치기 |
| 채널·재고 | `/channels.html` | 여러 곳 주문 한눈에, 주문 메일 붙여넣기 |
| 주문·배송 | `/orders.html` | 주문 확인, 운송장 |
| 후기 가져오기 | `/review-import.html` | 네이버 후기 엑셀로 |
| 유지보수 관제 | `/ops.html` | 사용량, AI 비용, 자산 상태 |
| AI 개발 도우미 | `/dev.html` | 말로 화면 고치기 |
| 관리자 홈 | `/console.html` | AI 비서 |

---

## 4. 상품 가격 고치는 법

```
shop.chewgumi.com/products.html
```

**두 가지 방법이 있습니다.**

**손으로** — 상품을 누르면 정가·판매가·재고·설명을 고칠 수 있습니다.
사진은 끌어다 놓으면 자동으로 정리되어 올라갑니다.

**말로** — 위쪽 칸에 이렇게 적으시면 됩니다.

```
듀잇 4개입 판매가를 17,900원으로 바꿔줘
트리플잇 3종을 판매 시작해줘
트래블잇 전체 재고를 200개로
```

**바꿀 내용을 먼저 보여드립니다.** 확인하고 [이대로 반영]을 누르셔야 실제로 바뀝니다.

바꾼 내용은 모두 이력에 남습니다.

---

## 5. 결제 — 지금 상태

**현재 자사몰에서는 결제를 받지 않습니다.**
[N Pay 스마트스토어에서 구매] 버튼이 네이버로 보냅니다.

이지페이 연동이 끝나면 자사몰에서 바로 결제받을 수 있습니다.

### 이지페이 — 남은 것 하나

이미 등록된 것

```
MID          05598348
TID          8391473
상점관리 ID   chewgumi01
```

**아직 필요한 것 — 가맹점 키(라이선스 키)**

상점관리 비밀번호와는 다른, 긴 영문·숫자 문자열입니다.

```
1600-1234 (이지페이)
"MID 05598348 츄구미입니다.
 자체 개발한 웹사이트 연동용 가맹점 키를 받고 싶습니다."
```

**이 키만 받으시면** 신용카드·계좌이체·가상계좌·에스크로를 모두 열 수 있습니다.

> 상점관리 비밀번호가 `12345678`입니다. **꼭 바꿔주세요.**

---

## 6. 주문이 들어오면

**지금은 세 곳에서 주문이 들어옵니다.**

```
네이버 스마트스토어   자사몰에서 보내는 곳
카페24 공식몰        메일로 알림
자사몰               장바구니만 (결제는 아직)
```

**카페24 주문 메일을 받으시면**

```
shop.chewgumi.com/channels.html
→ 메일을 통째로 복사해 붙여넣기
→ [주문 넣기]
```

주문번호·상품·수량·금액을 알아서 찾아 넣고 **재고까지 줄입니다.**

**카페24 API를 승인**하시면 이 과정이 필요 없어집니다.
`/cafe24.html`에서 [연동 승인하기]를 한 번 누르시면 됩니다.

---

## 7. AI 비용

```
shop.chewgumi.com/ops.html
```

**AI 사용료 칸**에서 30일 사용료·이번 주·이달 예상을 보실 수 있습니다.
Anthropic 콘솔에 들어가지 않으셔도 됩니다.

**실제로 얼마나 드나**

```
관리자가 가끔 물어보는 정도      월 300~500원
고객 챗봇 열고 주문 500건       월 1,000~2,000원
주문 3,000건까지 늘어도         월 6,000~10,000원
```

**충전식이라 넣어둔 만큼만** 나갑니다. 자동 충전을 꺼두시면 그 이상 안 나갑니다.

현재는 개발자 계정의 키를 쓰고 있습니다.
**대표님 계정으로 옮기시려면** `console.anthropic.com`에서 키를 발급받아 알려주시면 됩니다.

---

## 8. 화면을 직접 고치고 싶으실 때

```
shop.chewgumi.com/dev.html
```

**말로 적으시면 AI가 고칩니다.**

```
① 고칠 화면 고르기
② "BEST ITEMS 글씨를 더 크게 해줘"
③ [수정안 만들기] — 아직 반영 안 됨
④ [미리보기]로 확인
⑤ [사이트에 반영] — 1~2분 뒤 적용
```

**화면 사진을 올리셔도** 됩니다. 이상한 부분을 찍어 올리면 그걸 보고 고칩니다.

**잘못되면 [되돌리기]**로 이전 상태로 돌아갑니다.

> 결제·주문 같은 중요한 화면은 자동으로 «꼼꼼히 검토»가 켜집니다.

---

## 9. Claude로 직접 관리하시려면

대표님 컴퓨터의 Claude Desktop에서 이 사이트를 직접 다루실 수 있습니다.

### 설정 파일 위치

```
Windows   %APPDATA%\Claude\claude_desktop_config.json
Mac       ~/Library/Application Support/Claude/claude_desktop_config.json
```

Claude Desktop → 설정 → 개발자 → 설정 편집에서도 여실 수 있습니다.

### 넣을 내용

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--project-ref=psynvpuedzjvytsgdhgg"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "발급받으신_토큰"
      }
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "발급받으신_토큰"
      }
    }
  }
}
```

### 토큰 발급받는 곳

**Supabase**

```
supabase.com/dashboard/account/tokens
→ Generate new token
→ 이름: ChewGumi Claude
```

`sbp_`로 시작하는 문자열이 나옵니다. **한 번만 보이니 저장해 두세요.**

**GitHub**

```
github.com/settings/tokens
→ Fine-grained tokens → Generate new token
→ Repository access: chewgumiadmin-afk/chewgumi
→ Permissions: Contents(Read and write), Pages(Read and write), Issues(Read and write)
```

> Node.js가 설치돼 있어야 `npx`가 작동합니다.
> 없으시면 `nodejs.org`에서 받으시면 됩니다.

---

## 10. 대표님께 확인이 필요한 것

### 가격 (이슈 #22)

```
□ 듀잇 「레몬민트」·「그레이프」는 몇 개들이인가요
   → 지금 4개입과 가격이 똑같습니다 (39,000 → 19,900)

□ 듀잇 낱개 정가는 얼마인가요
   → 묶음마다 기준이 달라 계산이 어긋납니다

□ 트래블잇 1봉에 정가를 넣을까요
   → 1봉만 할인 표시가 없어 비싸 보입니다

□ 듀잇 최소 주문 수량은 몇 개인가요

□ 트리플잇 3종은 언제 출시하나요
   → 이미지는 준비됐고 「COMING SOON」으로 표시 중
```

### 그 밖에

```
□ 이지페이 가맹점 키 받기 (1600-1234)
□ 이지페이 상점관리 비밀번호 바꾸기
□ 관리자 계정 비밀번호 바꾸기
□ 트래블잇 스마트스토어 상품 주소 알려주기
□ 트래블잇 상세 이미지 원본 (지금은 임시본)
□ 네이버 커머스 API 신청 (apicenter.commerce.naver.com)
□ 카카오톡 스토어 · 선물하기 입점 (이슈 #16)
```

---

## 11. 열려 있는 이슈

```
github.com/chewgumiadmin-afk/chewgumi/issues
```

| 번호 | 내용 |
|---|---|
| #15 | 결제 연동 · 채널 API 신청 안내 |
| #16 | 카카오톡 스토어 · 선물하기 입점 |
| #17 | 선물하기 제안서 (Word 첨부) |
| #18 | AI 사용료 계정 발급 |
| #19 | 관리자 화면 동작 확인 |
| #22 | 가격·개수 구성 정리 |

---

## 12. 기술 구성 (개발자용)

```
화면        GitHub Pages (정적 HTML)
데이터      Supabase (PostgreSQL)
서버 기능   Supabase Edge Functions
이미지      GitHub assets/ · Supabase Storage
메일        Resend
AI          Anthropic API
```

**주요 서버 기능**

```
dev-agent       화면 코드 수정
product-admin   상품 관리
ai-usage        AI 비용 집계
pay             이지페이 결제
ops-digest      관제 메일
naver-review    네이버 후기
```

**복원**

```sql
select restore_products();          -- 최근 저장본으로
select snap_products('설명');       -- 지금 상태 저장
select * from product_snapshots;    -- 저장본 목록
```

---

*문서 작성일: 2026년 8월 20일*
