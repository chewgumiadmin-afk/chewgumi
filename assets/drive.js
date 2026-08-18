/*! ChewGumi Drive Assets · MedIT
 *  구글 드라이브에 올린 원본 이미지를 화면에서 바로 불러옵니다.
 *  파일을 옮기거나 줄이지 않아 원본 화질 그대로 보입니다.
 */
(function () {
  'use strict';
  if (window.cgDrive) return;

  /* 드라이브 이미지 주소 만들기
     sz 를 크게 주면 원본에 가까운 크기로 옵니다. */
  function img(fileId, width) {
    if (!fileId) return '';
    var w = width || 1600;
    return 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w' + w;
  }

  /* 영상 재생용 주소 */
  function video(fileId) {
    if (!fileId) return '';
    return 'https://drive.google.com/file/d/' + fileId + '/preview';
  }

  /* 화면 크기·화소밀도에 맞는 폭을 고른다 */
  function bestWidth(el) {
    var dpr = window.devicePixelRatio || 1;
    var w = (el && el.clientWidth) || window.innerWidth || 800;
    var need = Math.ceil(w * dpr);
    /* 드라이브가 잘 주는 크기로 올림 */
    var steps = [400, 800, 1200, 1600, 2000, 2400];
    for (var i = 0; i < steps.length; i++) {
      if (steps[i] >= need) return steps[i];
    }
    return 2400;
  }

  /* <img data-drive="파일ID"> 를 실제 주소로 채운다 */
  function paint(root) {
    var list = (root || document).querySelectorAll('img[data-drive]');
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      if (el.dataset.done) continue;
      var id = el.getAttribute('data-drive');
      if (!id) continue;
      el.dataset.done = '1';
      var w = bestWidth(el.parentElement || el);
      el.referrerPolicy = 'no-referrer';
      el.loading = el.loading || 'lazy';
      el.decoding = 'async';
      el.src = img(id, w);
      el.onerror = function () {
        /* 못 불러오면 한 단계 작은 크기로 다시 */
        if (this.dataset.retry) { this.style.display = 'none'; return; }
        this.dataset.retry = '1';
        this.src = img(this.getAttribute('data-drive'), 800);
      };
    }
  }

  /* DB 에서 목록을 받아 화면에 붙인다 */
  function load(opt) {
    var SB = 'https://psynvpuedzjvytsgdhgg.supabase.co';
    var KEY = 'sb_publishable_Tz7vgJXgYHQ3tyUfm87WTw_vV1Dxfuk';
    var q = '/rest/v1/drive_assets?select=*&active=eq.true&order=sort_order';
    if (opt && opt.line) q += '&line=eq.' + opt.line;
    if (opt && opt.purpose) q += '&purpose=eq.' + opt.purpose;
    return fetch(SB + q, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } })
      .then(function (r) { return r.ok ? r.json() : []; })
      .catch(function () { return []; });
  }

  window.cgDrive = {
    img: img,
    video: video,
    paint: paint,
    load: load,
    bestWidth: bestWidth
  };

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', function () { paint(); });
  else paint();

  /* 나중에 추가되는 이미지도 자동으로 */
  if (window.MutationObserver) {
    var t = null;
    new MutationObserver(function () {
      clearTimeout(t);
      t = setTimeout(function () { paint(); }, 200);
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
})();
