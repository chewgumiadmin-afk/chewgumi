# QA Kit

웹사이트를 점검할 때 쓰는 도구입니다.
화면 위에 메모지를 띄우고, 이상한 곳을 짚어 바로 보냅니다.

## 할 수 있는 것

- **콕 집기** — 이상한 요소를 누르면 무엇인지 자동으로 알아냅니다
- **캡처** — 지금 화면을 담아 함께 보냅니다
- **값 채우기** — 화면 코드를 읽고 상황에 맞는 값을 넣습니다
- **그림 점검** — 안 뜨는 이미지, 찌그러진 비율, alt 누락을 찾습니다
- **화면 안내** — 코드를 읽고 무엇을 어떻게 점검하면 되는지 알려줍니다
- **UX 항목** — 쓰면서 불편한 점을 고르게 합니다

## 붙이는 법

### 1. 페이지에 넣기

```html
<script src="qa-kit.js"
  data-endpoint="https://내서버/qa"
  data-project="내사이트"
  data-lang="ko"></script>
```

주소 뒤에 `?qa=1` 을 한 번 붙이면 켜지고, 그 뒤로는 계속 유지됩니다.
끄려면 `?qa=0` 입니다.

### 2. 코드를 못 고칠 때 — 북마클릿

브라우저 즐겨찾기에 아래를 주소로 저장하고, 점검할 화면에서 누르세요.

```
javascript:(function(){var s=document.createElement('script');s.src='https://내서버/qa-kit.js';s.dataset.endpoint='https://내서버/qa';document.body.appendChild(s)})()
```

## 서버 준비

1. `schema.sql` 로 표를 만듭니다
2. `qa-server.ts` 를 Supabase Edge Function 이나 Deno Deploy 에 올립니다
3. 환경변수를 넣습니다

| 변수 | 필요 | 쓰임 |
|---|---|---|
| `SUPABASE_URL` · `SUPABASE_SERVICE_ROLE_KEY` | 필수 | 신고 저장 |
| `ANTHROPIC_API_KEY` | 선택 | 값 채우기 · 화면 안내 |
| `GITHUB_TOKEN` · `GITHUB_REPO` | 선택 | 캡처 저장 · 코드 읽기 |
| `QA_EMAIL` · `QA_PHONE` | 권장 | 테스트로 받을 곳 |

키가 없어도 신고 접수는 됩니다. 값 채우기는 기본값으로 동작합니다.

## 설정

| 속성 | 기본 | 설명 |
|---|---|---|
| `data-endpoint` | — | 서버 주소 |
| `data-project` | 도메인 | 여러 사이트를 한 서버로 받을 때 구분 |
| `data-token` | — | 서버가 인증을 요구할 때 |
| `data-lang` | `ko` | `ko` 또는 `en` |
| `data-always` | `0` | `1` 이면 `?qa=1` 없이 항상 켜짐 |

## 주의

- 실제 서비스에 올릴 때는 `data-always` 를 쓰지 마세요
- 캡처는 화면 그대로 저장되므로 개인정보가 담길 수 있습니다
- 값 채우기는 실제 메일·문자를 발송시킬 수 있습니다. 화면 안내를 확인하세요

MIT License
