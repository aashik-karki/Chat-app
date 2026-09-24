/* HelpDesk Chat service worker: Web Push notifications.
 *
 * Push payload (from chat-backend): { type, title, body, conversationId, messageId, url, tag }
 *  - one notification per conversation (same `tag` replaces the previous one)
 *  - clicking focuses an open app tab and routes it to the chat, or opens a new window
 */
const APP_ICON = '/icons/icon-192.png'
const BADGE = '/icons/badge-96.png'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { body: event.data ? event.data.text() : '' }
  }

  const title = payload.title || 'New message'
  const options = {
    body: payload.body || 'You have a new message.',
    icon: APP_ICON,
    badge: BADGE,
    tag: payload.tag || (payload.conversationId ? `conversation-${payload.conversationId}` : 'chat-message'),
    renotify: true, // same chat, new message → alert again (sound/vibration) instead of silently replacing
    timestamp: Date.now(),
    data: { url: payload.url || '/', conversationId: payload.conversationId || null },
    actions: [{ action: 'open', title: 'Open chat' }],
  }

  // Browsers require a visible notification for every push (userVisibleOnly), so always show one.
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const sameOrigin = windows.filter((client) => new URL(client.url).origin === self.location.origin)
      const target = sameOrigin.find((client) => client.focused) || sameOrigin[0]
      if (target) {
        await target.focus()
        // Let the React app route without a full page reload.
        target.postMessage({ type: 'navigate', url: new URL(url).pathname })
        return
      }
      await self.clients.openWindow(url)
    })(),
  )
})

/** The browser rotated or expired the subscription: create a new one and tell the server. */
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      const key = event.oldSubscription?.options?.applicationServerKey
      if (!key) return
      const subscription = await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
      // Same-origin fetches from the service worker carry the session cookie; get a CSRF token first.
      const tokenResponse = await fetch('/api/v1/auth/csrf-token', { credentials: 'include' })
      if (!tokenResponse.ok) return
      const { csrfToken } = await tokenResponse.json()
      await fetch('/api/v1/push/subscriptions', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify(subscription.toJSON()),
      })
    })().catch(() => undefined),
  )
})
