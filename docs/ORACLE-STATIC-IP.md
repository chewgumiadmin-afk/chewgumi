# Oracle 무료 서버 · 화면 따라 하기

**한 화면씩** 안내합니다.
각 단계에서 **막히시면 그 화면을 캡처해 주세요.**

```
월 비용   0원 (평생 무료)
전체 시간  한 시간 반쯤
결과      고정 공인 IP 1개
```

---

# 준비물

```
□ 이메일       chewgumi24@gmail.com
□ 휴대전화      인증번호 받을 곳
□ 카드         본인 확인용 (100원 승인 후 취소)
```

---
---

# 화면 1 · 가입 시작

## 여시는 곳

https://www.oracle.com/kr/cloud/free/

## 화면에서 보이실 것

```
Oracle Cloud Free Tier
평생 무료 서비스 + 30일 무료 크레딧

        [무료로 시작하기]
```

## 누르실 것

**[무료로 시작하기]**

## 다음 화면이 안 나오면

- [ ] 이 화면을 캡처해 주세요

---
---

# 화면 2 · 국가와 이름

## 화면에서 보이실 것

```
Start for free

Country/Territory  [            ▼]
First Name         [             ]
Last Name          [             ]
Email              [             ]

        [Verify my email]
```

## 넣으실 것

| 칸 | 넣을 것 |
|---|---|
| Country | **South Korea** |
| First Name | Soho |
| Last Name | Yoon |
| Email | chewgumi24@gmail.com |

## 누르실 것

**[Verify my email]**

## 그다음

**메일함을 열어주세요.** Oracle 에서 메일이 옵니다.

---
---

# 화면 3 · 메일 인증

## 메일에서 보이실 것

```
보낸 사람   Oracle Cloud
제목       Verify your email address

        [Verify email]
```

## 누르실 것

**[Verify email]**

## 메일이 안 오면

```
□ 스팸함을 봐주세요
□ 5분 기다려 보세요
□ 화면 2에서 [Resend] 를 눌러주세요
```

---
---

# 화면 4 · 계정 만들기  ★ 중요

## 화면에서 보이실 것

```
Account Information

Password              [            ]
Confirm Password      [            ]
Cloud Account Name    [            ]
Home Region           [          ▼]
```

## 넣으실 것

| 칸 | 넣을 것 |
|---|---|
| Password | 정하시고 **적어두세요** |
| Cloud Account Name | **chewgumi** |
| **Home Region** | **South Korea Central (Seoul)** |

## ★ 반드시 확인

```
Home Region 이 Seoul 인가요?
```

**나중에 못 바꿉니다.** 다른 곳으로 하면 처음부터 다시 해야 합니다.

## 누르실 것

**[Continue]**

- [ ] Seoul 로 골랐습니다

---
---

# 화면 5 · 휴대전화 인증

## 화면에서 보이실 것

```
Mobile Verification

Country code   [+82 ▼]
Phone number   [              ]

        [Send code]
```

## 넣으실 것

```
+82 · 1057022430   ← 앞의 0 을 뺍니다
```

## 누르실 것

**[Send code]** → 문자로 온 번호 넣기 → **[Verify]**

---
---

# 화면 6 · 카드 등록

## 화면에서 보이실 것

```
Payment Verification

카드 정보를 넣어주세요.
본인 확인용이며 요금이 청구되지 않습니다.
```

## 넣으실 것

```
카드 번호 · 유효기간 · CVC · 카드 주소
```

## 걱정 안 하셔도 됩니다

```
100원 정도 승인 후 바로 취소됩니다
Always Free 만 쓰면 돈이 나가지 않습니다
```

## 누르실 것

**[Start my free trial]**

## 그다음

```
계정을 만드는 중입니다…
10~30분 걸릴 수 있습니다
```

**끝나면 메일이 옵니다.**

- [ ] 가입 완료 메일을 받았습니다

---
---

# 화면 7 · 로그인

## 여시는 곳

https://cloud.oracle.com

## 화면에서 보이실 것

```
Cloud Account Name  [chewgumi]

        [Next]
```

## 넣으실 것

```
chewgumi → [Next] → 이메일과 비밀번호
```

## 로그인 뒤 보이실 것

```
Oracle Cloud Infrastructure
[☰]  ← 왼쪽 위 세 줄 메뉴
```

- [ ] 로그인이 됐습니다

---
---

# 화면 8 · 서버 만들기 시작

## 누르실 것

```
왼쪽 위 [☰] → Compute → Instances
```

## 화면에서 보이실 것

