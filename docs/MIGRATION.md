# 저장소 이전 안내 (츄구미 계정으로)

현재 `hyunjeongshin83/chewgumi` (MedIT 개인 계정) → 츄구미 계정으로 옮길 때
반드시 함께 처리해야 하는 항목을 정리합니다.

---

## 1. 이전 방법 — Transfer 권장

GitHub의 **Transfer ownership** 기능을 쓰면 **커밋 이력·이슈·설정이 모두 유지**됩니다.
새로 만들어 복사하면 이력이 사라지므로 권장하지 않습니다.

Settings → 맨 아래 Danger Zone → Transfer ownership
→ 새 소유자 계정명 입력 → 저장소명 입력하여 확인

**받는 쪽 계정이 먼저 만들어져 있어야 합니다.**

---

## 2. 이전 후 반드시 바꿔야 하는 것

### 2-1. 사이트 주소가 바뀝니다

```
현재  https://hyunjeongshin83.github.io/chewgumi/
이후  https://<새계정>.github.io/chewgumi/
```

**이 주소가 코드 곳곳에 하드코딩되어 있습니다.** 전부 찾아 바꿔야 합니다.

| 위치 | 내용 |
|---|---|
| 각 HTML | `og:image`, `og:url` 등 메타태그 |
| `assets/lite.js` | 없음 (상대경로) |
| Edge Function `cafe24` | 연동 완료 후 이동할 주소 |
| Edge Function `subscribe` | 배송조회 링크 |
| Edge Function `notify` | 메일 본문의 주문관리 링크 |
| Edge Function `grievance` | 문서 내 사이트 주소 |
| Supabase Auth | Site URL, Redirect URLs |

**대안** — 커스텀 도메인을 붙이면 이 문제가 사라집니다.
`chewgumi.com`의 서브도메인(예: `shop.chewgumi.com`)을 GitHub Pages에 연결하면
계정이 바뀌어도 주소가 유지됩니다. **QR 코드를 이미 인쇄하셨다면 이 방법이 필수입니다.**

### 2-2. GitHub Pages 재설정

이전 후 Settings → Pages 에서 **Source를 다시 지정**해야 합니다.
(Deploy from a branch → main → / (root) 또는 GitHub Actions)

### 2-3. 토큰 재발급

현재 저장소에 쓰는 GitHub 토큰은 **MedIT 개인 계정 소유**입니다.
이전 후에는 츄구미 계정에서 새 토큰을 발급해야 합니다.

```
github.com/settings/tokens → Fine-grained tokens → Generate new token
권한: Contents(R+W), Pages(R+W), Issues(R+W)
```

발급 후 **Supabase Secrets의 `GITHUB_TOKEN`을 교체**해야
AI 개발 도우미(`/dev.html`)가 계속 작동합니다.

### 2-4. Supabase 소유권

Supabase 프로젝트(`psynvpuedzjvytsgdhgg`)는 **별도로 이전**해야 합니다.
GitHub 이전과 무관합니다.

- Organization Settings → Members에서 츄구미 계정을 Owner로 추가
- 또는 Transfer project 기능 사용
- **DB 데이터·Edge Function·Secrets는 그대로 유지**됩니다

### 2-5. 카페24 앱 Redirect URI

카페24 개발자센터에 등록된 Redirect URI는 Supabase 주소이므로
**Supabase를 그대로 쓰면 변경 불필요**합니다.

---

## 3. 이전 전 체크리스트

- [ ] 츄구미 GitHub 계정 생성
- [ ] 커스텀 도메인 사용 여부 결정 (권장: `shop.chewgumi.com`)
- [ ] 현재 저장소 백업 (Download ZIP)
- [ ] Supabase 데이터 백업 (Database → Backups)
- [ ] 진행 중인 작업 마무리 (이전 중 커밋 불가)

## 4. 이전 후 체크리스트

- [ ] GitHub Pages Source 재설정
- [ ] 사이트가 열리는지 확인
- [ ] 새 토큰 발급 → Supabase Secrets 교체
- [ ] Supabase Auth의 Site URL · Redirect URLs 수정
- [ ] 소셜 로그인 제공자(구글·카카오)의 Redirect URI 수정
- [ ] `python3 tools/verify.py` 실행하여 깨진 링크 확인
- [ ] `node tools/test.js` 실행
- [ ] 이전 토큰 폐기

---

## 5. 예상 소요

| 작업 | 시간 |
|---|---|
| Transfer 자체 | 5분 |
| Pages 재설정 · 확인 | 10분 |
| 주소 일괄 수정 | 30분 (커스텀 도메인 쓰면 불필요) |
| 토큰·인증 재설정 | 20분 |

**커스텀 도메인을 먼저 붙여두면 이전 작업이 크게 줄어듭니다.**
이전 계획이 있으시면 도메인 연결을 먼저 하시길 권합니다.
