import { create } from 'zustand'
import { CURRENT_USER_ID, demoConversations, demoMessages } from '../data/demoChat'
import type { ChatMessage, ConnectionState, Conversation, MessageStatus, PresenceUpdate } from '../types/chat'

interface ChatStore {
  activeConversationId: string
  conversations: Conversation[]
  messages: Record<string, ChatMessage[]>
  connection: ConnectionState
  reconnectAttempt: number
  error: string | null
  typingByConversation: Record<string, string[]>
  notificationPermission: NotificationPermission | 'unsupported'
  setActiveConversation: (conversationId: string) => void
  setConnection: (connection: ConnectionState, reconnectAttempt?: number) => void
  setError: (error: string | null) => void
  setMessages: (conversationId: string, messages: ChatMessage[]) => void
  addMessage: (message: ChatMessage) => void
  updateMessage: (conversationId: string, messageId: string, patch: Partial<ChatMessage>) => void
  markConversationRead: (conversationId: string, readAt?: string) => void
  setTyping: (conversationId: string, userIds: string[]) => void
  applyPresence: (update: PresenceUpdate) => void
  setNotificationPermission: (permission: NotificationPermission | 'unsupported') => void
}

const moveConversationToTop = (conversations: Conversation[], conversationId: string, preview: string, time: string) => {
  const target = conversations.find((conversation) => conversation.id === conversationId)
  if (!target) return conversations
  return [{ ...target, lastMessagePreview: preview, lastMessageAt: time }, ...conversations.filter((conversation) => conversation.id !== conversationId)]
}

export const useChatStore = create<ChatStore>((set, get) => ({
  activeConversationId: 'design-team',
  conversations: demoConversations,
  messages: demoMessages,
  connection: 'offline',
  reconnectAttempt: 0,
  error: null,
  typingByConversation: {},
  notificationPermission: typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  setActiveConversation: (conversationId) => {
    set({ activeConversationId: conversationId })
    get().markConversationRead(conversationId)
  },
  setConnection: (connection, reconnectAttempt = 0) => set({ connection, reconnectAttempt }),
  setError: (error) => set({ error }),
  setMessages: (conversationId, messages) => set((state) => ({
    messages: { ...state.messages, [conversationId]: messages },
  })),
  addMessage: (message) => set((state) => {
    const existingMessages = state.messages[message.conversationId] ?? []
    const duplicate = existingMessages.some((existing) => existing.id === message.id || (message.clientId && existing.clientId === message.clientId))
    if (duplicate) return state
    const isIncoming = message.senderId !== CURRENT_USER_ID
    const isActive = state.activeConversationId === message.conversationId
    const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(message.createdAt))
    return {
      messages: { ...state.messages, [message.conversationId]: [...existingMessages, message] },
      conversations: moveConversationToTop(
        state.conversations.map((conversation) => conversation.id === message.conversationId
          ? { ...conversation, unreadCount: isIncoming && !isActive ? conversation.unreadCount + 1 : conversation.unreadCount }
          : conversation,
        ),
        message.conversationId,
        message.text,
        time,
      ),
    }
  }),
  updateMessage: (conversationId, messageId, patch) => set((state) => ({
    messages: {
      ...state.messages,
      [conversationId]: (state.messages[conversationId] ?? []).map((message) => message.id === messageId || message.clientId === messageId ? { ...message, ...patch } : message),
    },
  })),
  markConversationRead: (conversationId, readAt = new Date().toISOString()) => set((state) => {
    const currentMessages = state.messages[conversationId] ?? []
    const hasUnreadMessages = currentMessages.some((message) => message.senderId !== CURRENT_USER_ID && message.status !== 'read')
    const hasUnreadCount = state.conversations.some((conversation) => conversation.id === conversationId && conversation.unreadCount > 0)
    // Avoid rewriting state for an already-confirmed receipt; this also prevents receipt echo loops.
    if (!hasUnreadMessages && !hasUnreadCount) return state
    return {
      conversations: state.conversations.map((conversation) => conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation),
      messages: {
        ...state.messages,
        [conversationId]: currentMessages.map((message) => message.senderId === CURRENT_USER_ID ? message : { ...message, status: 'read', readAt }),
      },
    }
  }),
  setTyping: (conversationId, userIds) => set((state) => ({
    typingByConversation: { ...state.typingByConversation, [conversationId]: userIds },
  })),
  applyPresence: (update) => set((state) => ({
    conversations: state.conversations.map((conversation) => conversation.user.id === update.userId
      ? { ...conversation, user: { ...conversation.user, presence: update.presence, lastSeen: update.lastSeen } }
      : conversation,
    ),
  })),
  setNotificationPermission: (notificationPermission) => set({ notificationPermission }),
}))

export const statusRank: Record<MessageStatus, number> = { sending: 0, failed: 0, sent: 1, delivered: 2, read: 3 }
