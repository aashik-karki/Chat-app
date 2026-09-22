import type { ChatMessage, Conversation } from '../types/chat'
import { request } from './httpClient'
import { initialsFromName } from './name'

interface RawConversation {
  id: string
  customerId: string
  customerName: string
  customerEmail: string
  lastMessagePreview: string | null
  lastMessageAt: string | null
  unreadCount: number
}

interface RawMessage {
  id: string
  clientMessageId: string
  conversationId: string
  senderId: string
  text: string
  status: ChatMessage['status']
  createdAt: string
  deliveredAt: string | null
  readAt: string | null
}

// The backend always reports who the customer is (that's the data it
// actually has). For an admin, that's the right other-party to show. For a
// customer looking at their own thread it would just be themselves, so we
// show a generic "Support" contact instead until the app has a concept of
// an assigned agent — see conversation-service.ts on the backend for the
// same trade-off.
const toConversationUser = (raw: RawConversation, viewerRole: 'admin' | 'user'): Conversation['user'] => {
  if (viewerRole === 'admin') {
    return { id: raw.customerId, name: raw.customerName, initials: initialsFromName(raw.customerName), presence: 'offline' }
  }
  return { id: 'support', name: 'Support', initials: 'SP', presence: 'offline' }
}

const toConversation = (raw: RawConversation, viewerRole: 'admin' | 'user'): Conversation => ({
  id: raw.id,
  user: toConversationUser(raw, viewerRole),
  unreadCount: raw.unreadCount,
  lastMessagePreview: raw.lastMessagePreview ?? '',
  lastMessageAt: raw.lastMessageAt ?? '',
})

const toChatMessage = (raw: RawMessage): ChatMessage => ({
  id: raw.id,
  clientId: raw.clientMessageId,
  conversationId: raw.conversationId,
  senderId: raw.senderId,
  text: raw.text,
  createdAt: raw.createdAt,
  status: raw.status,
  deliveredAt: raw.deliveredAt ?? undefined,
  readAt: raw.readAt ?? undefined,
})

export interface MessageHistoryPage {
  messages: ChatMessage[]
  nextCursor: string | null
}

export const chatApi = {
  /** The signed-in user's conversations — one thread for a customer, every customer's thread for an admin. */
  listConversations: async (viewerRole: 'admin' | 'user'): Promise<Conversation[]> => {
    const result = await request<{ conversations: RawConversation[] }>('/api/v1/conversations')
    return result.data.conversations.map((conversation) => toConversation(conversation, viewerRole))
  },

  /** Oldest-to-newest page of a conversation's message history. Pass the previous page's `nextCursor` to page further back. */
  getMessageHistory: async (conversationId: string, cursor?: string): Promise<MessageHistoryPage> => {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
    const result = await request<RawMessage[]>(`/api/v1/conversations/${conversationId}/messages${query}`)
    // This endpoint's response is `{ data, nextCursor }`, not the generic
    // `{ data, csrfToken? }` envelope `request` understands — `nextCursor`
    // survives on the same object underneath the narrower type, so read it
    // back out rather than losing it.
    const { nextCursor } = result as unknown as { nextCursor: string | null }
    return { messages: result.data.map(toChatMessage), nextCursor: nextCursor ?? null }
  },
}
