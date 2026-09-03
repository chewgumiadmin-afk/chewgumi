# 열쇠 재발급 목록 (SECRET ROTATION)

> `docs/SECRETS-ROTATION.md` · 2026-09-03 작성
> **검색어**: `열쇠재발급` `SECRET-ROTATION` `노출된키` `키교체`
>
> 개발 대화 중 열쇠·비밀번호가 채팅에 그대로 오갔습니다.
> 대화 기록은 남으므로, 아래 항목은 **오픈 전에 모두 새로 발급**해야 합니다.
> 값은 여기 적지 않습니다. 앞 몇 글자로만 구분합니다.

---

## 🔴 반드시 바꿔야 하는 것

| # | 무엇 | 어디서 바꾸나 | 바꾼 뒤 넣을 곳 | 완료 |
|---|---|---|---|---|
| 1 | **이지페이 상점관리 비밀번호**<br>`chewgumi01` / `1234****` | office.easypay.co.kr → 비밀번호 변경 | (사람만 씀) | ☐ |
| 2 | **Gmail 계정 비밀번호**<br>`2026G****` | myaccount.google.com → 보안 | (사람만 씀) | ☐ |
| 3 | **GitHub 토큰**<br>`github_pat_11CLCPC****` | github.com/settings/tokens | `app_secrets.GITHUB_TOKEN` | ☐ |
| 4 | **Supabase 관리 토큰**<br>`sbp_eea415****` | supabase.com/dashboard/account/tokens | (작업 끝나면 삭제) | ☐ |
| 5 | **Cloudflare API 토큰**<br>`cfut_S6v8VN****` | dash.cloudflare.com/profile/api-tokens | (작업 끝나면 삭제) | ☐ |
| 6 | **INTERNAL_KEY**<br>`3ZrZDhb4****` | 직접 새로 만들어 교체 | `app_secrets.INTERNAL_KEY` | ☐ |
| 7 | **Resend API 키**<br>`re_WfDPy****` | resend.com/api-keys | `app_secrets.RESEND_API_KEY` | ☐ |

### ⚠️ 1번과 2번이 가장 급합니다
- 이지페이 관리자는 **거래취소·정산·세금계산서**가 다 됩니다
- Gmail 비밀번호는 다른 곳에서도 쓰신다면 **그쪽도 함께** 바꿔야 합니다

---

## 🟡 검토 후 정리

| # | 무엇 | 처리 | 완료 |
|---|---|---|---|
| 8 | `qa-bot@chewgumi.com` (제가 만든 검사용 계정) | 검사 끝나면 삭제 | ☐ |
| 9 | `app_secrets.QA_ADMIN_PW` (`QAtest****`) | 안 쓰면 삭제 · 쓰면 새 값으로 | ☐ |
| 10 | 카카오 Client Secret (`HYaafpYe****`) | 노출 이력 있음 → 재발급 검토 | ☐ |
| 11 | 시험 계정 `cgtest*@gmail.com` 3개 | 오픈 전 삭제 | ☐ |

---

## ⚪ 공개돼도 되는 것 (바꿀 필요 없음)

| 무엇 | 왜 괜찮은가 |
|---|---|
| Supabase anon key (`sb_publishable_****`) | 브라우저에 노출되는 공개 키. RLS 가 보호합니다 |
| `KAKAO_JS_KEY` | 원래 화면 코드에 들어가는 공개 키 |
| `VAPID_PUBLIC_KEY` | 웹푸시 공개 키 |
| 무통장 계좌 정보 | 손님에게 보여줘야 하는 값 |

---

## 바꾸는 순서 (권장)

```
1. 이지페이 비밀번호        ← 돈이 걸려 있음
2. Gmail 계정 비밀번호      ← 다른 곳 재사용 위험
3. INTERNAL_KEY            ← 내부 함수 인증
4. Resend API 키
5. GitHub 토큰             ← 바꾸면 제 배포가 멈추니 새 값을 주세요
6. Supabase·Cloudflare 토큰 ← 작업이 끝나면 그냥 삭제
```

### 3·4·6번은 제가 넣을 수 있습니다
새 값을 주시면 `app_secrets` 에 넣고, 관련 Edge Function 이 정상인지
확인까지 하겠습니다. **5번(GitHub)** 은 바꾸시면 제가 배포를 못 하니,
바꾸신 뒤 새 토큰을 알려주셔야 이어서 작업할 수 있습니다.

---

## 앞으로

- 열쇠는 **채팅에 붙여넣지 말고** Supabase `app_secrets` 나 대시보드에 직접 넣기
- 제가 필요하면 **"○○ 키가 필요합니다" 라고 먼저 여쭙고**, 대표님이 직접 넣으신 뒤
  제가 동작만 확인하는 방식이 안전합니다
- 부득이 주고받았다면 **이 문서에 적고 나중에 교체**

---

## 관련

- 이슈: `열쇠 재발급` 으로 검색
- `docs/TEST-PLAN.md` — 오픈 전 점검 순서
