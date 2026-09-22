import { io, type Socket } from 'socket.io-client'
import type { ChatMessage, PresenceUpdate, SendMessageAcknowledgement, SendMessagePayload } from '../types/chat'

type RealtimeHandlers = {
  onConnection: (state: 'connecting' | 'connected' | 'reconnecting' | 'offline', attempt?: number) => void
  onMessage: (message: ChatMessage) => void
  onMessageStatus: (event: { conversationId: string; messageId: string; status: 'delivered' | 'read'; at: string }) => void
  onPresence: (update: PresenceUpdate) => void
  onTyping: (event: { conversationId: string; userId: string; isTyping: boolean }) => void
  onUnreadSync: (unread: Array<{ conversationId: string; count: number }>) => void
  onError: (message: string) => void
}

class ChatSocket {
  private socket: Socket | null = null
  private configured = Boolean(import.meta.env.VITE_SOCKET_URL)
  private pendingReadReceipts = new Map<string, { conversationId: string; lastMessageId: string }>()

  start(handlers: RealtimeHandlers) {
    if (!this.configured) {
      handlers.onConnection('offline')
      return
    }
    if (this.socket) return

    handlers.onConnection('connecting')
    this.socket = io(import.meta.env.VITE_SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 700,
      reconnectionDelayMax: 8000,
      randomizationFactor: 0.4,
      // The backend authenticates the handshake from its HttpOnly session cookie.
      withCredentials: true,
    })
    this.socket.on('connect', () => {
      handlers.onConnection('connected')
      this.pendingReadReceipts.forEach((receipt) => this.socket?.emit('message:read', receipt))
      this.pendingReadReceipts.clear()
    })
    this.socket.on('disconnect', () => handlers.onConnection('offline'))
    this.socket.io.on('reconnect_attempt', (attempt) => handlers.onConnection('reconnecting', attempt))
    this.socket.on('connect_error', () => handlers.onError('Connection is unavailable. Your messages will retry when you are back online.'))
    this.socket.on('message:new', handlers.onMessage)
    this.socket.on('message:status', handlers.onMessageStatus)
    this.socket.on('presence:update', handlers.onPresence)
    this.socket.on('typing:update', handlers.onTyping)
    this.socket.on('conversation:unread', handlers.onUnreadSync)
    this.socket.connect()
  }

  stop() {
    this.socket?.disconnect()
    this.socket = null
  }

  get isConnected() {
    return this.socket?.connected ?? false
  }

  async sendMessage(payload: SendMessagePayload): Promise<SendMessageAcknowledgement> {
    if (!this.socket?.connected) throw new Error('Message is queued until a connection is available.')
    return new Promise((resolve, reject) => {
      this.socket?.timeout(7000).emit('message:send', payload, (first: Error | SendMessageAcknowledgement | null, second?: SendMessageAcknowledgement) => {
        if (first instanceof Error) {
          reject(new Error('Message timed out. It will be retried automatically.'))
          return
        }
        // Socket.IO acks may be either ack(payload) or ack(null, payload).
        resolve(second ?? first ?? { status: 'sent' })
      })
    })
  }

  setTyping(conversationId: string, isTyping: boolean) {
    this.socket?.volatile.emit('typing:set', { conversationId, isTyping })
  }

  markRead(conversationId: string, lastMessageId: string) {
    const receipt = { conversationId, lastMessageId }
    if (!this.socket?.connected) {
      this.pendingReadReceipts.set(conversationId, receipt)
      return
    }
    this.socket.emit('message:read', receipt)
  }

  subscribeToConversation(conversationId: string) {
    this.socket?.emit('conversation:join', { conversationId })
  }

  registerPushSubscription(subscription: PushSubscriptionJSON) {
    this.socket?.emit('push:subscribe', subscription)
  }
}

export const chatSocket = new ChatSocket()
