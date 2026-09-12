/*! ChewGumi Site Config v1 · MedIT
 *  사이트 주소를 한 곳에서 관리합니다.
 *  나중에 도메인이나 저장소가 바뀌면 이 파일만 고치면 됩니다.
 *
 *  적용: <head> 안, 다른 스크립트보다 먼저
 *    <script src="assets/site.js"></script>
 */
(function () {
  'use strict';

  var CFG = {
    /* 공식몰 — 실제 결제가 일어나는 곳 */
    MALL: 'https://chewgumi.com',
    MALL_NAME: '공식몰',

    /* 이 사이트가 놓인 위치 (자동 감지, 아래 OVERRIDE로 고정 가능) */
    SITE: '',

    /* 나중에 커스텀 도메인을 붙이면 여기에 적어주세요.
       예) 'https://shop.chewgumi.com'  비워두면 현재 주소를 씁니다. */
    SITE_OVERRIDE: '',

    /* 브랜드 */
    BRAND: 'ChewGumi',
    BRAND_KR: '츄구미',

    /* 외부 채널 */
    /* 고객 상담 */
    CS_PHONE: '0507-0444-2706',
    CS_PHONE_RAW: '050704442706',
    CS_HOURS: '평일 10:00 - 17:00 · 점심 12:00 - 13:00',

    KAKAO: 'https://pf.kakao.com/_lxjxjiX',
    INSTA: 'https://www.instagram.com/chewgumi_official/',

    /* 공식몰 상품번호 — 자체 사이트 상품ID와 동일하게 맞춰져 있습니다 */
    PRODUCT_PATH: '/product/detail.html?product_no='
  };

  /* 현재 사이트 주소 계산 */
  function detect() {
    if (CFG.SITE_OVERRIDE) return CFG.SITE_OVERRIDE.replace(/\/+$/, '');
    var p = location.pathname;
    /* /chewgumi/foo.html → /chewgumi/ */
    var base = p.replace(/[^/]*$/, '');
    return (location.origin + base).replace(/\/+$/, '');
  }
  CFG.SITE = detect();

  /* 공식몰 상품 주소 */
  CFG.mallProduct = function (no) {
    return no ? (CFG.MALL + CFG.PRODUCT_PATH + no) : CFG.MALL;
  };
  /* 이 사이트 안의 페이지 주소 */
  CFG.page = function (name) {
    return CFG.SITE + '/' + String(name || '').replace(/^\/+/, '');
  };

  window.CG_SITE = CFG;

  /* data-mall 속성이 붙은 링크를 공식몰 주소로 채운다
     예) <a data-mall>공식몰 바로가기</a>
         <a data-mall="18">이 상품 공식몰에서 보기</a>  */
  function apply() {
    var els = document.querySelectorAll('[data-mall]');
    for (var i = 0; i < els.length; i++) {
      var v = els[i].getAttribute('data-mall');
      els[i].setAttribute('href', v ? CFG.mallProduct(v) : CFG.MALL);
      if (!els[i].getAttribute('target')) {
        els[i].setAttribute('target', '_blank');
        els[i].setAttribute('rel', 'noopener');
      }
    }
    /* data-cs 가 붙은 곳에 상담번호를 채운다 */
    var cs = document.querySelectorAll('[data-cs]');
    for (var c = 0; c < cs.length; c++) {
      var mode = cs[c].getAttribute('data-cs');
      if (mode === 'tel') { cs[c].setAttribute('href', 'tel:' + CFG.CS_PHONE_RAW); }
      if (!cs[c].textContent.trim() || mode === 'fill')
        cs[c].textContent = CFG.CS_PHONE;
    }

    /* data-site 는 이 사이트 안 페이지 */
    var s = document.querySelectorAll('[data-site]');
    for (var j = 0; j < s.length; j++) {
      s[j].setAttribute('href', CFG.page(s[j].getAttribute('data-site')));
    }
  }


  /* OG·canonical 주소 자동 보정 — 도메인이 바뀌어도 따라갑니다 */
  function fixMeta() {
    var base = CFG.SITE_OVERRIDE || (location.origin + location.pathname.replace(/[^/]*$/, '')).replace(/\/+$/, '');
    var m = document.querySelectorAll('meta[property="og:url"],meta[property="og:image"],link[rel="canonical"]');
    for (var i = 0; i < m.length; i++) {
      var attr = m[i].tagName === 'LINK' ? 'href' : 'content';
      var v = m[i].getAttribute(attr) || '';
      var tail = v.replace(/^https?:\/\/[^/]+\/chewgumi\/?/, '');
      if (tail !== v) m[i].setAttribute(attr, base + '/' + tail);
    }
  }

  function run() { apply(); fixMeta(); }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', run);
  else run();
})();


/* ══════════════════════════════════════════════════════════════
   화면 잠금 — 서랍·장바구니 패널을 열 때 뒤 화면을 고정합니다 (2026-09-12)

   왜: 전에는 body 에 overflow:hidden 만 걸었습니다. 그러면 브라우저가
       스크롤 위치를 버려서, 메뉴를 열었다 닫으면 보던 자리를 잃고
       맨 위로 튀었습니다. 상품 목록 한참 아래에서 메뉴를 열면
       처음부터 다시 내려와야 했습니다.

   쓰는 법
     cgLockScroll(true)   열 때
     cgLockScroll(false)  닫을 때 — 보던 자리로 돌려놓습니다
   ══════════════════════════════════════════════════════════════ */
(function () {
  if (window.cgLockScroll) return;
  var y = 0, locked = false;
  window.cgLockScroll = function (on) {
    var b = document.body;
    if (on) {
      if (locked) return;
      y = window.scrollY || window.pageYOffset || 0;
      locked = true;
      b.style.position = 'fixed';
      b.style.top = (-y) + 'px';
      b.style.left = '0';
      b.style.right = '0';
      b.style.width = '100%';
      b.style.overflow = 'hidden';
    } else {
      if (!locked) { b.style.overflow = ''; return; }
      locked = false;
      b.style.position = '';
      b.style.top = '';
      b.style.left = '';
      b.style.right = '';
      b.style.width = '';
      b.style.overflow = '';
      /* 자리를 되돌리기 전에 배치를 다시 계산하게 합니다.
         안 그러면 문서 높이가 아직 화면 높이라 scrollTo 가 0 으로 잘립니다. */
      void b.offsetHeight;
      window.scrollTo(0, y);
    }
  };
})();
