// FoodieHub — Service Worker
// Handles Web Push events and notification clicks for both Admin and Customer.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));

self.addEventListener('push', (event) => {
  // Defaults — overridden by whatever the backend sends in the payload
  let payload = {
    title: 'FoodieHub',
    body:  'You have a new notification',
    url:   '/',
    tag:   'foodiehub',
  };

  if (event.data) {
    try { payload = { ...payload, ...event.data.json() }; } catch (_) {}
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body:             payload.body,
      icon:             '/favicon.ico',
      badge:            '/favicon.ico',
      tag:              payload.tag,
      data:             { url: payload.url },
      requireInteraction: false,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      // If FoodieHub tab already open — focus it and navigate
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      // No tab open — open a new one
      return clients.openWindow(targetUrl);
    })
  );
});
