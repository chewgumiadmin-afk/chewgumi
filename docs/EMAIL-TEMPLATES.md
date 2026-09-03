# Supabase 인증 메일 서식

> `docs/EMAIL-TEMPLATES.md` · 2026-09-03
> 넣는 곳 → **Supabase 대시보드 → Authentication → Emails → Templates**
> https://supabase.com/dashboard/project/psynvpuedzjvytsgdhgg/auth/templates

---

## 왜 바꿔야 하나

지금 손님이 받는 메일은 Supabase 기본 서식입니다.

```
Confirm your signup
Follow this link to confirm your user:
https://psynvpuedzjvytsgdhgg.supabase.co/auth/v1/verify?token=…
```

- **영어**입니다
- 보낸 곳이 **츄구미와 아무 상관없는 주소**로 보입니다
- 손님이 **스팸으로 오해**하고 안 누릅니다
- 로고도 안내도 없습니다

링크의 `supabase.co` 주소 자체는 **바꿀 수 없습니다** (유료 커스텀 도메인 기능).
대신 **메일 본문을 브랜드로 채우면** 손님이 안심하고 누릅니다.

---

## 쓰는 이미지 (자사몰에 이미 있는 것)

| 쓰임 | 주소 |
|---|---|
| 로고 | `https://shop.chewgumi.com/logo.png` |
| 트래블잇 | `https://shop.chewgumi.com/assets/banner-travel.png` |
| 듀잇 | `https://shop.chewgumi.com/assets/banner-dew.png` |
| 상품 | `https://shop.chewgumi.com/assets/prod/dew-lemon.jpg` 등 |

DB `products.image` 에 있는 경로 앞에 `https://shop.chewgumi.com/` 만 붙이면 됩니다.

> ⚠️ 메일에서는 **`background-image` 와 `flex` 가 안 먹습니다.**
> `<table>` 과 `<img>` 로만 짭니다. 아래 서식은 그렇게 되어 있습니다.

---

## ① 회원가입 확인 (Confirm signup)

**Subject**
```
[츄구미] 이메일 확인만 하면 가입이 끝납니다
```

**Message body**
```html
<table width="100%" cellpadding="0" cellspacing="0" border="0"
  style="background:#FDF3F5;padding:32px 12px;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif">
<tr><td align="center">
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
    style="max-width:480px;background:#ffffff;border-radius:22px;overflow:hidden;
           box-shadow:0 8px 28px rgba(216,37,88,.10)">

    <tr><td align="center" style="padding:34px 28px 10px">
      <img src="https://shop.chewgumi.com/logo.png" alt="ChewGumi"
           width="132" style="display:block;border:0;width:132px;height:auto">
    </td></tr>

    <tr><td align="center" style="padding:6px 28px 0">
      <div style="font-size:20px;font-weight:800;color:#17171c;letter-spacing:-.3px">
        이메일만 확인하면 끝나요
      </div>
      <div style="font-size:14px;color:#797979;line-height:1.8;margin-top:12px">
        츄구미에 오신 것을 환영합니다.<br>
        아래 단추를 눌러 이메일을 확인해 주세요.
      </div>
    </td></tr>

    <tr><td align="center" style="padding:24px 28px 6px">
      <a href="{{ .ConfirmationURL }}"
         style="display:inline-block;padding:16px 44px;border-radius:999px;
                background:#D82558;color:#ffffff;font-size:15px;font-weight:700;
                text-decoration:none">이메일 확인하기</a>
    </td></tr>

    <tr><td align="center" style="padding:4px 28px 22px">
      <div style="font-size:11.5px;color:#a0a0a8;line-height:1.7">
        단추가 눌리지 않으면 아래 주소를 붙여 넣어 주세요<br>
        <span style="color:#c0c0c8;word-break:break-all">{{ .ConfirmationURL }}</span>
      </div>
    </td></tr>

    <tr><td style="padding:0 28px">
      <div style="height:1px;background:#f0e6ea"></div>
    </td></tr>

    <tr><td align="center" style="padding:22px 28px 6px">
      <div style="font-size:12.5px;font-weight:700;color:#17171c;margin-bottom:14px">
        확인이 끝나면 바로 만나보실 수 있어요
      </div>
    </td></tr>
    <tr><td align="center" style="padding:0 22px 8px">
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td width="50%" align="center" style="padding:0 5px">
            <img src="https://shop.chewgumi.com/assets/banner-travel.png"
                 alt="트래블잇" width="200"
                 style="display:block;border:0;width:100%;max-width:200px;height:auto;border-radius:14px">
            <div style="font-size:12px;color:#797979;margin-top:8px">트래블잇</div>
          </td>
          <td width="50%" align="center" style="padding:0 5px">
            <img src="https://shop.chewgumi.com/assets/banner-dew.png"
                 alt="듀잇" width="200"
                 style="display:block;border:0;width:100%;max-width:200px;height:auto;border-radius:14px">
            <div style="font-size:12px;color:#797979;margin-top:8px">듀잇</div>
          </td>
        </tr>
      </table>
    </td></tr>

    <tr><td align="center" style="padding:18px 28px 30px">
      <a href="https://shop.chewgumi.com"
         style="font-size:12.5px;color:#D82558;text-decoration:underline">
        츄구미 둘러보기</a>
    </td></tr>
  </table>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px">
    <tr><td align="center" style="padding:18px 20px 6px">
      <div style="font-size:11px;color:#a0a0a8;line-height:1.8">
        본인이 신청하지 않으셨다면 이 메일을 지워 주세요.<br>
        ChewGumi · 서울 용산구 청파로47길 46 205호<br>
        chewgumi24@gmail.com · 010-5702-2430
      </div>
    </td></tr>
  </table>
</td></tr>
</table>
```

