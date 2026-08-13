/*! ChewGumi Service Worker · MedIT
 *  웹 푸시 알림 수신 전용 (캐시 없음 — 사이트 갱신에 영향 주지 않도록)
 */
self.addEventListener('install', function (e) { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener('push', function (e) {
  var d = { title: '츄구미', body: '', url: '/', tag: 'chewgumi' };
  try { if (e.data) d = Object.assign(d, e.data.json()); }
  catch (err) { try { d.body = e.data.text(); } catch (e2) {} }

  e.waitUntil(
    self.registration.showNotification(d.title, {
      body: d.body,
      icon: 'assets/logo-rainbow.png',
      badge: 'assets/logo-rainbow.png',
      tag: d.tag,
      renotify: true,
      requireInteraction: false,
      data: { url: d.url },
      vibrate: [80, 40, 80]
    })
  );
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].url.indexOf(url) > -1 && 'focus' in list[i]) return list[i].focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
