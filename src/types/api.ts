/** Shapes returned by the chat-backend (see backend docs/realtime-events.md and /api/docs). */

export type Role = 'admin' | 'agent' | 'user'
export type AccountStatus = 'pending' | 'approved' | 'rejected'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  status?: AccountStatus
  createdAt?: string
}

export type ServerMessageStatus = 'sent' | 'delivered' | 'read'

export interface Message {
  id: string
  clientMessageId: string
  conversationId: string
  senderId: string
  text: string
  status: ServerMessageStatus
  createdAt: string
  deliveredAt: string | null
  readAt: string | null
}

export type ConversationTopic = 'general' | 'billing' | 'technical' | 'sales'

export interface Conversation {
  id: string
  customer: { id: string; name: string; email: string }
  assignedAgentId: string | null
  assignedAgent: { id: string; name: string } | null
  status: 'open' | 'closed'
  topic: ConversationTopic
  lastMessagePreview: string | null
  lastMessageAt: string | null
  unreadCount: number
}

export interface HistoryPage {
  data: Message[]
  nextCursor: string | null
}

export type Availability = 'online' | 'busy' | 'offline'

export interface AgentStatus {
  agentId: string
  name: string
  email: string
  availability: Availability
  connected: boolean
  status: Availability
  activeChats: number
  maxConcurrentChats: number
  skills: string[]
  lastSeen: string | null
}

export interface PresenceState {
  online: boolean
  lastSeen: string | null
}

export interface MetricsSnapshot {
  timestamp: string
  activeUsers: number
  agents: { online: number; busy: number; offline: number }
  conversations: { open: number; waitingInQueue: number }
  messages: { lastMinute: number; lastHour: number; today: number }
  push: { sent: number; failed: number; expired: number }
  connectionsOnThisServer: number
}

export interface MetricsUpdate {
  snapshot: MetricsSnapshot
  messagesPerMinute: Array<{ minute: string; messages: number }>
}

/** GET /api/v1/metrics/analytics — daily history for the dashboard (days counted in `range.timeZone`). */
export interface Analytics {
  range: { days: number; timeZone: string; from: string; to: string }
  messages: { total: number; previousTotal: number; daily: Array<{ date: string; messages: number; previous: number }> }
  /** Messages per weekday in the period, Sunday first. */
  byWeekday: number[]
  conversations: { closed: number; previousClosed: number }
  generatedAt: string
}

/** Events the server pushes over Socket.IO. */
export interface ServerEvents {
  'message:new': (message: Message) => void
  'message:status': (event: { conversationId: string; messageId: string; status: 'delivered' | 'read'; at: string }) => void
  'typing:update': (event: { conversationId: string; userId: string; name: string; isTyping: boolean }) => void
  'presence:update': (event: { userId: string; online: boolean; lastSeen: string | null }) => void
  'conversation:updated': (event: { conversationId: string; unreadCount: number; lastMessagePreview?: string; lastMessageAt?: string }) => void
  'conversation:assigned': (event: {
    conversationId: string
    agentId: string | null
    agentName: string | null
    status: 'open' | 'closed'
    reason: 'auto' | 'claim' | 'manual' | 'requeue' | 'closed'
  }) => void
  'agent:status': (status: AgentStatus) => void
  'metrics:update': (update: MetricsUpdate) => void
}
