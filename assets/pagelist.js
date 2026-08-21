/*! ChewGumi 화면 목록 · MedIT
 *  로그인한 사람의 권한에 맞는 화면만 보여줍니다.
 *  권한이 없는 화면은 흐리게 표시하고 누를 수 없게 합니다.
 */
(function () {
  'use strict';
  var SB = 'https://psynvpuedzjvytsgdhgg.supabase.co';
  var KEY = 'sb_publishable_Tz7vgJXgYHQ3tyUfm87WTw_vV1Dxfuk';

  function token() {
    try {
      var s = JSON.parse(localStorage.getItem('cg_sb') || 'null');
      if (!s || !s.t) return '';
      if (s.exp && Date.now() / 1000 > s.exp) return '';
      return s.t;
    } catch (e) { return ''; }
  }

  var ROLE_KR = {
    ceo: '대표', dev: '개발자', design: '디자이너',
    qa: '점검', staff: '운영', guest: '손님'
  };

  /* 내가 볼 수 있는 화면 목록 */
  function load() {
    var t = token();
    if (!t) return Promise.resolve(null);
    return fetch(SB + '/rest/v1/rpc/my_pages', {
      method: 'POST',
      headers: { apikey: KEY, Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' },
      body: '{}'
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  /* 내 역할 */
  function role() {
    var t = token();
    if (!t) return Promise.resolve('guest');
    return fetch(SB + '/rest/v1/rpc/my_role', {
      method: 'POST',
      headers: { apikey: KEY, Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' },
      body: '{}'
    })
      .then(function (r) { return r.ok ? r.json() : 'guest'; })
      .then(function (v) { return String(v || 'guest').replace(/"/g, ''); })
      .catch(function () { return 'guest'; });
  }

  /* 화면의 링크들을 걸러냅니다 */
  function apply(rows, myRole) {
    if (!rows) return;
    var map = {};
    rows.forEach(function (r) { map[r.page] = r; });

    document.querySelectorAll('a[href]').forEach(function (a) {
      var href = (a.getAttribute('href') || '').split('?')[0].split('/').pop();
      if (!href || !map[href]) return;
      var info = map[href];

      if (info.allowed) {
        a.classList.remove('cg-locked');
        a.removeAttribute('aria-disabled');
        return;
      }

      a.classList.add('cg-locked');
      a.setAttribute('aria-disabled', 'true');
      a.setAttribute('title', '권한이 없는 화면입니다');
      a.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var box = document.getElementById('cgLockMsg');
        if (!box) {
          box = document.createElement('div');
          box.id = 'cgLockMsg';
          box.className = 'cg-lock-msg';
          document.body.appendChild(box);
        }
        box.textContent = '「' + (info.label || href) + '」은(는) '
          + (ROLE_KR[myRole] || myRole) + ' 권한으로 여실 수 없습니다.';
        box.classList.add('on');
        clearTimeout(box._t);
        box._t = setTimeout(function () { box.classList.remove('on'); }, 2600);
      }, true);
    });

    /* 역할 표시 */
    var tag = document.getElementById('cgRole');
    if (tag) tag.textContent = ROLE_KR[myRole] || myRole;

    document.body.setAttribute('data-role', myRole);
  }

  function run() {
    Promise.all([load(), role()]).then(function (res) {
      apply(res[0], res[1]);
    });
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', run);
  else run();
  window.addEventListener('pageshow', run);

  window.cgRefreshPages = run;
})();
