import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { realtime } from '../../lib/socket'
import { useAuthStore } from '../auth/auth.store'
import { useChatStore } from '../chat/chat.store'
import { isMySide } from '../chat/chat.types'

/**
 * Background TAB (open but hidden): the socket is still connected, so the server
 * delivers the message over the socket and does NOT send a Web Push. We show a
 * local notification ourselves so the person still gets alerted.
 * (App fully closed → the server's Web Push + sw.js handle it.)
 *
 * Also routes clicks on notifications (sw.js posts { type: 'navigate', url }).
 */
export const BackgroundNotifier = () => {
  const navigate = useNavigate()

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const onMessage = (event: MessageEvent<{ type?: string; url?: string }>) => {
      if (event.data?.type === 'navigate' && event.data.url) navigate(event.data.url)
    }
    navigator.serviceWorker.addEventListener('message', onMessage)
    return () => navigator.serviceWorker.removeEventListener('message', onMessage)
  }, [navigate])

  useEffect(
    () =>
      realtime.on('message:new', (message) => {
        if (document.visibilityState !== 'hidden') return
        if (!('Notification' in window) || Notification.permission !== 'granted' || !('serviceWorker' in navigator)) return
        const me = useAuthStore.getState().user
        const conversation = useChatStore.getState().conversations[message.conversationId]
        if (!me || !conversation || isMySide(message, conversation, me)) return

        const title =
          me.role === 'user'
            ? (useChatStore.getState().agentNames[conversation.id] ?? conversation.assignedAgent?.name ?? 'Support team')
            : conversation.customer.name
        const url = me.role === 'user' ? '/chat' : `/inbox/${conversation.id}`
        void navigator.serviceWorker.ready.then((registration) =>
          registration.showNotification(title, {
            body: message.text.length > 120 ? `${message.text.slice(0, 117)}…` : message.text,
            icon: '/icons/icon-192.png',
            badge: '/icons/badge-96.png',
            tag: `conversation-${conversation.id}`,
            data: { url, conversationId: conversation.id },
          }),
        )
      }),
    [],
  )

  return null
}
