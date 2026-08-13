/*! ChewGumi Service Worker v1 · MedIT */
const VER = 'cg-v1';
const SHELL = [
  './',
  './index.html',
  './assets/glass.css',
  './assets/lite.js',
  './assets/icon-192.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VER)
      .then((c) => c.addAll(SHELL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VER).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  /* API·인증 요청은 캐시하지 않는다 */
  if (url.hostname.includes('supabase.co') ||
      url.hostname.includes('api.anthropic.com') ||
      url.hostname.includes('cafe24api.com')) return;

  /* HTML은 네트워크 우선 — 항상 최신을 본다 */
  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VER).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  /* 이미지·CSS·JS는 캐시 우선 */
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) {
        fetch(req).then((res) => {
          if (res && res.status === 200)
            caches.open(VER).then((c) => c.put(req, res)).catch(() => {});
        }).catch(() => {});
        return hit;
      }
      return fetch(req).then((res) => {
        if (res && res.status === 200 && url.origin === location.origin) {
          const copy = res.clone();
          caches.open(VER).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => new Response('', { status: 504 }));
    })
  );
});

/* 푸시 알림 (키 등록 시 작동) */
self.addEventListener('push', (e) => {
  let d = { title: 'ChewGumi', body: '새 알림이 있습니다.' };
  try { if (e.data) d = Object.assign(d, e.data.json()); } catch (x) {}
  e.waitUntil(self.registration.showNotification(d.title, {
    body: d.body,
    icon: './assets/icon-192.png',
    badge: './assets/icon-192.png',
    vibrate: [80, 40, 80],
    data: { url: d.url || './orders.html' }
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || './orders.html';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ws) => {
      for (const w of ws) if ('focus' in w) return w.focus();
      return clients.openWindow(target);
    })
  );
});
