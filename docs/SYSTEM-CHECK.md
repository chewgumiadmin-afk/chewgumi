# 츄구미 시스템 점검 보고서

2026년 8월 21일 기준

---

## 1. 한눈에 보기

| 항목 | 상태 |
|---|---|
| Supabase 표 | 71개 · 17MB |
| GitHub 파일 | 326개 (화면 55 · 이미지 119 · 스크립트 18) |
| 이미지 용량 | 18MB |
| 서버 기능 | 24개 |
| 저장소 접근 | 정상 (chewgumi · QA-tool 모두 200) |
| GitHub Pages | 정상 작동 |

---

## 2. 이번 점검에서 고친 것

### ① 옛 주소가 남아 있던 곳

`site_url` 설정이 예전 GitHub Pages 주소를 가리키고 있었습니다.
이 값으로 만들어지는 모든 링크가 엉뚱한 곳으로 갔을 수 있습니다.

```
전   https://chewgumiadmin-afk.github.io/chewgumi
후   https://shop.chewgumi.com
```

관제 화면(`ops_assets`)의 자산 주소 두 개도 함께 바꿨습니다.

### ② 보호가 없던 표 두 개

```
product_snapshots   보호 꺼짐 · 규칙 0개   → 관리자만
pay_return_logs     규칙 0개              → 관리자만 읽기
```

`product_snapshots`는 상품 복원용 자료라 **가격 이력이 그대로 담겨** 있습니다.
누구나 읽을 수 있는 상태였습니다.

---

## 3. Supabase 표 현황

### 자료가 있는 표

| 표 | 행 | 무엇 |
|---|---|---|
| audit_logs | 627 | 관리자 작업 기록 |
| product_reviews | 148 | 후기 (네이버 40 · 표본 108) |
| nickname_pool | 75 | 닉네임 색 |
| shop_settings | 55 | 설정 |
| page_access | 23 | 화면별 접근 권한 |
| posts | 20 | 게시판 글 |
| cert_items | 18 | 인증 항목 |
| app_secrets | 16 | 비밀 키 |
| grievances | 15 | 민원 |
| products | 14 | 상품 |
| payments | 10 | 결제 기록 |
| user_films | 10 | 고객 영상 |
| orders | 4 | 주문 |
| banners | 4 | 배너 (안 쓰임) |
| clients | 3 | 회원 |

### 비어 있는 표 25개

```
buyers · campaigns · cert_logs · channel_orders · channel_products
consents · deploys · dev_drafts · export_docs · export_tasks
help_requests · issue_comments · issues · ops_chats · ops_reports
order_logs · post_comments · product_logs · qa_reports · refunds
report_research · report_votes · stock_moves · subscriptions · wishes
```

**대부분 앞으로 쓸 것들**입니다. 주문이 늘면 채워집니다.

**`issues`와 `issue_comments`**는 안 쓰이고 있습니다. 새로 만든 `fix_log`가 그 역할을 합니다.
정리하실지 확인이 필요합니다.

---

## 4. GitHub 저장소

### 주소

```
저장소     https://github.com/chewgumiadmin-afk/chewgumi
사이트     https://shop.chewgumi.com
QA 도구    https://github.com/hyunjeongshin83/QA-tool
```

**셋 다 유효합니다.**

### 파일 확인 방법

브라우저 캐시와 무관하게 **실제로 배포된 파일**을 보시려면

```
https://raw.githubusercontent.com/chewgumiadmin-afk/chewgumi/main/index.html
```

특정 시점의 파일을 보시려면 `main` 자리에 커밋 번호를 넣으시면 됩니다.

```
https://raw.githubusercontent.com/chewgumiadmin-afk/chewgumi/b42dc1f/index.html
```

### 변경 내용 보기

```
https://github.com/chewgumiadmin-afk/chewgumi/commit/커밋번호
```

### 배포 상태

```
https://github.com/chewgumiadmin-afk/chewgumi/deployments
```

---

## 5. 관리자 화면 목록

| 화면 | 주소 | 누가 |
|---|---|---|
| 수정 이력 | `/fixlog.html` | 대표 · 개발 |
| 상품 관리 | `/products.html` | 대표 · 운영 |
| 채널 · 재고 | `/channels.html` | 대표 · 운영 |
| 주문 · 배송 | `/orders.html` | 대표 · 운영 · 점검 |
| 재고 · 품절 | `/stock.html` | 대표 · 운영 · 점검 |
| 유지보수 관제 | `/ops.html` | 대표 · 개발 |
| AI 개발 도우미 | `/dev.html` | 대표 · 개발 |
| 관리자 홈 | `/console.html` | 대표 |
| 드라이브 자료 | `/drive.html` | 대표 · 개발 · 디자인 |
| 후기 가져오기 | `/review-import.html` | 대표 · 운영 |
| 회원 조회 | `/members.html` | 대표 |
| 카페24 연동 | `/cafe24.html` | 대표 · 개발 |
| 연동 관리 | `/integrations.html` | 대표 · 개발 |
| 개발 현황 | `/github.html` | 대표 · 개발 |
| AI 수출 비서 | `/export-ai.html` | 대표 |
| 규제 · 민원 | `/grievance.html` | 대표 |
| 화면 모음 | `/hub.html` | 전원 |

앞에 `https://shop.chewgumi.com` 을 붙이시면 됩니다.

---

## 6. 서버 기능 (Edge Functions)

| 이름 | 무엇 |
|---|---|
| dev-agent | 화면 코드 수정 |
| product-admin | 상품 관리 |
| ai-models | 모델 목록 갱신 |
| ai-usage | AI 비용 집계 |
| pay | 이지페이 결제 |
| ops-digest | 관제 메일 |
| naver-review | 네이버 후기 |
| github-check | 저장소 점검 |
| ai-check | AI 키 점검 |
| mail-check | 메일 점검 |

---

## 7. 아직 확인이 필요한 것

### 비밀 키

```
✓ Anthropic · GitHub · 카페24 · 카카오 · Resend · 스위트트래커
✕ EASYPAY_MALL_KEY        비어 있음 (결제는 되고 있음)
✕ NAVER_COMMERCE_*        미발급
```

**이지페이 키가 비어 있는데 결제가 성공**했습니다.
MID만으로 처리되는 연동이거나, 서버 환경변수에 따로 들어 있는 것으로 보입니다.
**이지페이에 확인해 두시는 게** 안전합니다.

### 표본 후기 108건

`product_reviews`의 자사몰 후기는 제가 만든 표본입니다.
실제 고객 후기가 아닙니다. **오픈 전에 정리하실지** 정해주세요.

```
네이버 후기 40건   실제
자사몰 후기 108건  표본
```

### 안 쓰이는 표

```
issues · issue_comments   fix_log 로 대체됨
banners                   배너를 DB에서 불러오던 시도의 흔적
```

---

## 8. 앞으로 이슈 처리 흐름

```
① 대표님이 /fixlog.html 에서 이슈를 올림
② 제가 원인을 찾아 고치고 배포
③ 이력에 남김
   · 시각 · 화면 · 원인 · 고침 · 배포 상태
   · [확인 화면] [변경 내용] [배포 원본] 세 가지 링크
④ 대표님이 [개발 확인 완료] 또는 [아직 안 됨]
⑤ 확인되면 [닫기] → CEO 가 볼 수 있게
```

**「배포 원본」 링크**를 꼭 보세요. 브라우저 캐시와 무관하게
실제로 올라간 파일을 보여줍니다. 오늘 같은 혼선을 막을 수 있습니다.

---

*보고서 작성: 2026년 8월 21일*
