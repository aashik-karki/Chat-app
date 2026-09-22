export type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'offline'
export type PresenceState = 'online' | 'away' | 'offline'
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed'

export interface ChatUser {
  id: string
  name: string
  initials: string
  presence: PresenceState
  lastSeen?: string
}

export interface ChatMessage {
  id: string
  clientId?: string
  conversationId: string
  senderId: string
  text: string
  createdAt: string
  status: MessageStatus
  deliveredAt?: string
  readAt?: string
  failureReason?: string
}

export interface Conversation {
  id: string
  user: ChatUser
  unreadCount: number
  lastMessagePreview: string
  lastMessageAt: string
}

export interface SendMessagePayload {
  clientId: string
  conversationId: string
  text: string
}

export interface SendMessageAcknowledgement {
  id?: string
  createdAt?: string
  status?: MessageStatus
  deliveredAt?: string
}

export interface PresenceUpdate {
  userId: string
  presence: PresenceState
  lastSeen?: string
}
