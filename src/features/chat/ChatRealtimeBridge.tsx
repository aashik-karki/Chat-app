import { useEffect } from 'react'
import { realtime } from '../../lib/socket'
import { useConnectionStore } from '../../stores/connection.store'
import type { Message } from '../../types/api'
import { useAuthStore } from '../auth/auth.store'
import { presenceWatch, usePresenceStore } from '../presence/presence.store'
import { isMySide } from './chat.types'
import { useChatStore } from './chat.store'
import { clearOutbox, flushOutbox, forgetReadReceipts } from './services/messaging'
import { loadFirstPage } from './services/threads'

/**
 * Connects server events to the chat store, once for the whole app.
 * Also handles reconnects: resend queued messages, re-subscribe presence,
 * and — if Socket.IO could not replay what we missed — re-fetch open threads.
 */
export const ChatRealtimeBridge = () => {
  const status = useConnectionStore((state) => state.status)

  useEffect(() => {
    if (status !== 'connected') return
    void flushOutbox()
    presenceWatch.resync()
  }, [status])

  useEffect(() => {
    const store = useChatStore.getState
    const me = () => useAuthStore.getState().user

    const isMine = (conversationId: string) => (message: Message) => {
      const conversation = store().conversations[conversationId]
      const user = me()
      return Boolean(conversation && user && isMySide(message, conversation, user))
    }

    const unsubscribers = [
      realtime.on('message:new', (message) => {
        store().receive(message)
        const conversation = store().conversations[message.conversationId]
        if (conversation) store().patchConversation(message.conversationId, { lastMessagePreview: message.text, lastMessageAt: message.createdAt })
      }),
      realtime.on('message:status', (event) => store().applyStatus(event, isMine(event.conversationId))),
      realtime.on('typing:update', ({ conversationId, userId, name, isTyping }) => {
        if (userId !== me()?.id) store().setTyping(conversationId, userId, name, isTyping)
      }),
      realtime.on('conversation:updated', ({ conversationId, unreadCount, lastMessagePreview, lastMessageAt }) => {
        store().patchConversation(conversationId, {
          unreadCount,
          ...(lastMessagePreview !== undefined ? { lastMessagePreview } : {}),
          ...(lastMessageAt !== undefined ? { lastMessageAt } : {}),
        })
      }),
      realtime.on('conversation:assigned', ({ conversationId, agentId, agentName, status: conversationStatus }) => {
        store().patchConversation(conversationId, { assignedAgentId: agentId, status: conversationStatus })
        store().setAgentName(conversationId, agentName)
      }),
      realtime.on('presence:update', ({ userId, online, lastSeen }) => usePresenceStore.getState().set(userId, { online, lastSeen })),
    ]

    const offReconnect = realtime.onReconnect((recovered) => {
      if (recovered) return
      // Missed events are gone: refresh every thread we have on screen.
      for (const [id, thread] of Object.entries(store().threads)) if (thread.status === 'ready') void loadFirstPage(id)
    })

    return () => {
      unsubscribers.forEach((off) => off())
      offReconnect()
    }
  }, [])

  // Logging out: forget everything from the previous user.
  useEffect(
    () =>
      useAuthStore.subscribe((state, previous) => {
        if (previous.user && !state.user) {
          useChatStore.getState().reset()
          clearOutbox()
          forgetReadReceipts()
          presenceWatch.clear()
        }
      }),
    [],
  )

  return null
}