---

## ② 비밀번호 재설정 (Reset password)

**Subject**
```
[츄구미] 비밀번호를 새로 정해 주세요
```

**Message body** — 위 서식에서 세 곳만 바꿉니다.

```
제목 줄     이메일만 확인하면 끝나요   →   비밀번호를 새로 정해 주세요
안내 글     츄구미에 오신 것을…       →   아래 단추를 누르면 새 비밀번호를
                                        정하는 화면으로 갑니다.
                                        이 링크는 1시간 뒤에 만료됩니다.
단추 글     이메일 확인하기           →   비밀번호 새로 정하기
```

상품 사진 부분은 빼는 편이 좋습니다. 비밀번호를 잃어버린 상황이라
광고처럼 보이면 거슬립니다.

맨 아래 안내는 이렇게 바꿉니다.
```
본인이 신청하지 않으셨다면 이 메일을 지워 주세요.
비밀번호는 바뀌지 않습니다.
```

---

## ③ 매직 링크 (Magic Link)

지금 쓰지 않으면 그대로 두셔도 됩니다.
쓰신다면 ①과 같은 서식에 단추 글만 `로그인하기` 로 바꾸세요.

---

## 넣는 순서

1. https://supabase.com/dashboard/project/psynvpuedzjvytsgdhgg/auth/templates
2. 왼쪽에서 **Confirm signup** 선택
3. **Subject heading** 에 위 제목 붙여넣기
4. **Message body** 를 위 HTML 로 통째로 바꾸기
5. **Save**
6. **Reset password** 도 같은 방법으로

## 넣은 뒤 확인

```
1. shop.chewgumi.com/join.html 에서 새 계정을 만들어 보기
2. 받은 메일에 로고와 상품 사진이 보이는지
3. 단추를 눌러 실제로 확인이 되는지
4. 스팸함으로 갔는지 받은편지함으로 왔는지
```

---

## 함께 볼 것 — Site URL

**Authentication → URL Configuration**

```
Site URL              https://shop.chewgumi.com
Redirect URLs         https://shop.chewgumi.com/**
                      https://shop.chewgumi.com/mypage.html
                      https://shop.chewgumi.com/reset.html
```

이게 맞아야 메일의 링크를 눌렀을 때 자사몰로 제대로 돌아옵니다.

---

## SMTP — 메일이 아예 안 나갈 때

Resend 인증(#104)이 끝나기 전까지는 Gmail 로 임시 발송할 수 있습니다.

**Project Settings → Authentication → SMTP Settings**

```
Host        smtp.gmail.com
Port        587
Username    chewgumi24@gmail.com
Password    Gmail 앱 비밀번호 16자
Sender      chewgumi24@gmail.com
Sender name 츄구미
```

앱 비밀번호는 https://myaccount.google.com/apppasswords 에서 만듭니다.
(2단계 인증이 켜져 있어야 메뉴가 보입니다)

이러면 **가입 확인·비밀번호 재설정 메일이 오늘 바로** 나갑니다.
주문확인·발송안내 메일은 Edge Function 이 Resend 를 쓰므로
#104 가 끝나야 합니다.