```
Instances

        [Create instance]
```

## 누르실 것

**[Create instance]**

---
---

# 화면 9 · 서버 설정  ★ 중요

## 화면에서 보이실 것 — 위에서부터

```
Name                    [instance-2026...]

Image and shape
  Image     Oracle Linux 9        [Change image]
  Shape     VM.Standard.E2.1.Micro [Change shape]
```

## ① 이름 바꾸기

```
Name → chewgumi-proxy
```

## ② Image 바꾸기

**[Change image]** 클릭

```
□ Oracle Linux
■ Canonical Ubuntu   ← 이것
```

```
Ubuntu 22.04 고르기 → [Select image]
```

## ③ Shape 확인  ★

```
VM.Standard.E2.1.Micro
🎁 Always Free-eligible   ← 이 딱지가 있어야 합니다
```

**없으면** [Change shape] → **Always Free 딱지가 붙은 것**을 고르세요.

- [ ] Ubuntu 22.04 인가요
- [ ] Always Free 딱지가 있나요

---
---

# 화면 10 · 네트워크와 열쇠

## 화면을 아래로 내리면

```
Primary VNIC information
  Virtual cloud network   (새로 만들기 · 기본값 그대로)
  Subnet                  (기본값 그대로)

  Public IPv4 address
    ● Assign a public IPv4 address   ← 반드시 이것
    ○ Do not assign
```

## ★ 확인

```
□ Assign a public IPv4 address 가 골라져 있나요
```

**이게 없으면 밖에서 접속할 수 없습니다.**

## 더 내리면 — 열쇠

```
Add SSH keys
  ● Generate a key pair for me   ← 이것

        [Save private key]  [Save public key]
```

## 누르실 것

**[Save private key]**

```
ssh-key-2026-08-26.key  같은 파일이 받아집니다
```

**이 파일을 잘 보관하세요.** 잃으면 서버에 못 들어갑니다.

- [ ] 열쇠 파일을 받았습니다

---
---

# 화면 11 · 만들기

## 누르실 것

**맨 아래 [Create]**

## 화면에서 보이실 것

```
chewgumi-proxy
● PROVISIONING     ← 만드는 중 (2~3분)
```

**기다리시면**

```
● RUNNING          ← 완료
```

## ★ 여기서 적어두실 것

```
Instance access

Public IP address     152.70.xxx.xxx   ← 적어두세요
Username              ubuntu
```

- [ ] Public IP 를 적어두었습니다

---
---

# 화면 12 · 고정 IP 로 바꾸기  ★ 중요

**지금은 껐다 켜면 IP 가 바뀝니다.**

## 누르실 것 — 순서대로

```
① 인스턴스 화면 아래 Resources
② [Attached VNICs] 클릭
③ VNIC 이름 클릭 (chewgumi-proxy 로 시작)
④ Resources → [IPv4 Addresses] 클릭
⑤ IP 오른쪽 ⋮ → [Edit]
```

## 화면에서 보이실 것

```
Edit Public IP

Public IP Type
  ○ No public IP
  ● Ephemeral public IP      ← 지금 이것
  ○ Reserved public IP       ← 이것으로 바꿉니다
```

## 바꾸실 것

```
Reserved public IP 고르기
→ [Create a new reserved IP]
→ Name: chewgumi-static
→ [Update]
```

## ★ 확인

```
□ Public IP Type 이 Reserved 인가요
□ IP 주소가 그대로인가요
```

- [ ] 고정 IP 로 바꿨습니다

---
---

# 화면 13 · 방화벽 열기

## 누르실 것 — 순서대로

```
① 인스턴스 화면 → Primary VNIC → Subnet 이름 클릭
② Security Lists → Default Security List 클릭
③ [Add Ingress Rules]
```

## 넣으실 것

| 칸 | 넣을 것 |
|---|---|
| Stateless | 체크 안 함 |
| Source Type | CIDR |
| Source CIDR | **0.0.0.0/0** |
| IP Protocol | **TCP** |
| Destination Port Range | **3128** |

## 누르실 것

**[Add Ingress Rules]**

## ★ 확인

```
□ 규칙 목록에 3128 이 보이나요
```

- [ ] 방화벽을 열었습니다

---
---

# 화면 14 · 서버 접속

## 터미널 여시는 법

```
윈도우   시작 → 「PowerShell」 검색
맥       Spotlight(⌘+Space) → 「터미널」
```

## ① 열쇠 파일 권한 (맥·리눅스만)

