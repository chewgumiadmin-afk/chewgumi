/*! ChewGumi Structured Data v1 · MedIT
 *  AI 쇼핑 도우미와 검색엔진이 상품 정보를 읽을 수 있게 합니다.
 *  적용: 각 페이지 </body> 앞  <script src="assets/schema.js" defer></script>
 */
(function () {
  'use strict';

  var SB = 'https://psynvpuedzjvytsgdhgg.supabase.co';
  var KEY = 'sb_publishable_Tz7vgJXgYHQ3tyUfm87WTw_vV1Dxfuk';

  function base() {
    if (window.CG_SITE && CG_SITE.SITE) return CG_SITE.SITE;
    return (location.origin + location.pathname.replace(/[^/]*$/, '')).replace(/\/+$/, '');
  }
  function put(obj) {
    var s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(obj);
    document.head.appendChild(s);
  }
  var page = (location.pathname.split('/').pop() || 'index.html');

  /* ── 브랜드·조직 (모든 페이지) ── */
  put({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': base() + '/#org',
    name: 'ChewGumi',
    alternateName: '츄구미',
    url: 'https://chewgumi.com',
    logo: base() + '/assets/logo-rainbow.png',
    description: '물 없이 씹어 먹는 건강 간식. 여행용 비타민 구미와 무설탕 자일리톨 캔디를 만듭니다.',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '청파로47길 46, 205호',
      addressLocality: '용산구',
      addressRegion: '서울',
      postalCode: '04309',
      addressCountry: 'KR'
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+82-507-0444-2706',
      contactType: 'customer service',
      areaServed: 'KR',
      availableLanguage: ['Korean', 'English']
    },
    sameAs: [
      'https://chewgumi.com',
      'https://www.instagram.com/chewgumi_official/'
    ]
  });

  /* ── 사이트 (메인) ── */
  if (page === 'index.html' || page === '') {
    put({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': base() + '/#site',
      name: 'ChewGumi 츄구미',
      url: base() + '/',
      publisher: { '@id': base() + '/#org' },
      inLanguage: 'ko-KR'
    });

    /* 상품 목록 */
    fetch(SB + '/rest/v1/products?select=id,name,price_sale,price_origin,stock,line'
      + '&active=eq.true&order=sort_order&limit=30',
      { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) {
        if (!rows || !rows.length) return;
        put({
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: '츄구미 전체 상품',
          numberOfItems: rows.length,
          itemListElement: rows.map(function (p, i) {
            return {
              '@type': 'ListItem',
              position: i + 1,
              item: {
                '@type': 'Product',
                name: p.name,
                url: base() + '/product.html?no=' + p.id,
                brand: { '@type': 'Brand', name: 'ChewGumi' },
                offers: {
                  '@type': 'Offer',
                  price: p.price_sale,
                  priceCurrency: 'KRW',
                  availability: (p.stock > 0)
                    ? 'https://schema.org/InStock'
                    : 'https://schema.org/OutOfStock',
                  url: base() + '/product.html?no=' + p.id
                }
              }
            };
          })
        });
      }).catch(function () {});
  }

  /* ── 상품 상세 ── */
  if (page === 'product.html') {
    var no = new URLSearchParams(location.search).get('no');
    if (!no) return;

    Promise.all([
      fetch(SB + '/rest/v1/products?select=*&id=eq.' + no,
        { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } })
        .then(function (r) { return r.ok ? r.json() : []; }),
      fetch(SB + '/rest/v1/product_reviews?select=rating,body,author,written_at'
        + '&product_id=eq.' + no + '&visible=eq.true&order=written_at.desc&limit=5',
        { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, Prefer: 'count=exact' } })
        .then(function (r) {
          var total = 0;
          var cr = r.headers.get('content-range') || '';
          var m = cr.match(/\/(\d+)$/); if (m) total = +m[1];
          return r.ok ? r.json().then(function (d) { return { rows: d, total: total }; })
                      : { rows: [], total: 0 };
        })
    ]).then(function (res) {
      var p = (res[0] || [])[0];
      if (!p) return;
      var rv = res[1] || { rows: [], total: 0 };

      var obj = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: p.name,
        url: base() + '/product.html?no=' + p.id,
        sku: 'CG-' + p.id,
        brand: { '@type': 'Brand', name: 'ChewGumi' },
        manufacturer: { '@id': base() + '/#org' },
        countryOfOrigin: 'KR',
        category: (p.line === 'travel')
          ? '건강기능식품 > 비타민 구미'
          : '식품 > 무설탕 캔디',
        description: p.summary || p.desc || p.name,
        offers: {
          '@type': 'Offer',
          price: p.price_sale,
          priceCurrency: 'KRW',
          availability: (p.stock > 0)
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
          url: 'https://chewgumi.com',
          seller: { '@id': base() + '/#org' },
          shippingDetails: {
            '@type': 'OfferShippingDetails',
            shippingRate: {
              '@type': 'MonetaryAmount', value: 2500, currency: 'KRW'
            },
            shippingDestination: {
              '@type': 'DefinedRegion', addressCountry: 'KR'
            },
            deliveryTime: {
              '@type': 'ShippingDeliveryTime',
              handlingTime: { '@type': 'QuantitativeValue',
                minValue: 1, maxValue: 2, unitCode: 'DAY' },
              transitTime: { '@type': 'QuantitativeValue',
                minValue: 1, maxValue: 3, unitCode: 'DAY' }
            }
          },
          hasMerchantReturnPolicy: {
            '@type': 'MerchantReturnPolicy',
            applicableCountry: 'KR',
            returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
            merchantReturnDays: 7,
            returnMethod: 'https://schema.org/ReturnByMail',
            returnFees: 'https://schema.org/ReturnShippingFees'
          }
        }
      };

      if (p.price_origin > p.price_sale) {
        obj.offers.priceSpecification = {
          '@type': 'UnitPriceSpecification',
          price: p.price_sale,
          priceCurrency: 'KRW',
          referencePrice: p.price_origin
        };
      }

      if (rv.total > 0) {
        obj.aggregateRating = {
          '@type': 'AggregateRating',
          ratingValue: 5,
          reviewCount: rv.total,
          bestRating: 5, worstRating: 1
        };
        obj.review = rv.rows.slice(0, 3).map(function (r) {
          return {
            '@type': 'Review',
            reviewRating: { '@type': 'Rating',
              ratingValue: r.rating || 5, bestRating: 5 },
            author: { '@type': 'Person', name: r.author || '구매자' },
            datePublished: r.written_at,
            reviewBody: String(r.body || '').slice(0, 200)
          };
        });
      }
      put(obj);
    }).catch(function () {});
  }

  /* ── 자주묻는질문 ── */
  if (page === 'faq.html') {
    setTimeout(function () {
      var qs = document.querySelectorAll('.faq-q, .q');
      var list = [];
      for (var i = 0; i < qs.length && list.length < 12; i++) {
        var q = qs[i].querySelector('b, .qt, h3');
        var a = qs[i].querySelector('p, .at, .ans');
        if (!q || !a) continue;
        list.push({
          '@type': 'Question',
          name: q.textContent.trim().slice(0, 120),
          acceptedAnswer: {
            '@type': 'Answer',
            text: a.textContent.trim().slice(0, 400)
          }
        });
      }
      if (list.length) put({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: list
      });
    }, 700);
  }
})();
