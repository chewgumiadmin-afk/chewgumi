/*! ChewGumi QA Mode Switch · MedIT
 *  ?qa=1 화면에 역할 전환 · 관리자 바로가기 · DB 확인을 붙입니다.
 */
(function () {
  'use strict';
  if (!/[?&]qa=1/.test(location.search)) return;
  if (window.__cgMode) return;
  window.__cgMode = 1;

  var SB = 'https://psynvpuedzjvytsgdhgg.supabase.co';
  var KEY = 'sb_publishable_Tz7vgJXgYHQ3tyUfm87WTw_vV1Dxfuk';

  var ROLE = { dev: '개발자', design: '디자이너', ceo: '대표', guest: '고객' };
  var role = 'guest';
  try { role = localStorage.getItem('cg_qa_role') || 'guest'; } catch (e) {}

  var ADMIN = [
    ['console.html', '관리자 홈'], ['orders.html', '주문 · 배송'],
    ['stock.html', '재고 · 품절'], ['posts.html', '게시물 관리'],
    ['members.html', '회원 조회'], ['subs-admin.html', '정기구독'],
    ['campaign.html', '마케팅 발송'], ['reports-admin.html', '고객 리포트'],
    ['cafe24.html', '카페24 API'], ['dev.html', 'AI 개발 도우미'],
    ['github.html', '개발 현황'], ['help.html', '도움말 창구']
  ];

  var css = document.createElement('style');
  css.textContent = [
    '.cgm-fab{position:fixed;right:16px;top:calc(74px + env(safe-area-inset-top));',
    '  z-index:2147482900;height:34px;padding:0 13px;border:0;border-radius:999px;',
    '  background:#17171c;color:#fff;font-size:11.5px;font-weight:700;cursor:pointer;',
    '  box-shadow:0 6px 18px rgba(0,0,0,.28);font-family:-apple-system,BlinkMacSystemFont,',
    '  "Apple SD Gothic Neo",sans-serif;display:flex;align-items:center;gap:5px}',
    '.cgm-fab i{width:6px;height:6px;border-radius:50%;background:#FFE923;display:block}',
    '.cgm-bg{position:fixed;inset:0;z-index:2147482950;background:rgba(15,10,14,.5);',
    '  display:flex;align-items:flex-start;justify-content:center;padding:60px 16px 20px;',
    '  overflow-y:auto;-webkit-backdrop-filter:blur(5px);backdrop-filter:blur(5px)}',
    '.cgm-box{width:100%;max-width:440px;background:#fff;border-radius:20px;padding:20px;',
    '  color:#17171c;box-shadow:0 20px 50px rgba(0,0,0,.3);',
    '  font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif}',
    '.cgm-box h3{font-size:15px;font-weight:800;margin:0 0 3px;letter-spacing:-.02em}',
    '.cgm-box .sub{font-size:11.5px;color:#8a8a92;margin-bottom:14px}',
    '.cgm-lb{font-size:10px;letter-spacing:1.4px;color:#9a9aa2;font-weight:700;',
    '  text-transform:uppercase;margin:15px 0 8px}',
    '.cgm-r{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}',
    '.cgm-r button{height:42px;border:1px solid #e6e3e8;border-radius:11px;background:#fff;',
    '  font-family:inherit;font-size:12px;font-weight:600;color:#444;cursor:pointer}',
    '.cgm-r button.on{background:#17171c;color:#fff;border-color:transparent}',
    '.cgm-g{display:grid;grid-template-columns:repeat(2,1fr);gap:6px}',
    '.cgm-g a{display:flex;align-items:center;min-height:40px;padding:0 12px;',
    '  border:1px solid #e6e3e8;border-radius:11px;font-size:12.5px;font-weight:600;',
    '  color:#17171c;text-decoration:none;background:#fff}',
    '.cgm-g a:hover{background:#faf8fb}',
    '.cgm-acc{padding:12px 14px;border-radius:12px;background:#FFF7FA;',
    '  border:1px solid rgba(216,37,88,.16);font-size:12px;line-height:1.85}',
    '.cgm-acc b{color:#D82558}',
    '.cgm-acc code{font-family:ui-monospace,Menlo,monospace;font-size:11.5px;',
    '  background:rgba(0,0,0,.05);padding:1px 5px;border-radius:4px}',
    '.cgm-cp{margin-left:5px;height:20px;padding:0 7px;border:0;border-radius:5px;',
    '  background:rgba(216,37,88,.12);color:#D82558;font-family:inherit;font-size:10px;',
    '  font-weight:700;cursor:pointer;vertical-align:1px}',
    '.cgm-act{display:flex;gap:7px;margin-top:14px}',
    '.cgm-act button{flex:1;height:46px;border:0;border-radius:12px;cursor:pointer;',
    '  font-family:inherit;font-size:13.5px;font-weight:700}',
    '.cgm-x{background:#f2eff3;color:#555}',
    '.cgm-go{background:#D82558;color:#fff}',
    '.cgm-db{margin-top:9px;padding:11px 13px;border-radius:11px;background:#f7f5f8;',
    '  font-size:11.5px;line-height:1.8;max-height:170px;overflow-y:auto;',
    '  font-family:ui-monospace,Menlo,monospace;white-space:pre-wrap;word-break:break-all}'
  ].join('');
  document.head.appendChild(css);

  function qaLink(p) {
    return p + (p.indexOf('?') > -1 ? '&' : '?') + 'qa=1';
  }

  function loadDB(el) {
    el.textContent = '불러오는 중…';
    var q = [
      ['products?select=id,name,price_sale,stock&active=eq.true&limit=5', '상품'],
      ['orders?select=order_no,buyer_name,pay_amount,status,is_test&order=created_at.desc&limit=5', '주문'],
      ['profiles?select=email,nickname,is_test&limit=5', '회원'],
      ['posts?select=board,title,is_test&order=created_at.desc&limit=5', '게시글']
    ];
    Promise.all(q.map(function (x) {
      return fetch(SB + '/rest/v1/' + x[0],
        { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } })
        .then(function (r) { return r.ok ? r.json() : []; })
        .then(function (d) { return x[1] + ' (' + d.length + ')\n' +
          d.map(function (o) { return '  ' + JSON.stringify(o); }).join('\n'); })
        .catch(function () { return x[1] + ' — 불러오지 못함'; });
    })).then(function (out) { el.textContent = out.join('\n\n'); });
  }

  function open_() {
    var bg = document.createElement('div');
    bg.className = 'cgm-bg';
    bg.innerHTML =
      '<div class="cgm-box">' +
        '<h3>점검 모드</h3>' +
        '<div class="sub">' + location.pathname.split('/').pop() + ' · ' +
          window.innerWidth + 'px</div>' +

        '<div class="cgm-lb">내 역할</div>' +
        '<div class="cgm-r">' +
          Object.keys(ROLE).map(function (k) {
            return '<button data-r="' + k + '"' +
              (role === k ? ' class="on"' : '') + '>' + ROLE[k] + '</button>';
          }).join('') +
        '</div>' +

        '<div class="cgm-lb">테스트 계정</div>' +
        '<div class="cgm-acc">' +
          '<b>QA 관리자</b> <code id="qaEm">qa@chewgumi.com</code>' +
            '<button class="cgm-cp" data-v="qa@chewgumi.com">복사</button><br>' +
          '<b>비밀번호</b> <code>QAtest!2026</code>' +
            '<button class="cgm-cp" data-v="QAtest!2026">복사</button><br>' +
          '<span style="color:#8a8a92">점검용 계정입니다. 오픈 전 삭제합니다.</span>' +
          '<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(0,0,0,.07)">' +
            '<b>받는 메일</b> <code>chewgumiadmin@gmail.com</code>' +
              '<button class="cgm-cp" data-v="chewgumiadmin@gmail.com">복사</button><br>' +
            '<b>받는 번호</b> <code>010-8497-9634</code>' +
              '<button class="cgm-cp" data-v="010-8497-9634">복사</button>' +
          '</div>' +
          '<button class="cgm-mk" style="width:100%;height:36px;margin-top:9px;border:0;' +
            'border-radius:9px;background:#17171c;color:#fff;font-family:inherit;' +
            'font-size:12px;font-weight:700;cursor:pointer">QA 계정 만들기 · 초기화</button>' +
          '<div class="cgm-mkm" style="margin-top:6px;font-size:11px;min-height:14px"></div>' +
        '</div>' +

        '<div class="cgm-lb">관리자 화면</div>' +
        '<div class="cgm-g">' +
          ADMIN.map(function (a) {
            return '<a href="' + qaLink(a[0]) + '">' + a[1] + '</a>';
          }).join('') +
        '</div>' +

        '<div class="cgm-lb">지금 데이터베이스</div>' +
        '<button class="cgm-dbbtn" style="width:100%;height:40px;border:1px solid #e6e3e8;' +
          'border-radius:11px;background:#fff;font-family:inherit;font-size:12.5px;' +
          'font-weight:600;cursor:pointer">값 불러오기</button>' +
        '<div class="cgm-db" style="display:none"></div>' +

        '<div class="cgm-act">' +
          '<button class="cgm-x">닫기</button>' +
          '<button class="cgm-go">고객 화면으로</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(bg);

    bg.onclick = function (e) { if (e.target === bg) bg.remove(); };
    bg.querySelector('.cgm-x').onclick = function () { bg.remove(); };
    bg.querySelector('.cgm-go').onclick = function () {
      location.href = qaLink('index.html');
    };
    bg.querySelectorAll('.cgm-r button').forEach(function (b) {
      b.onclick = function () {
        role = b.dataset.r;
        try { localStorage.setItem('cg_qa_role', role); } catch (e) {}
        bg.querySelectorAll('.cgm-r button').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        paint();
      };
    });
    bg.querySelectorAll('.cgm-cp').forEach(function (b) {
      b.onclick = function () {
        navigator.clipboard.writeText(b.dataset.v).then(function () {
          var t = b.textContent; b.textContent = '됨';
          setTimeout(function () { b.textContent = t; }, 1200);
        });
      };
    });
    var mk = bg.querySelector('.cgm-mk');
    var mkm = bg.querySelector('.cgm-mkm');
    mk.onclick = function () {
      mk.disabled = true; mk.textContent = '만드는 중…';
      fetch(SB + '/functions/v1/qa-account', {
        method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setup' })
      }).then(function (r) { return r.json(); }).then(function (d) {
        mk.disabled = false; mk.textContent = 'QA 계정 만들기 · 초기화';
        if (d.ok) {
          mkm.style.color = '#1a6e44';
          mkm.textContent = d.created ? '만들었습니다. 바로 쓰실 수 있습니다.'
            : '비밀번호를 다시 맞췄습니다.';
        } else {
          mkm.style.color = '#a82042';
          mkm.textContent = d.error || '만들지 못했습니다';
        }
      }).catch(function () {
        mk.disabled = false; mk.textContent = 'QA 계정 만들기 · 초기화';
        mkm.style.color = '#a82042'; mkm.textContent = '연결하지 못했습니다';
      });
    };

    var dbBtn = bg.querySelector('.cgm-dbbtn');
    var dbBox = bg.querySelector('.cgm-db');
    dbBtn.onclick = function () {
      dbBox.style.display = '';
      loadDB(dbBox);
    };
  }

  var fab;
  function paint() {
    if (fab) fab.innerHTML = '<i></i>' + ROLE[role] + ' 모드';
  }
  function start() {
    if (document.querySelector('.cgm-fab')) return;
    fab = document.createElement('button');
    fab.className = 'cgm-fab';
    fab.type = 'button';
    fab.onclick = open_;
    document.body.appendChild(fab);
    paint();
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', start);
  else start();
  setInterval(function () {
    if (!document.querySelector('.cgm-fab')) start();
  }, 1500);
})();