```bash
chmod 400 ~/Downloads/ssh-key-2026-08-26.key
```

**파일 이름은 받으신 것에 맞춰** 바꾸세요.

## ② 접속

```bash
ssh -i ~/Downloads/ssh-key-2026-08-26.key ubuntu@152.70.xxx.xxx
```

**IP 는 화면 11 에서 적어둔 것**입니다.

## 처음 물어보는 것

```
Are you sure you want to continue connecting (yes/no)?
```

→ **yes** 입력

## ★ 성공하면

```
ubuntu@chewgumi-proxy:~$
```

- [ ] 접속했습니다

## 안 되면

```
□ 화면 13 방화벽을 했나요
□ IP 가 맞나요
□ 열쇠 파일 경로가 맞나요
```

**터미널에 나온 글자를 그대로 알려주세요.**

---
---

# 화면 15 · 프록시 설치

**아래를 한 덩이씩 복사해 붙여넣으세요.**

## ① 설치

```bash
sudo apt update && sudo apt install -y squid apache2-utils
```

**2~3분** 걸립니다.

## ② 비밀번호 만들기

```bash
sudo htpasswd -c /etc/squid/passwd chewgumi
```

```
New password:        ← 정하시고 적어두세요
Re-type new password:
```

**화면에 안 보이는 게 정상**입니다.

## ③ 설정 넣기

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

## ④ 우분투 방화벽

```bash
sudo iptables -I INPUT 1 -p tcp --dport 3128 -j ACCEPT
sudo apt install -y iptables-persistent
sudo netfilter-persistent save
```

**중간에 화면이 뜨면** → **[Yes]** 고르기

## ⑤ 켜기

```bash
sudo systemctl restart squid && sudo systemctl enable squid
sudo systemctl status squid
```

## ★ 확인

```
● squid.service - Squid Web Proxy Server
   Active: active (running)   ← 이것이 보이면 성공
```

**나가실 때** `q` 를 누르세요.

- [ ] active (running) 을 봤습니다

---
---

# 화면 16 · 밖에서 확인

**서버 말고 대표님 PC 터미널**에서 하세요.

## ① 서버에서 나오기

```bash
exit
```

## ② 확인

```bash
curl -x http://chewgumi:비밀번호@152.70.xxx.xxx:3128 https://api.ipify.org
```

**비밀번호와 IP 를 바꿔 넣으세요.**

## ★ 성공하면

```
152.70.xxx.xxx      ← 서버 IP 가 나옵니다
```

**이게 나오면 끝입니다.**

## 안 되면

```
□ 화면 13 Oracle 방화벽
□ 화면 15 ④ 우분투 방화벽
□ 비밀번호가 맞나요
```

- [ ] IP 가 나왔습니다

---
---

# 화면 17 · 네이버에 등록

## 여시는 곳

https://apicenter.commerce.naver.com

## 누르실 것

```
판매자 로그인
→ [애플리케이션 관리]
→ [애플리케이션 등록]
```

## 넣으실 것

| 칸 | 넣을 것 |
|---|---|
| 이름 | 츄구미 자사몰 |
| 용도 | 주문 수집 · 재고 연동 |
| **API 호출 IP** | **152.70.xxx.xxx** |

## ★ 받으실 것

```
애플리케이션 ID
애플리케이션 시크릿
```

- [ ] 등록하고 ID·시크릿을 받았습니다

---
---

# 마지막 · 저에게 주실 것 셋

```
① 프록시 주소
   http://chewgumi:비밀번호@152.70.xxx.xxx:3128

② 네이버 애플리케이션 ID

③ 네이버 애플리케이션 시크릿
```

**셋을 주시면 하루 안에 붙입니다.**

---
---

# 조심할 것

## 업그레이드하지 마세요

```
[Upgrade] 단추가 보여도 누르지 마세요
누르면 유료 계정이 됩니다
```

## 서버를 계속 켜두세요

**Oracle 은 오래 안 쓰면 회수**할 수 있습니다.
프록시가 계속 돌면 괜찮습니다.

## 셋을 잘 보관하세요

```
Oracle 로그인 비밀번호
SSH 열쇠 파일 (.key)
프록시 비밀번호
```

**잃으면 처음부터 다시** 해야 합니다.

---

# 막히시면

**어느 화면인지 알려주세요.**

```
「화면 9 에서 Always Free 딱지가 안 보입니다」
「화면 14 에서 이런 글자가 나옵니다: ...」
```

**캡처를 주시면 가장 정확합니다.**

---

*안내 · 2026년 8월 26일*
