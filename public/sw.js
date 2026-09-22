/* The push payload is expected to be JSON: { title, body, conversationId, icon }. */
self.addEventListener('push', (event) => {
  const payload = event.data ? event.data.json() : {}
  const title = payload.title || 'New message'
  const options = {
    body: payload.body || 'You have a new message.',
    icon: payload.icon || '/favicon.svg',
    badge: '/favicon.svg',
    tag: payload.conversationId || 'chat-message',
    renotify: false,
    data: { conversationId: payload.conversationId },
    actions: [{ action: 'open', title: 'Open conversation' }],
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const conversationId = event.notification.data?.conversationId
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
    const target = windows[0]
    if (target) return target.focus()
    return clients.openWindow(conversationId ? `/?conversation=${encodeURIComponent(conversationId)}` : '/')
  }))
})
