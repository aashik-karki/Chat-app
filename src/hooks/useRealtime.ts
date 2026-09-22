import { useCallback, useEffect, useRef } from 'react'
import { chatSocket } from '../lib/socket'
import { useChatStore } from '../store/chatStore'
import type { ChatMessage, SendMessagePayload } from '../types/chat'

const messageId = () => typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`

export function useRealtime(enabled: boolean) {
  const pendingMessages = useRef<SendMessagePayload[]>([])
  const typingTimer = useRef<number | undefined>(undefined)
  const typingActive = useRef(false)

  const deliver = useCallback(async (payload: SendMessagePayload) => {
    try {
      const acknowledgement = await chatSocket.sendMessage(payload)
      useChatStore.getState().updateMessage(payload.conversationId, payload.clientId, {
        id: acknowledgement.id ?? payload.clientId,
        createdAt: acknowledgement.createdAt ?? new Date().toISOString(),
        status: acknowledgement.status ?? 'sent',
        deliveredAt: acknowledgement.deliveredAt,
        failureReason: undefined,
      })
    } catch (error) {
      if (!pendingMessages.current.some((message) => message.clientId === payload.clientId)) pendingMessages.current.push(payload)
      useChatStore.getState().updateMessage(payload.conversationId, payload.clientId, { status: 'failed', failureReason: error instanceof Error ? error.message : 'Unable to send message' })
      useChatStore.getState().setError('Message queued. We’ll retry it as soon as you reconnect.')
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      chatSocket.stop()
      useChatStore.getState().setConnection('offline')
      return
    }
    chatSocket.start({
      onConnection: (connection, attempt) => {
        useChatStore.getState().setConnection(connection, attempt)
        if (connection === 'connected') {
          const queued = pendingMessages.current.splice(0)
          queued.forEach((message) => {
            void deliver(message)
          })
        }
      },
      onMessage: (message) => {
        useChatStore.getState().addMessage(message)
        const state = useChatStore.getState()
        if (message.senderId !== state.currentUserId && message.conversationId === state.activeConversationId) {
          useChatStore.getState().markConversationRead(message.conversationId)
          chatSocket.markRead(message.conversationId, message.id)
        }
      },
      onMessageStatus: ({ conversationId, messageId, status, at }) => useChatStore.getState().updateMessage(conversationId, messageId, status === 'read' ? { status, readAt: at } : { status, deliveredAt: at }),
      onPresence: (update) => useChatStore.getState().applyPresence(update),
      onTyping: ({ conversationId, userId, isTyping }) => {
        const active = useChatStore.getState().typingByConversation[conversationId] ?? []
        const next = isTyping ? [...new Set([...active, userId])] : active.filter((id) => id !== userId)
        useChatStore.getState().setTyping(conversationId, next)
      },
      onUnreadSync: (unread) => {
        const state = useChatStore.getState()
        unread.forEach(({ conversationId, count }) => {
          const conversation = state.conversations.find((item) => item.id === conversationId)
          if (!conversation || conversation.unreadCount === count) return
          // Server is authoritative for cross-device unread state.
          useChatStore.setState({ conversations: useChatStore.getState().conversations.map((item) => item.id === conversationId ? { ...item, unreadCount: count } : item) })
        })
      },
      onError: (error) => useChatStore.getState().setError(error),
    })
    return () => {
      if (typingTimer.current) window.clearTimeout(typingTimer.current)
      chatSocket.stop()
    }
  }, [deliver, enabled])

  const sendMessage = useCallback((conversationId: string, text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const currentUserId = useChatStore.getState().currentUserId
    if (!currentUserId) return
    const payload = { clientId: messageId(), conversationId, text: trimmed }
    const optimistic: ChatMessage = { id: payload.clientId, clientId: payload.clientId, conversationId, senderId: currentUserId, text: trimmed, createdAt: new Date().toISOString(), status: 'sending' }
    useChatStore.getState().addMessage(optimistic)
    if (chatSocket.isConnected) {
      void deliver(payload)
    } else {
      pendingMessages.current.push(payload)
      useChatStore.getState().updateMessage(conversationId, payload.clientId, { status: 'failed', failureReason: 'Waiting for connection' })
    }
  }, [deliver])

  const retryMessage = useCallback((message: ChatMessage) => {
    useChatStore.getState().updateMessage(message.conversationId, message.id, { status: 'sending', failureReason: undefined })
    const payload = { clientId: message.clientId ?? message.id, conversationId: message.conversationId, text: message.text }
    void deliver(payload)
  }, [deliver])

  const notifyTyping = useCallback((conversationId: string) => {
    if (!typingActive.current) {
      typingActive.current = true
      chatSocket.setTyping(conversationId, true)
    }
    if (typingTimer.current) window.clearTimeout(typingTimer.current)
    typingTimer.current = window.setTimeout(() => {
      typingActive.current = false
      chatSocket.setTyping(conversationId, false)
    }, 1200)
  }, [])

  const markRead = useCallback((conversationId: string, lastMessageId: string) => {
    useChatStore.getState().markConversationRead(conversationId)
    chatSocket.markRead(conversationId, lastMessageId)
  }, [])

  const subscribe = useCallback((conversationId: string) => {
    chatSocket.subscribeToConversation(conversationId)
  }, [])

  return { sendMessage, retryMessage, notifyTyping, markRead, subscribe }
}
