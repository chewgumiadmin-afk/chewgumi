# Oracle 무료 서버로 고정 IP 만들기

네이버 커머스 API 에 등록할 **고정 IP** 를 무료로 얻는 방법입니다.

```
월 비용    0원 (평생 무료)
걸리는 시간  가입 30분 + 설정 1시간
결과       고정 공인 IP 1개
```

**QuotaGuard(월 2만 6천원)를 대신합니다.**

---

# 왜 Oracle 인가

| | Oracle | AWS | Google |
|---|---|---|---|
| 무료 기간 | **평생** | 12개월 | 평생 (조건부) |
| 서울 리전 | **있음** | 있음 | 무료는 미국만 |
| 고정 IP | **무료 1개** | 12개월만 | 무료 1개 |

**서울에 있고 평생 무료**라 우리에게 맞습니다.

---

# 0단계 · 준비물

```
□ 이메일          chewgumi24@gmail.com
□ 휴대전화         인증번호 받을 곳
□ 신용카드 또는 체크카드
```

## 카드가 필요한 이유

**본인 확인용**입니다. **100원 정도 결제 승인 후 바로 취소**됩니다.
Always Free 만 쓰면 돈이 나가지 않습니다.

> 걱정되시면 나중에 **「업그레이드 안 함」** 설정을 확인하시면 됩니다.

---

# 1단계 · 가입

## 1-1. 접속

```
https://www.oracle.com/kr/cloud/free/
```

**[무료로 시작하기]** 클릭

## 1-2. 정보 넣기

| 칸 | 넣을 것 |
|---|---|
| 국가 | 대한민국 |
| 이름 | 윤소호 (영문도 가능) |
| 이메일 | chewgumi24@gmail.com |

**메일로 인증 링크**가 옵니다. 누르세요.

## 1-3. 계정 정보

| 칸 | 넣을 것 |
|---|---|
| 비밀번호 | (기억하기 쉽게) |
| 클라우드 계정 이름 | chewgumi |
| **홈 리전** | **South Korea Central (Seoul)** |

> **홈 리전은 나중에 못 바꿉니다.** 반드시 **Seoul** 로 고르세요.

## 1-4. 본인 확인

```
휴대전화 인증번호
카드 정보 (100원 승인 후 취소)
```

## 1-5. 확인

```
□ 가입 완료 메일이 왔나요
□ 로그인이 되나요
```

**10~30분** 걸릴 수 있습니다.

---

# 2단계 · 서버 만들기

## 2-1. 인스턴스 만들기

```
로그인 후 왼쪽 ☰ 메뉴
→ Compute → Instances
→ [Create instance]
```

## 2-2. 설정

| 칸 | 고를 것 |
|---|---|
| Name | chewgumi-proxy |
| Image | **Ubuntu 22.04** |
| Shape | **VM.Standard.E2.1.Micro** |

> Shape 옆에 **「Always Free-eligible」** 딱지가 있어야 합니다.
> 없으면 [Change shape] 눌러 다시 고르세요.

## 2-3. 네트워크

```
Primary network        새로 만들기 (기본값 그대로)
Public IPv4 address    ✓ Assign  ← 반드시 체크
```

## 2-4. 열쇠 만들기

```
SSH keys → [Save private key]
```

**받은 `.key` 파일을 잘 보관**하세요. 서버에 들어갈 때 씁니다.

## 2-5. 만들기

```
[Create] → 2~3분 기다리기
→ 상태가 「Running」 이 되면 완료
```

## 2-6. IP 확인

```
인스턴스 화면 → Public IP address
예) 152.70.xxx.xxx
```

**이 IP 를 적어두세요.** 네이버에 등록할 값입니다.

---

# 3단계 · 고정 IP 로 바꾸기

**기본은 「임시 IP」라 서버를 껐다 켜면 바뀝니다.**

## 3-1. Reserved IP 로

```
인스턴스 화면 → Resources → Attached VNICs
→ VNIC 이름 클릭 → IPv4 Addresses
→ 오른쪽 ⋮ → [Edit]
```

## 3-2. 바꾸기

```
Public IP Type → Reserved Public IP
→ [Create a new reserved IP]
→ 이름: chewgumi-static
→ [Update]
```

## 3-3. 확인

```
□ IP 종류가 「Reserved」 로 바뀌었나요
□ IP 주소가 그대로인가요
```

**이제 껐다 켜도 안 바뀝니다.**

---

# 4단계 · 방화벽 열기

## 4-1. Oracle 쪽

```
인스턴스 → Primary VNIC → Subnet 클릭
→ Security Lists → Default Security List
→ [Add Ingress Rules]
```

| 칸 | 넣을 것 |
|---|---|
| Source CIDR | 0.0.0.0/0 |
| IP Protocol | TCP |
| Destination Port | 3128 |

