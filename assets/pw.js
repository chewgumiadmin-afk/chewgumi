/* ══════════════════════════════════════════════
   츄구미 — 비밀번호 규칙 (한 군데서만 정합니다)

   쓰는 곳  join.html · reset.html · index.html(가입 레이어)
   기준     8자 이상 · 흔히 쓰는 비밀번호 차단
            이 계정에는 주소·전화번호·주문 내역이 담깁니다.

   이미 가입한 분은 그대로 로그인됩니다.
   새로 가입하거나 비밀번호를 바꿀 때만 적용됩니다.
   ══════════════════════════════════════════════ */
(function () {
  'use strict';

  var MIN = 8;

  /* 유출 목록에 자주 나오는 것들 · 한국에서 흔한 것들 */
  var COMMON = ('123456 1234567 12345678 123456789 1234567890 12345678910 ' +
    '111111 1111111 11111111 000000 0000000 00000000 121212 123123 123321 ' +
    '112233 654321 987654321 abcdefg abcdefgh abcd1234 abc12345 a1234567 ' +
    'qwerty qwerty123 qwertyui qwer1234 qwer!@#$ asdfasdf asdf1234 asdfghjk ' +
    'zxcvbnm zxcv1234 1q2w3e4r 1q2w3e4r5t 1qaz2wsx q1w2e3r4 password ' +
    'password1 password123 passw0rd p@ssword p@ssw0rd iloveyou letmein ' +
    'welcome welcome1 sunshine princess football baseball monkey123 ' +
    'dragon123 master123 shadow123 superman batman123 trustno1 ' +
    'admin123 administrator root1234 test1234 testtest guest123 ' +
    'chewgumi chewgumi1 chewgumi123 dewit123 travelit123 ' +
    'samsung1 daehanminguk korea123 seoul123 hangul123 ' +
    'love1234 lovelove happy123 happyday hello123 helloworld ' +
    'computer internet whatever nothing1 anything1 ' +
    'gksrmf1234 dkssud1234 tkfkdgo1234 rlaeogus dlrmsdyd ' +
    'wkdehdrms qkrtjdus dhkdrjsdud'
  ).split(/\s+/);

  /* aaaaaaaa · 12345678 처럼 한 글자만 반복하거나 쭉 이어지는 것 */
  function tooSimple(pw) {
    if (/^(.)\1+$/.test(pw)) return true;
    var up = 0, down = 0;
    for (var i = 1; i < pw.length; i++) {
      var d = pw.charCodeAt(i) - pw.charCodeAt(i - 1);
      if (d === 1) up++;
      if (d === -1) down++;
    }
    return up === pw.length - 1 || down === pw.length - 1;
  }

  /* 이메일 아이디나 전화번호를 그대로 쓴 경우 */
  function looksPersonal(pw, email, phone) {
    var low = String(pw).toLowerCase();
    var id = String(email || '').split('@')[0].toLowerCase();
    if (id.length >= 4 && low.indexOf(id) >= 0) return true;
    var num = String(phone || '').replace(/\D/g, '');
    if (num.length >= 8 && pw.indexOf(num.slice(-8)) >= 0) return true;
    return false;
  }

  /* 결과 { ok, msg, level }  level: 0 약함 · 1 보통 · 2 튼튼 */
  function check(pw, email, phone) {
    pw = String(pw == null ? '' : pw);

    if (!pw) return { ok: false, msg: MIN + '자 이상 입력해 주세요.', level: 0 };
    if (pw.length < MIN)
      return { ok: false, msg: MIN + '자 이상 입력해 주세요. (지금 ' + pw.length + '자)', level: 0 };
    if (pw.length > 72)
      return { ok: false, msg: '72자를 넘을 수 없습니다.', level: 0 };
    if (/\s/.test(pw))
      return { ok: false, msg: '빈칸은 쓸 수 없습니다.', level: 0 };
    if (COMMON.indexOf(pw.toLowerCase()) >= 0)
      return { ok: false, msg: '너무 많이 쓰이는 비밀번호입니다. 다른 것으로 바꿔 주세요.', level: 0 };
    if (tooSimple(pw))
      return { ok: false, msg: '같은 글자나 이어지는 숫자만으로는 만들 수 없습니다.', level: 0 };
    if (looksPersonal(pw, email, phone))
      return { ok: false, msg: '이메일 아이디나 전화번호가 그대로 들어 있습니다.', level: 0 };

    var kinds = 0;
    if (/[a-z]/.test(pw)) kinds++;
    if (/[A-Z]/.test(pw)) kinds++;
    if (/[0-9]/.test(pw)) kinds++;
    if (/[^a-zA-Z0-9]/.test(pw)) kinds++;

    if (kinds < 2)
      return { ok: false, msg: '영문·숫자·기호 가운데 두 가지 이상을 섞어 주세요.', level: 0 };

    var level = (pw.length >= 12 && kinds >= 3) ? 2 : 1;
    return {
      ok: true,
      level: level,
      msg: level === 2 ? '튼튼한 비밀번호입니다.' : '사용 가능합니다.'
    };
  }

  window.cgPw = {
    MIN: MIN,
    check: check,
    ok: function (pw, email, phone) { return check(pw, email, phone).ok; },
    hint: MIN + '자 이상 · 영문·숫자·기호 중 2가지 이상',
    placeholder: MIN + '자 이상'
  };
})();
