import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'

self.skipWaiting()
clientsClaim()

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// ── Push notifications ─────────────────────────────────────
self.addEventListener('push', event => {
  let data = {}
  try { data = event.data?.json() || {} } catch(e) {}

  const title   = data.title || 'KanbanCRM'
  const options = {
    body:    data.body    || 'Você tem uma nova atualização.',
    icon:    '/teste/pwa-192.png',
    badge:   '/teste/pwa-192.png',
    tag:     data.tag     || 'kanban-notification',
    data:    { url: data.url || '/teste/#/app' },
    vibrate: [200, 100, 200],
    renotify: true,
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url || '/teste/#/app'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes('/teste') && 'focus' in c)
      if (existing) return existing.focus()
      return clients.openWindow(url)
    })
  )
})
