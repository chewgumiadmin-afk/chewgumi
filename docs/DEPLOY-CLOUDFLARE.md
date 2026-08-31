# Cloudflare Pages 로 옮기기

GitHub Pages 는 이용약관에서 전자상거래 사이트를 금지합니다.
자체 결제를 켜기 전에 옮겨야 합니다. 빌드 과정이 없는 정적 사이트라 작업은 단순합니다.

## 옮기기 전 확인

- 저장소 크기 100 MB — Cloudflare 한도(파일 2만 개, 개당 25 MB) 안쪽입니다
- 빌드 명령 없음 — "빌드 설정 없음 / 출력 디렉터리 `/`" 로 두면 됩니다
- `_headers` 파일을 함께 올립니다 (보안 헤더·캐시 설정)

## 순서

1. Cloudflare 대시보드 → Workers & Pages → Create → Pages → Connect to Git
2. `chewgumiadmin-afk/chewgumi` 선택, 브랜치 `main`
3. 빌드 설정 — 프레임워크 `None`, 빌드 명령 비움, 출력 디렉터리 `/`
4. 첫 배포가 끝나면 `<프로젝트>.pages.dev` 주소로 **전체 동선을 한 번 확인**
   - 홈 → 전체상품 → 상세 → 장바구니 → 주문서 → 로그인/가입
   - 상세 이미지가 다 뜨는지 (`tools/img-check.py` 도 함께)
5. 문제 없으면 Custom domains 에 도메인 추가
6. DNS 를 Cloudflare 로 바꾸고 CNAME 을 `<프로젝트>.pages.dev` 로

## 되돌리기

DNS 를 원래대로 돌리면 됩니다. 저장소는 그대로라 GitHub Pages 도 계속 살아 있습니다.
`CNAME` 파일은 GitHub Pages 용이라 **지우지 말고 그대로 둡니다** (되돌릴 때 필요).

## 도메인 계획 — `www.chewgumi.com` 으로 옮길 때

지금 `www.chewgumi.com` 은 카페24 가 쓰고 있습니다. 자사몰을 그 주소로 올리려면 순서가 중요합니다.

1. 먼저 `shop.chewgumi.com` 을 Cloudflare Pages 로 옮겨 **한 주 정도 돌려 봅니다**
2. 카페24 쪽 주문·후기·회원 데이터를 어떻게 할지 정합니다 (옮길지, 읽기 전용으로 남길지)
3. 카페24 도메인 연결을 해제합니다 — 이 순간 카페24 몰은 접속 불가가 됩니다
4. `www.chewgumi.com` 을 Cloudflare Pages 에 연결합니다
5. `shop.chewgumi.com` 은 지우지 말고 `www` 로 **301 전환**을 겁니다
   (기존 링크·북마크·검색결과가 살아 있게)

**주의** — 3번과 4번 사이에는 몰이 잠깐 닫힙니다. 주문이 적은 시간대에 하고,
카페24 해지 전에 주문·회원 데이터를 반드시 먼저 내려받으세요.
