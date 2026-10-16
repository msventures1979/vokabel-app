// Wird vom Service Worker geladen: zeigt Erinnerungen an und öffnet beim Antippen die App.
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  const title = data.title || 'Training wartet! ⚽'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || 'Heute fehlt noch dein Vokabel-Training.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'vokabel-reminder',
      renotify: true,
      data: { url: data.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) if ('focus' in c) return c.focus()
      return self.clients.openWindow(url)
    }),
  )
})
