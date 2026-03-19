// EngiPlanner Service Worker — Offline-first PWA
const CACHE_NAME = 'engiplanner-v1';

// Resources to cache immediately on install
const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
];

// ── Install: precache core shell ─────────────────────────────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_URLS);
        }).then(() => self.skipWaiting())
    );
});

// ── Activate: clean up old caches ────────────────────────────────────────────
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

// ── Fetch: network-first, cache fallback ─────────────────────────────────────
self.addEventListener('fetch', (event) => {
    // Skip non-GET and cross-origin requests
    if (event.request.method !== 'GET') return;
    if (!event.request.url.startsWith(self.location.origin)) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Cache successful responses
                if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                }
                return response;
            })
            .catch(() => {
                // Offline fallback: serve from cache
                return caches.match(event.request).then((cached) => {
                    if (cached) return cached;
                    // For navigation requests, serve the app shell
                    if (event.request.mode === 'navigate') {
                        return caches.match('/index.html');
                    }
                });
            })
    );
});
// ── Push: handle browser push notifications ──────────────────────────────────
self.addEventListener('push', (event) => {
    let data = { title: 'EngiPlanner', body: 'New notification from your workspace!', icon: '/icon-192.png' };
    try {
        if (event.data) {
            const pushData = event.data.json();
            data = { ...data, ...pushData };
        }
    } catch (e) {
        data.body = event.data.text() || data.body;
    }

    const options = {
        body: data.body,
        icon: data.icon || '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || self.location.origin,
            timestamp: Date.now()
        },
        actions: [
            { action: 'open', title: 'View Now' },
            { action: 'close', title: 'Later' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// ── Notification Click: handle user interaction ────────────────────────────────
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'close') return;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            if (clientList.length > 0) {
                let client = clientList[0];
                for (let i = 0; i < clientList.length; i++) {
                    if (clientList[i].focused) {
                        client = clientList[i];
                        break;
                    }
                }
                return client.focus();
            }
            return clients.openWindow(event.notification.data.url || '/');
        })
    );
});
