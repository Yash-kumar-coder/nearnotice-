/**
 * NearNotice Production-Safe Service Worker
 *
 * App-shell caching & offline fallback.
 * CRITICAL SECURITY: Never caches private user data, authenticated API responses,
 * or sensitive Supabase database/storage endpoints.
 */

const CACHE_NAME = 'nearnotice-app-shell-v2';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/manifest.json',
  '/favicon.svg',
  '/logo.png',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
];

// Install: Pre-cache core app shell assets safely
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        for (const asset of PRECACHE_ASSETS) {
          try {
            await cache.add(asset);
          } catch (err) {
            console.warn('[SW] Could not precache asset:', asset, err);
          }
        }
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: Clean up outdated caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              return caches.delete(name);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch: Secure request handling
self.addEventListener('fetch', (event) => {
  // Only intercept GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // 1. SECURITY BOUNDARY: Do NOT intercept or cache any Supabase traffic
  if (
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/rest/v1') ||
    url.pathname.startsWith('/auth/v1') ||
    url.pathname.startsWith('/storage/v1') ||
    url.pathname.startsWith('/realtime/v1')
  ) {
    return;
  }

  // 2. SECURITY BOUNDARY: Do NOT cache requests carrying auth or API key headers
  if (
    event.request.headers.has('authorization') ||
    event.request.headers.has('apikey')
  ) {
    return;
  }

  // 3. Skip chrome-extension and Vite HMR dev requests
  if (
    url.protocol === 'chrome-extension:' ||
    url.pathname.startsWith('/@') ||
    url.pathname.includes('__vite_ping') ||
    url.pathname.includes('hot-update')
  ) {
    return;
  }

  // 4. Navigation requests (HTML pages): Network-First with cached app shell fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // Offline fallback: serve cached index.html so React Router & offline notices render
          const cachedIndex = await caches.match('/index.html');
          if (cachedIndex) return cachedIndex;
          const cachedRoot = await caches.match('/');
          if (cachedRoot) return cachedRoot;
          return new Response('You are offline. Please reconnect to use NearNotice.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
          });
        })
    );
    return;
  }

  // 5. Static Assets (JS, CSS, Web Fonts, Public Images): Stale-While-Revalidate
  const isStaticAsset =
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/assets/') ||
      url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|webp|woff2?|ttf|eot)$/i));

  const isGoogleFont =
    url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

  if (isStaticAsset || isGoogleFont) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const networkFetch = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        });

        // Serve cached version immediately if available while revalidating in background
        if (cachedResponse) {
          networkFetch.catch(() => {});
          return cachedResponse;
        }

        return networkFetch;
      })
    );
    return;
  }
});

// Allow clients to trigger skipWaiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
