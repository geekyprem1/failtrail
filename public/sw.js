/* FailTrail service worker (v1).
 * - Static/runtime cache taaki app jaldi khule aur offline shell dikhe.
 * - Push nahi (Phase 2 backlog). Alarm foreground checker + Notification API se bajta hai.
 */
const CACHE = 'failtrail-v2';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // API hamesha fresh — SW isko kabhi cache/serve nahi karega.
  // (Yahi bug tha: delete/schedule ke baad SW purana cached list dikhata tha,
  //  background revalidate ke baad hi pull-refresh par naya data aata tha.)
  if (url.pathname.startsWith('/api/')) return;
  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(request).then((hit) => {
        const net = fetch(request)
          .then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          })
          .catch(() => hit);
        return hit || net;
      })
    )
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ('focus' in w) return w.focus();
      }
      return self.clients.openWindow('/');
    })
  );
});