**[Add Ingress Rules]** 로 저장.

## 4-2. 확인

```
□ 규칙 목록에 3128 이 보이나요
```

---

# 5단계 · 서버 접속

## 5-1. 터미널 열기

**윈도우** — PowerShell
**맥** — 터미널

## 5-2. 열쇠 파일 권한

```bash
chmod 400 ~/Downloads/ssh-key-2026-08-26.key
```

**파일 이름은 받으신 것에 맞춰** 바꾸세요.

## 5-3. 접속

```bash
ssh -i ~/Downloads/ssh-key-2026-08-26.key ubuntu@152.70.xxx.xxx
```

**IP 는 2-6 에서 적어둔 것**입니다.

```
Are you sure you want to continue connecting?  →  yes
```

## 5-4. 확인

```
□ ubuntu@chewgumi-proxy:~$ 가 보이나요
```

---

# 6단계 · 프록시 설치

**아래를 그대로 복사해 붙여넣으세요.** 한 줄씩이 아니라 통째로요.

```bash
sudo apt update && sudo apt install -y squid apache2-utils
```

## 6-1. 비밀번호 만들기

```bash
sudo htpasswd -c /etc/squid/passwd chewgumi
```

**비밀번호를 두 번** 넣으라고 합니다. 정하시고 **적어두세요.**

## 6-2. 설정 파일

```bash
sudo tee /etc/squid/conf.d/chewgumi.conf > /dev/null <<'EOF'
auth_param basic program /usr/lib/squid/basic_ncsa_auth /etc/squid/passwd
auth_param basic realm chewgumi
acl authenticated proxy_auth REQUIRED
http_access allow authenticated
http_access deny all
http_port 3128
forwarded_for delete
via off
EOF
```

## 6-3. 우분투 방화벽도 열기

```bash
sudo iptables -I INPUT 1 -p tcp --dport 3128 -j ACCEPT
sudo netfilter-persistent save
```

**「netfilter-persistent 없음」** 이 나오면

```bash
sudo apt install -y iptables-persistent
```

## 6-4. 다시 켜기

```bash
sudo systemctl restart squid
sudo systemctl enable squid
sudo systemctl status squid
```

## 6-5. 확인

```
□ active (running) 이 보이나요
```

---

# 7단계 · 밖에서 되는지 확인

**대표님 PC 터미널에서** (서버 말고)

```bash
curl -x http://chewgumi:비밀번호@152.70.xxx.xxx:3128 https://api.ipify.org
```

**서버 IP 가 나오면 성공입니다.**

```
152.70.xxx.xxx
```

## 안 되면

```
□ 4단계 Oracle 방화벽을 했나요
□ 6-3 우분투 방화벽을 했나요
□ 비밀번호가 맞나요
```

---

# 8단계 · 저에게 주실 것

```
프록시 주소
http://chewgumi:비밀번호@152.70.xxx.xxx:3128

고정 IP
152.70.xxx.xxx
```

**이 둘을 주시면** 제가 붙이겠습니다.

---

# 9단계 · 네이버에 IP 등록

```
https://apicenter.commerce.naver.com
→ 애플리케이션 관리 → 등록
→ [API 호출 IP] 에 152.70.xxx.xxx 넣기
```

**받으실 것**

```
애플리케이션 ID
애플리케이션 시크릿
```

**이것도 함께 주시면** 하루 안에 붙입니다.

---

# 조심할 것

## 서버를 켜두셔야 합니다

**Oracle 은 오래 안 쓰면 회수**할 수 있습니다.
Always Free 인스턴스는 **7일 넘게 CPU 사용률이 아주 낮으면** 알림이 옵니다.

**프록시가 계속 돌면 괜찮습니다.**

## 업그레이드하지 마세요

```
계정 화면에 [Upgrade] 단추가 보여도 누르지 마세요
누르면 유료 계정이 됩니다
```

## 비밀번호를 잘 보관하세요

```
Oracle 로그인 비밀번호
SSH 열쇠 파일 (.key)
프록시 비밀번호
```

**셋 다 잃으면** 처음부터 다시 해야 합니다.

---

# 정리

```
1단계  가입              30분
2단계  서버 만들기         10분
3단계  고정 IP 로 바꾸기    5분
4단계  Oracle 방화벽       5분
5단계  서버 접속           5분
6단계  프록시 설치         10분
7단계  확인               5분
8단계  저에게 알려주기
9단계  네이버에 등록        10분
```

**전부 합쳐 한 시간 반**쯤입니다.

**막히시면 어느 단계인지 알려주세요.**
화면 캡처나 터미널에 나온 글자를 그대로 주시면 정확히 봐드리겠습니다.

---

*안내 · 2026년 8월 26일*
