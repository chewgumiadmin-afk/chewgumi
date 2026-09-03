/*! ChewGumi Page Guard · MedIT
 *  화면마다 접근 권한을 확인합니다. 권한이 없으면 안내 후 되돌립니다.
 *  admins.role : owner / ceo / staff / design / dev / qa
 */
(function () {
  'use strict';
  if (window.__cgGuard) return;
  window.__cgGuard = 1;

  var SB = 'https://psynvpuedzjvytsgdhgg.supabase.co';
  var KEY = 'sb_publishable_Tz7vgJXgYHQ3tyUfm87WTw_vV1Dxfuk';
  var page = (location.pathname.split('/').pop() || 'index.html').split('?')[0];

  /* 고객 화면은 통과 */
  var OPEN = /^(index|product|cart|checkout|join|login|reset|mypage|wish|subscribe|tracking|about|faq|guide|terms|privacy|notice|review|qna|reports|help)\.html$/;
  if (OPEN.test(page) || page === '') return;

  function token(){
    try { return (JSON.parse(localStorage.getItem('cg_sb') || '{}')).t || ''; }
    catch (e) { return ''; }
  }

  function block(msg, sub, to){
    var d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;z-index:2147483600;display:flex;' +
      'align-items:center;justify-content:center;padding:24px;' +
      'background:radial-gradient(900px 500px at 50% 0%,rgba(236,94,134,.12),transparent 60%),' +
      'linear-gradient(180deg,#FFF7FA,#FDF3F5);' +
      'font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif';
    d.innerHTML =
      '<div style="max-width:400px;text-align:center;background:rgba(255,255,255,.72);' +
        'border:1px solid rgba(255,255,255,.85);border-radius:22px;padding:34px 28px;' +
        'backdrop-filter:blur(20px);box-shadow:0 14px 34px rgba(0,0,0,.08)">' +
        '<div style="font-size:11px;letter-spacing:2.4px;color:#D82558;font-weight:700;' +
          'margin-bottom:12px">ACCESS</div>' +
        '<div style="font-size:17px;font-weight:800;letter-spacing:-.02em;margin-bottom:8px">' +
          msg + '</div>' +
        '<div style="font-size:13px;color:#7a7a82;line-height:1.8;margin-bottom:22px">' +
          sub + '</div>' +
        '<a href="' + (to || 'login.html') + '" style="display:inline-flex;align-items:center;min-height:46px;' +
          'padding:0 24px;border-radius:999px;text-decoration:none;font-size:14px;' +
          'font-weight:700;color:#fff;background:linear-gradient(135deg,#E95073,#D82558)">' +
          '로그인하기</a>' +
        '<a href="index.html" style="display:block;margin-top:14px;font-size:12.5px;' +
          'color:#7a7a82;text-decoration:underline;text-underline-offset:3px">홈으로</a>' +
      '</div>';
    document.body.appendChild(d);
    document.body.style.overflow = 'hidden';
  }

  function check(){
    /* 토큰이 오래됐으면 먼저 연장 */
    var pre = (window.cgKeepAlive ? window.cgKeepAlive() : Promise.resolve(token()));
    pre.then(function(){ doCheck(); });
  }

  function doCheck(){
    var t = token();
    if (!t) {
      /* 돌아올 화면을 기억해 두고 로그인으로 */
      var back = (location.pathname.split('/').pop() || '') + location.search;
      block('로그인이 필요합니다', '이 화면은 운영자만 보실 수 있습니다.',
        'login.html?next=' + encodeURIComponent(page));
      return;
    }

    /* 저장된 권한이 있으면 먼저 쓴다 — 화면이 덜 깜빡임 */
    var cached = (window.cgRole ? window.cgRole() : '');
    if (cached && cached !== 'guest') {
      document.documentElement.setAttribute('data-role', cached);
      window.CG_ROLE = cached;
    }

    /* 내 권한과 화면 권한을 함께 조회 */
    Promise.all([
      /* 권한은 assets/role.js 가 한 번만 받아 나눠 줍니다.
         전에는 guard·adminbar·pagelist·화면이 각자 물어봐서
         한 화면에서 my_role 이 네 번씩 나갔습니다. */
      (window.cgMyRole ? cgMyRole()
        : fetch(SB + '/rest/v1/rpc/my_role', {
            method: 'POST',
            headers: { apikey: KEY, Authorization: 'Bearer ' + t,
              'Content-Type': 'application/json' },
            body: '{}'
          }).then(function (r) { return r.ok ? r.json() : 'guest'; })),
      fetch(SB + '/rest/v1/page_access?select=roles,label&page=eq.' + page,
        { headers: { apikey: KEY, Authorization: 'Bearer ' + t } })
        .then(function (r) { return r.ok ? r.json() : []; })
    ]).then(function (out) {
      var role = out[0] || 'guest';
      var rule = (out[1] || [])[0];
      window.CG_ROLE = role;

      if (role === 'guest') {
        block('권한이 없습니다', '운영자 계정으로 로그인해 주세요.');
        return;
      }
      if (!rule) return;   /* 규칙이 없으면 통과 */

      if ((rule.roles || []).indexOf(role) < 0) {
        block('접근 권한이 없습니다',
          (rule.label || '이 화면') + '은(는) ' +
          (rule.roles || []).map(function (r) {
            return { ceo:'대표', owner:'대표', dev:'개발자',
              design:'디자이너', qa:'점검', staff:'운영' }[r] || r;
          }).filter(function (v, i, a) { return a.indexOf(v) === i; }).join(' · ') +
          ' 권한이 필요합니다.');
        return;
      }

      /* 권한 표시 */
      document.documentElement.setAttribute('data-role', role);
    }).catch(function () { /* 조회 실패 시 막지 않음 */ });
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', check);
  else check();
})();
