/*! ChewGumi Push Client v1 · MedIT
 *  적용: <script src="assets/push.js" defer></script>
 *  버튼:  <button onclick="cgPushToggle()">알림 받기</button>
 *  상태:  window.cgPushState() → 'on' | 'off' | 'denied' | 'unsupported'
 */
(function () {
  'use strict';

  var SB = 'https://psynvpuedzjvytsgdhgg.supabase.co';
  var KEY = 'sb_publishable_Tz7vgJXgYHQ3tyUfm87WTw_vV1Dxfuk';
  var FN = SB + '/functions/v1/push';
  var reg = null, pubKey = '';

  function supported() {
    return ('serviceWorker' in navigator) && ('PushManager' in window) && ('Notification' in window);
  }

  function b64ToU8(b64) {
    var pad = '='.repeat((4 - b64.length % 4) % 4);
    var s = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/');
    var raw = atob(s), arr = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
  }

  function hd() {
    var h = { apikey: KEY, 'Content-Type': 'application/json' };
    try {
      var s = JSON.parse(localStorage.getItem('cg_sb') || 'null');
      if (s && s.t) h.Authorization = 'Bearer ' + s.t;
    } catch (e) {}
    return h;
  }
  function call(p) {
    return fetch(FN, { method: 'POST', headers: hd(), body: JSON.stringify(p) })
      .then(function (r) { return r.json(); });
  }

  window.cgPushState = function () {
    if (!supported()) return 'unsupported';
    if (Notification.permission === 'denied') return 'denied';
    return window._cgPushOn ? 'on' : 'off';
  };

  function base() {
    return location.pathname.replace(/[^/]*$/, '');
  }

  function ensureSW() {
    if (reg) return Promise.resolve(reg);
    return navigator.serviceWorker.register(base() + 'sw.js', { scope: base() })
      .then(function (r) { reg = r; return navigator.serviceWorker.ready; })
      .then(function (r) { reg = r; return r; });
  }

  function getKey() {
    if (pubKey) return Promise.resolve(pubKey);
    return call({ action: 'key' }).then(function (d) {
      if (!d.ok || !d.key) throw new Error('알림 설정이 준비되지 않았습니다.');
      pubKey = d.key; return pubKey;
    });
  }

  /* 켜기 */
  window.cgPushOn = function () {
    if (!supported())
      return Promise.reject(new Error('이 브라우저는 알림을 지원하지 않습니다.'));
    return Notification.requestPermission().then(function (p) {
      if (p !== 'granted') throw new Error('알림이 차단되어 있습니다. 브라우저 설정에서 허용해 주세요.');
      return getKey();
    }).then(function (k) {
      return ensureSW().then(function (r) {
        return r.pushManager.getSubscription().then(function (s) {
          return s || r.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: b64ToU8(k)
          });
        });
      });
    }).then(function (sub) {
      var em = '';
      try { em = (JSON.parse(localStorage.getItem('cg_sb') || '{}')).em || ''; }
      catch (e) {}
      var u = navigator.userAgent;
      var label = /iPhone/.test(u) ? '아이폰'
        : /iPad/.test(u) ? '아이패드'
        : /Android/.test(u) ? '안드로이드'
        : /Mac/.test(u) ? '맥'
        : /Windows/.test(u) ? '윈도우' : '기타';
      return call({ action: 'subscribe', sub: sub.toJSON(),
        ua: u.slice(0, 160), email: em, label: label });
    }).then(function (d) {
      if (d.error) throw new Error(d.error);
      window._cgPushOn = true;
      try { localStorage.setItem('cg_push', '1'); } catch (e) {}
      return d;
    });
  };

  /* 끄기 */
  window.cgPushOff = function () {
    if (!supported()) return Promise.resolve();
    return ensureSW().then(function (r) { return r.pushManager.getSubscription(); })
      .then(function (s) {
        if (!s) return null;
        var ep = s.endpoint;
        return s.unsubscribe().then(function () {
          return call({ action: 'unsubscribe', endpoint: ep });
        });
      }).then(function () {
        window._cgPushOn = false;
        try { localStorage.setItem('cg_push', '0'); } catch (e) {}
      });
  };

  window.cgPushToggle = function () {
    return window._cgPushOn ? window.cgPushOff() : window.cgPushOn();
  };

  /* 현재 상태 확인 */
  function check() {
    if (!supported()) return;
    if (Notification.permission !== 'granted') { window._cgPushOn = false; return; }
    navigator.serviceWorker.getRegistration(base()).then(function (r) {
      if (!r) return;
      reg = r;
      return r.pushManager.getSubscription().then(function (s) {
        window._cgPushOn = !!s;
        document.dispatchEvent(new CustomEvent('cg-push-state', { detail: !!s }));
      });
    }).catch(function () {});
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', check);
  else check();
})();
