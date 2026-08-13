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
    /* data-site 는 이 사이트 안 페이지 */
    var s = document.querySelectorAll('[data-site]');
    for (var j = 0; j < s.length; j++) {
      s[j].setAttribute('href', CFG.page(s[j].getAttribute('data-site')));
    }
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', apply);
  else apply();
})();
