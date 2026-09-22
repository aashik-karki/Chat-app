import { create } from 'zustand'
import { chatApi } from '../lib/chatApi'
import { formatClockTime } from '../lib/time'
import type { ChatMessage, ConnectionState, Conversation, MessageStatus, PresenceUpdate } from '../types/chat'

interface ChatStore {
  // The signed-in user's own id, used to tell "my messages" apart from the
  // other side's. Set once, right after login (see ChatPage), because the
  // store's own logic (addMessage, markConversationRead, ...) runs outside
  // React and can't read the auth store's hook directly.
  currentUserId: string | null
  activeConversationId: string | null
  conversations: Conversation[]
  conversationsLoaded: boolean
  loadedHistoryFor: Record<string, boolean>
  messages: Record<string, ChatMessage[]>
  connection: ConnectionState
  reconnectAttempt: number
  error: string | null
  typingByConversation: Record<string, string[]>
  notificationPermission: NotificationPermission | 'unsupported'
  setCurrentUserId: (userId: string) => void
  loadConversations: (viewerRole: 'admin' | 'user') => Promise<void>
  loadMessageHistory: (conversationId: string) => Promise<void>
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
  /** Clears all chat state on sign-out so the next signed-in user never sees a previous account's messages. */
  reset: () => void
}

const moveConversationToTop = (conversations: Conversation[], conversationId: string, preview: string, time: string) => {
  const target = conversations.find((conversation) => conversation.id === conversationId)
  if (!target) return conversations
  return [{ ...target, lastMessagePreview: preview, lastMessageAt: time }, ...conversations.filter((conversation) => conversation.id !== conversationId)]
}

const initialState = {
  currentUserId: null as string | null,
  activeConversationId: null as string | null,
  conversations: [] as Conversation[],
  conversationsLoaded: false,
  loadedHistoryFor: {} as Record<string, boolean>,
  messages: {} as Record<string, ChatMessage[]>,
  connection: 'offline' as ConnectionState,
  reconnectAttempt: 0,
  error: null as string | null,
  typingByConversation: {} as Record<string, string[]>,
  notificationPermission: (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission) as NotificationPermission | 'unsupported',
}

export const useChatStore = create<ChatStore>((set, get) => ({
  ...initialState,
  setCurrentUserId: (currentUserId) => set({ currentUserId }),
  loadConversations: async (viewerRole) => {
    try {
      const conversations = await chatApi.listConversations(viewerRole)
      set((state) => ({
        conversations,
        conversationsLoaded: true,
        // Keep whatever's already active if it still exists, otherwise default to the first thread.
        activeConversationId: conversations.some((conversation) => conversation.id === state.activeConversationId)
          ? state.activeConversationId
          : (conversations[0]?.id ?? null),
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unable to load conversations.' })
    }
  },
  loadMessageHistory: async (conversationId) => {
    if (get().loadedHistoryFor[conversationId]) return
    try {
      const page = await chatApi.getMessageHistory(conversationId)
      set((state) => ({
        messages: { ...state.messages, [conversationId]: page.messages },
        loadedHistoryFor: { ...state.loadedHistoryFor, [conversationId]: true },
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unable to load message history.' })
    }
  },
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
    const isIncoming = message.senderId !== state.currentUserId
    const isActive = state.activeConversationId === message.conversationId
    const time = formatClockTime(message.createdAt)
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
    const hasUnreadMessages = currentMessages.some((message) => message.senderId !== state.currentUserId && message.status !== 'read')
    const hasUnreadCount = state.conversations.some((conversation) => conversation.id === conversationId && conversation.unreadCount > 0)
    // Avoid rewriting state for an already-confirmed receipt; this also prevents receipt echo loops.
    if (!hasUnreadMessages && !hasUnreadCount) return state
    return {
      conversations: state.conversations.map((conversation) => conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation),
      messages: {
        ...state.messages,
        [conversationId]: currentMessages.map((message) => message.senderId === state.currentUserId ? message : { ...message, status: 'read', readAt }),
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
  reset: () => set({ ...initialState }),
}))

export const statusRank: Record<MessageStatus, number> = { sending: 0, failed: 0, sent: 1, delivered: 2, read: 3 }
