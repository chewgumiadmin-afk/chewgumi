/*! ChewGumi Web Push v1 · MedIT */
(function () {
  'use strict';
  var SB = 'https://psynvpuedzjvytsgdhgg.supabase.co';
  var KEY = 'sb_publishable_Tz7vgJXgYHQ3tyUfm87WTw_vV1Dxfuk';
  var FN = SB + '/functions/v1/push';

  function hd() {
    var h = { 'Content-Type': 'application/json', apikey: KEY };
    try {
      var s = JSON.parse(localStorage.getItem('cg_sb') || 'null');
      if (s && s.t) h.Authorization = 'Bearer ' + s.t;
    } catch (e) {}
    return h;
  }
  function call(p) {
    return fetch(FN, { method: 'POST', headers: hd(), body: JSON.stringify(p) })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); });
  }
  function b64ToU8(s) {
    var pad = '='.repeat((4 - s.length % 4) % 4);
    var b = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
    var raw = atob(b), out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  window.cgPushSupported = function () {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  };
  window.cgPushState = function () {
    if (!cgPushSupported()) return 'unsupported';
    return Notification.permission; // default / granted / denied
  };

  /* 알림 켜기 */
  window.cgPushOn = function () {
    if (!cgPushSupported())
      return Promise.reject(new Error('이 브라우저는 알림을 지원하지 않습니다.'));

    return Notification.requestPermission().then(function (perm) {
      if (perm !== 'granted') throw new Error('알림이 허용되지 않았습니다.');
      return navigator.serviceWorker.ready;
    }).then(function (reg) {
      return call({ action: 'key' }).then(function (res) {
        var k = res.d && res.d.key;
        if (!k) throw new Error('알림 설정이 준비되지 않았습니다.');
        return reg.pushManager.getSubscription().then(function (ex) {
          if (ex) return ex;
          return reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: b64ToU8(k)
          });
        });
      });
    }).then(function (sub) {
      return call({ action: 'subscribe', sub: sub.toJSON(), ua: navigator.userAgent });
    }).then(function (res) {
      if (!res.ok) throw new Error((res.d && res.d.error) || '등록에 실패했습니다.');
      try { localStorage.setItem('cg_push', '1'); } catch (e) {}
      return res.d;
    });
  };

  /* 알림 끄기 */
  window.cgPushOff = function () {
    try { localStorage.setItem('cg_push', '0'); } catch (e) {}
    if (!cgPushSupported()) return Promise.resolve();
    return navigator.serviceWorker.ready.then(function (reg) {
      return reg.pushManager.getSubscription();
    }).then(function (sub) {
      if (!sub) return;
      var ep = sub.endpoint;
      return sub.unsubscribe().then(function () {
        return call({ action: 'unsubscribe', endpoint: ep });
      });
    });
  };

  /* 이미 허용한 기기는 조용히 재등록 (구독이 만료될 수 있음) */
  document.addEventListener('DOMContentLoaded', function () {
    if (!cgPushSupported()) return;
    if (Notification.permission !== 'granted') return;
    var want = null;
    try { want = localStorage.getItem('cg_push'); } catch (e) {}
    if (want === '0') return;
    navigator.serviceWorker.ready.then(function (reg) {
      return reg.pushManager.getSubscription();
    }).then(function (sub) {
      if (!sub) return;
      call({ action: 'subscribe', sub: sub.toJSON(), ua: navigator.userAgent });
    }).catch(function () {});
  });
})();
