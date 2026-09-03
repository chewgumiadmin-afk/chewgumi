/* ══════════════════════════════════════════════
   고객센터 연결처 (#98)

   카카오 채널 주소·전화·운영시간이 15곳에 하드코딩돼 있어서,
   대표님이 채널 채팅을 켜셔도 개발자가 코드를 고쳐야 했습니다.

   이제 shop_settings 에서 읽어 화면에 자동으로 반영합니다.
   대표님이 관리자 화면에서 바꾸면 전 화면에 바로 적용됩니다.

   바뀌는 것
     카카오 링크   cs_kakao_chat 이 on 이면 /chat, off 면 채널 홈
     전화          cs_phone · cs_phone_raw
     메일          cs_email
     운영시간      cs_hours
     네이버 톡톡    cs_naver_talk (값이 있으면 단추가 생깁니다)

   화면 코드는 손댈 필요 없습니다. 아래 표시만 있으면 됩니다.
     <a class="cs-kko">        카카오 문의
     <a class="kko-fab">       떠 있는 상담 단추
     <a data-cs="phone">       전화
     <a data-cs="email">       메일
     <span data-cs="hours">    운영시간
   ══════════════════════════════════════════════ */
(function () {
  'use strict';

  var SB = 'https://psynvpuedzjvytsgdhgg.supabase.co';
  var KEY = 'sb_publishable_Tz7vgJXgYHQ3tyUfm87WTw_vV1Dxfuk';
  var CACHE = 'cg_cs';
  var TTL = 10 * 60 * 1000;   /* 10분 */

  var DEFAULT = {
    cs_kakao_url: 'https://pf.kakao.com/_lxjxjiX',
    cs_kakao_chat: 'off',
    cs_phone: '0507-0444-2706',
    cs_phone_raw: '050704442706',
    cs_email: 'chewgumi24@gmail.com',
    cs_hours: '평일 10:00 - 17:00',
    cs_insta: '',
    cs_naver_talk: ''
  };

  function cached() {
    try {
      var j = JSON.parse(sessionStorage.getItem(CACHE) || 'null');
      if (j && j.at && Date.now() - j.at < TTL) return j.v;
    } catch (e) {}
    return null;
  }

  function fetchCfg() {
    var c = cached();
    if (c) return Promise.resolve(c);

    return fetch(SB + '/rest/v1/shop_settings?select=key,value&key=like.cs_*', {
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }
    })
    .then(function (r) { return r.ok ? r.json() : []; })
    .then(function (rows) {
      var v = {};
      for (var k in DEFAULT) v[k] = DEFAULT[k];
      (rows || []).forEach(function (r) {
        if (r.value != null && r.value !== '') v[r.key] = r.value;
      });
      try { sessionStorage.setItem(CACHE, JSON.stringify({ at: Date.now(), v: v })); } catch (e) {}
      return v;
    })
    .catch(function () { return DEFAULT; });
  }

  /* 카카오 주소 — 채팅이 켜져 있으면 바로 채팅으로 */
  function kakaoUrl(v) {
    var base = String(v.cs_kakao_url || '').replace(/\/+$/, '');
    if (!base) return '';
    return (v.cs_kakao_chat === 'on') ? base + '/chat' : base;
  }

  function apply(v) {
    var kko = kakaoUrl(v);

    /* 카카오 링크 전부 */
    if (kko) {
      document.querySelectorAll('a.cs-kko, a.kko-fab, a[data-cs="kakao"]')
        .forEach(function (a) {
          a.href = kko;
          a.target = '_blank';
          a.rel = 'noopener';
          if (v.cs_kakao_chat !== 'on') a.title = '카카오 채널로 이동합니다';
        });
    }

    /* 전화 */
    document.querySelectorAll('a[data-cs="phone"]').forEach(function (a) {
      a.href = 'tel:' + (v.cs_phone_raw || v.cs_phone).replace(/\D/g, '');
      if (!a.dataset.keepText) a.textContent = v.cs_phone;
    });
    document.querySelectorAll('[data-cs="phone-text"]').forEach(function (e) {
      e.textContent = v.cs_phone;
    });

    /* 메일 */
    document.querySelectorAll('a[data-cs="email"]').forEach(function (a) {
      a.href = 'mailto:' + v.cs_email;
      if (!a.dataset.keepText) a.textContent = v.cs_email;
    });

    /* 운영시간 */
    document.querySelectorAll('[data-cs="hours"]').forEach(function (e) {
      e.textContent = v.cs_hours;
    });

    /* 인스타 */
    if (v.cs_insta) {
      document.querySelectorAll('a[data-cs="insta"]').forEach(function (a) {
        a.href = v.cs_insta;
      });
    }

    /* 네이버 톡톡 — 값이 있을 때만 보입니다 */
    document.querySelectorAll('a[data-cs="naver-talk"]').forEach(function (a) {
      if (v.cs_naver_talk) { a.href = v.cs_naver_talk; a.style.display = ''; }
      else a.style.display = 'none';
    });

    /* 다른 코드에서도 쓸 수 있게 */
    window.CG_CS = v;
    window.CG_CS_URL = kko;
    try {
      window.dispatchEvent(new CustomEvent('cg-cs-ready', { detail: v }));
    } catch (e) {}
  }

  window.cgCS = function () { return fetchCfg(); };

  function boot() { fetchCfg().then(apply); }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
