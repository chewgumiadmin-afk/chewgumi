# 엣지 함수 — 저장소 사본

CLAUDE.md §3 이 말하던 「소스가 저장소에 없다」를 여기서 풉니다.
2026-09-25 에 Supabase 에 배포된 판을 그대로 받아 넣었습니다 (#156 · #136).
**여기 없는 함수(70여 개)는 아직 Supabase 에만 있습니다.** 필요할 때 같은 방법으로 받아 넣습니다.

| 폴더 | 받아 온 판 | 무엇 |
|---|---|---|
| `admin-chat` | v4 → **v5 (이 저장소에서 고침)** | 관리 비서 — 도구 셋 · 0단 패턴 (#156 CG-156-1 · 156-2) |
| `order-bot` | v5 | 말로 주문 처리 (ask 계획 → 카드 → run) |
| `pay` | v14 | 이지페이 거래등록 · 승인 · 취소 · 입금통보 |
| `refund` | v5 | 환불 (이지페이 취소 → 장부 → 재고·쿠폰 → 메일) |
| `ship-mail` | v2 | 발송 안내 메일 |
| `card-todos` | (원래 있던 것) | |

## 고치는 순서

1. 여기 파일을 고칩니다. 화면 쪽에서 우회하지 않습니다 — 같은 일이 두 군데로 갈라집니다.
2. 배포합니다. 둘 중 하나.
   - `supabase functions deploy <이름> --project-ref psynvpuedzjvytsgdhgg` (CLI · 로그인 필요)
   - Claude Code 세션의 Supabase 연결로 `deploy_edge_function` (이 저장소에서 2026-09-25 admin-chat v5 를 이렇게 올렸습니다)
3. `verify_jwt` 는 **모두 false** 입니다 — 함수 안에서 `admins` 표로 직접 확인합니다. 켜면 손님 화면(pay 의 KICC 입금통보 등)이 끊깁니다.

## 열쇠

소스에 열쇠는 없습니다. `Deno.env` → 없으면 `app_secrets` 표에서 읽습니다.
값은 대시보드에만 둡니다 (#111).
