/*! ChewGumi QA Reporter · MedIT
 *  주소 뒤에 ?qa=1 을 붙이면 화면 우측 하단에 신고 버튼이 뜹니다.
 *  누르면 바로 접수되고, 개발자가 즉시 확인합니다.
 */
(function () {
  'use strict';
  if (!/[?&]qa=1/.test(location.search)) return;
  if (window.__cgQA) return;
  window.__cgQA = 1;

  var SB = 'https://psynvpuedzjvytsgdhgg.supabase.co';
  var KEY = 'sb_publishable_Tz7vgJXgYHQ3tyUfm87WTw_vV1Dxfuk';

  var KINDS = [
    ['겹침', '화면이 겹쳐 보임'],
    ['좌우 밀림', '좌우로 밀리는 스크롤'],
    ['이미지', '이미지가 잘리거나 안 나옴'],
    ['글씨 작음', '글씨가 너무 작음'],
    ['버튼 안됨', '버튼이 눌리지 않음'],
    ['팝업', '팝업이 안 닫히거나 두 번 뜸'],
    ['뒤로가기', '뒤로가기가 이상함'],
    ['영문 전환', '영문으로 안 바뀜'],
    ['정렬', '요소가 어긋나 보임'],
    ['기타', '']
  ];

  var css = document.createElement('style');
  css.textContent = [
    '.qa-fab{position:fixed;right:16px;bottom:calc(150px + env(safe-area-inset-bottom));',
    '  z-index:99998;width:54px;height:54px;border-radius:50%;border:0;cursor:pointer;',
    '  background:#17171c;color:#fff;font-size:11px;font-weight:700;letter-spacing:.5px;',
    '  box-shadow:0 8px 22px rgba(0,0,0,.3);font-family:inherit}',
    '.qa-fab.ok{background:#2AA060}',
    '.qa-bg{position:fixed;inset:0;z-index:99999;background:rgba(15,10,14,.5);',
    '  display:flex;align-items:flex-end;justify-content:center;',
    '  -webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}',
    '.qa-box{width:100%;max-width:440px;background:#fff;border-radius:22px 22px 0 0;',
    '  padding:22px 20px calc(22px + env(safe-area-inset-bottom));',
    '  max-height:82vh;overflow-y:auto;',
    '  font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif;',
    '  color:#17171c;box-shadow:0 -8px 30px rgba(0,0,0,.2)}',
    '.qa-box h3{font-size:16px;font-weight:800;margin:0 0 3px;letter-spacing:-.02em}',
    '.qa-box .pg{font-size:11.5px;color:#8a8a92;margin-bottom:15px}',
    '.qa-k{display:grid;grid-template-columns:repeat(2,1fr);gap:7px}',
    '.qa-k button{height:44px;border:1px solid #e6e3e8;border-radius:11px;background:#fff;',
    '  font-family:inherit;font-size:12.5px;font-weight:600;color:#333;cursor:pointer}',
    '.qa-k button.on{background:#D82558;color:#fff;border-color:transparent}',
    '.qa-box textarea{width:100%;min-height:74px;margin-top:11px;padding:11px 13px;',
    '  border:1px solid #e6e3e8;border-radius:11px;font-family:inherit;font-size:14px;',
    '  line-height:1.65;resize:vertical;box-sizing:border-box}',
    '.qa-act{display:flex;gap:8px;margin-top:13px}',
    '.qa-act button{flex:1;height:50px;border:0;border-radius:13px;cursor:pointer;',
    '  font-family:inherit;font-size:14.5px;font-weight:700}',
    '.qa-send{background:#D82558;color:#fff}',
    '.qa-cancel{background:#f2eff3;color:#555}',
    '.qa-done{background:#2AA060;color:#fff;width:100%;height:48px;border:0;border-radius:13px;',
    '  cursor:pointer;font-family:inherit;font-size:14px;font-weight:700;margin-top:9px}',
    '.qa-msg{margin-top:10px;font-size:12.5px;min-height:18px;font-weight:600}',
    '.qa-toast{position:fixed;left:50%;transform:translateX(-50%);bottom:110px;z-index:99999;',
    '  padding:13px 22px;border-radius:14px;background:rgba(23,23,28,.94);color:#fff;',
    '  font-size:13.5px;font-weight:600;font-family:inherit;box-shadow:0 8px 24px rgba(0,0,0,.28)}'
  ].join('');
  document.head.appendChild(css);

  var page = (location.pathname.split('/').pop() || 'index.html') + (location.hash || '');
  var picked = '';

  function toast(t, ok) {
    var d = document.createElement('div');
    d.className = 'qa-toast';
    if (ok) d.style.background = 'rgba(26,110,68,.95)';
    d.textContent = t;
    document.body.appendChild(d);
    setTimeout(function () { d.remove(); }, 2600);
  }

  function post(kind, note, status) {
    return fetch(SB + '/rest/v1/qa_reports', {
      method: 'POST',
      headers: {
        apikey: KEY, Authorization: 'Bearer ' + KEY,
        'Content-Type': 'application/json', Prefer: 'return=minimal'
      },
      body: JSON.stringify({
        page: page, kind: kind, note: note,
        device: navigator.userAgent.slice(0, 120),
        viewport: window.innerWidth + 'x' + window.innerHeight,
        status: status || 'open'
      })
    });
  }

  function openBox() {
    var bg = document.createElement('div');
    bg.className = 'qa-bg';
    bg.innerHTML =
      '<div class="qa-box">' +
        '<h3>무엇이 이상한가요</h3>' +
        '<div class="pg">' + page + ' · ' + window.innerWidth + 'px</div>' +
        '<div class="qa-k">' +
          KINDS.map(function (k, i) {
            return '<button data-i="' + i + '">' + k[0] + '</button>';
          }).join('') +
        '</div>' +
        '<textarea placeholder="더 적으실 내용이 있으면 여기에"></textarea>' +
        '<div class="qa-act">' +
          '<button class="qa-cancel">닫기</button>' +
          '<button class="qa-send">보내기</button>' +
        '</div>' +
        '<button class="qa-done">이 화면 이상 없음</button>' +
        '<div class="qa-msg"></div>' +
      '</div>';
    document.body.appendChild(bg);

    var msg = bg.querySelector('.qa-msg');
    bg.onclick = function (e) { if (e.target === bg) bg.remove(); };
    bg.querySelector('.qa-cancel').onclick = function () { bg.remove(); };

    bg.querySelectorAll('.qa-k button').forEach(function (b) {
      b.onclick = function () {
        bg.querySelectorAll('.qa-k button').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        picked = KINDS[+b.dataset.i][0];
      };
    });

    bg.querySelector('.qa-send').onclick = function () {
      var note = bg.querySelector('textarea').value.trim();
      if (!picked && !note) {
        msg.style.color = '#C0395C';
        msg.textContent = '항목을 고르거나 내용을 적어주세요';
        return;
      }
      msg.style.color = '#8a8a92';
      msg.textContent = '보내는 중…';
      post(picked || '기타', note, 'open').then(function (r) {
        if (!r.ok) throw new Error();
        bg.remove();
        toast('접수했습니다');
        var f = document.querySelector('.qa-fab');
        if (f) { f.textContent = '접수'; }
      }).catch(function () {
        msg.style.color = '#C0395C';
        msg.textContent = '보내지 못했습니다. 다시 시도해 주세요';
      });
    };

    bg.querySelector('.qa-done').onclick = function () {
      post('', '', 'ok').then(function () {
        bg.remove();
        toast('이상 없음으로 기록했습니다', true);
        var f = document.querySelector('.qa-fab');
        if (f) { f.classList.add('ok'); f.textContent = '완료'; }
      }).catch(function () {
        msg.style.color = '#C0395C';
        msg.textContent = '기록하지 못했습니다';
      });
    };
  }

  function start() {
    var b = document.createElement('button');
    b.className = 'qa-fab';
    b.type = 'button';
    b.textContent = '점검';
    b.setAttribute('aria-label', '이 화면 점검하기');
    b.onclick = openBox;
    document.body.appendChild(b);
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', start);
  else start();
})();
