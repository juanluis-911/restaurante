// ── Versión del caché ─────────────────────────────────────────────
// Incrementar este número en cada deploy para forzar limpieza en TODOS los
// dispositivos. Esto borra cachés viejos que puedan tener CSS o JS desactualizado.
const CACHE_VERSION = 'turieats-v3';
const STATIC_CACHE  = `${CACHE_VERSION}-static`;

// Solo pre-cacheamos assets que NO cambian entre builds (imágenes, íconos).
// Los archivos /_next/static/ (CSS, JS) los maneja el browser HTTP cache:
// Vercel los sirve con Cache-Control: immutable, lo cual es más eficiente y
// nunca genera CSS desactualizado en la PWA.
const PRECACHE_ASSETS = [
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/turieats.png',
];

// ── Install ───────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: borrar TODOS los cachés viejos ──────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo interceptar peticiones GET del mismo origen
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // ❌ NO interceptar rutas de API, auth ni archivos de Next.js.
  // /_next/static/ tiene CSS y JS con hashes de contenido; Vercel los sirve
  // con Cache-Control: immutable — el browser HTTP cache los maneja mejor que el SW.
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/_next/')
  ) return;

  // ✅ Imágenes e íconos: cache-first (cambian poco, mejora rendimiento offline)
  if (url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|woff2?)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // ✅ Páginas HTML: siempre de la red.
  // No cacheamos HTML para evitar que el usuario vea páginas viejas.
  event.respondWith(fetch(request).catch(() => Response.error()));
});

// ── Push Notifications ────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try { payload = event.data.json() } catch { return }

  const { title, body, url, tag } = payload;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon:     '/icons/icon-192x192.png',
      badge:    '/icons/icon-72x72.png',
      tag:      tag ?? 'turieats',
      renotify: true,
      data:     { url: url ?? '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === targetUrl && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
