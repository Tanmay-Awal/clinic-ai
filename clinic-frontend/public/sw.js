// public/sw.js
// Service worker for push notifications

self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();

    // Broadcast the message to all open tabs immediately for sound/real-time updates
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            clientList.forEach((client) => {
                if ('postMessage' in client) {
                    client.postMessage({
                        type: 'PUSH_RECEIVED',
                        payload: data
                    });
                }
            });
        })
    );

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: data.icon || '/favicon.ico',
            badge: data.badge || '/favicon.ico',
            data: data.data,
            tag: data.data?.action_id ? `action-${data.data.action_id}` : undefined,
            // Non-standard: custom sound (may work on some Android devices)
            sound: '/sounds/notification.mp3',
            // Ensure OS notification sound plays (even when Chrome is in background)
            silent: false,
            // Vibration for mobile devices
            vibrate: [200, 100, 200],
            // Keep notification visible until user dismisses it (desktop only; mobile ignores this).
            // Ensures action-related notifications aren't auto-dismissed and missed.
            requireInteraction: true,
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const url = event.notification.data?.url || '/actions';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // If a window is already open, focus it
            for (const client of clientList) {
                if ('focus' in client) {
                    client.focus();
                    const targetUrl = new URL(url, location.origin).href;
                    // Only navigate if we're not already on the page
                    if (client.url !== targetUrl) {
                        // Prefer postMessage so the app can do a soft client-side navigation
                        if ('postMessage' in client) {
                            client.postMessage({ type: 'NAVIGATE', url: targetUrl });
                        } else if ('navigate' in client) {
                            client.navigate(targetUrl);
                        }
                    }
                    return;
                }
            }
            // Otherwise open a new window
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});
