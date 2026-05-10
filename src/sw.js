import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'
import { registerRoute } from 'workbox-routing'
import { StaleWhileRevalidate } from 'workbox-strategies'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { ExpirationPlugin } from 'workbox-expiration'

self.skipWaiting()
clientsClaim()

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// Cache Supabase REST API profile+company reads with stale-while-revalidate.
// First visit fetches from network. Return visits get instant cached response
// while the background fetch silently refreshes the cache.
registerRoute(
  ({ url }) => url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/rest/v1/profiles'),
  new StaleWhileRevalidate({
    cacheName: 'supabase-profile-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxAgeSeconds: 60 * 60 * 24, maxEntries: 10 }),
    ],
  })
)

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
