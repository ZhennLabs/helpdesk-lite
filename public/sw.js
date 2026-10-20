/**
 * Service Worker Helpdesk RSAM
 * Menangani Web Push Notification di latar belakang sistem operasi (Windows & Android)
 * Berjalan meskipun tab browser atau halaman web sedang ditutup
 */

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

/**
 * Menerima payload push dari Google/Mozilla/Microsoft Push Server
 */
self.addEventListener('push', (event) => {
    if (!event.data) {
        return;
    }

    let payload = {};
    try {
        payload = event.data.json();
    } catch (e) {
        payload = {
            title: 'Helpdesk RSAM',
            body: event.data.text(),
        };
    }

    const title = payload.title || 'Helpdesk RSAM';
    const options = {
        body: payload.body || 'Ada pemberitahuan baru di sistem.',
        icon: payload.icon || '/assets/logo.png',
        badge: payload.badge || '/assets/logo.png',
        tag: payload.tag || 'rsam-push-' + Date.now(),
        data: payload.data || { url: payload.url || '/' },
        vibrate: [250, 100, 250],
        requireInteraction: true,
        actions: [
            {
                action: 'open',
                title: 'Buka Halaman',
            },
        ],
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

/**
 * Menangani klik pada notifikasi native OS
 */
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const targetUrl = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Jika ada tab yang sudah terbuka, fokuskan tab tersebut dan arahkan URL
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if ('focus' in client) {
                    client.navigate(targetUrl);
                    return client.focus();
                }
            }

            // Jika tidak ada tab yang terbuka, buka jendela/tab baru
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
