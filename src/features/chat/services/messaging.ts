import { AppError, toAppError } from '../../../lib/errors'
import { newClientId } from '../../../lib/id'
import { realtime } from '../../../lib/socket'
import type { Message, User } from '../../../types/api'
import { useChatStore } from '../chat.store'

/** These mean "not delivered yet, try again when connected" rather than "refused". */
const RETRYABLE = new Set(['NOT_CONNECTED', 'ACK_TIMEOUT', 'RATE_LIMITED', 'INTERNAL_ERROR'])
const MAX_AUTO_ATTEMPTS = 5

/** Messages waiting to be (re)sent, in order. Same clientId on every attempt → no duplicates on the server. */
const outbox = new Map<string, { conversationId: string; text: string; attempts: number }>()
let flushing = false

const trySend = async (clientId: string) => {
  const entry = outbox.get(clientId)
  if (!entry) return
  entry.attempts += 1
  try {
    const saved = await realtime.emitWithAck<Message>('message:send', { conversationId: entry.conversationId, clientId, text: entry.text })
    outbox.delete(clientId)
    useChatStore.getState().confirmLocal(clientId, saved)
  } catch (caught) {
    const error = toAppError(caught)
    if (RETRYABLE.has(error.code) && entry.attempts < MAX_AUTO_ATTEMPTS) {
      // Stays "sending"; flushOutbox() runs again on reconnect. A rate limit waits a bit.
      if (error.code === 'RATE_LIMITED') setTimeout(() => void flushOutbox(), 3_000)
      throw error
    }
    outbox.delete(clientId)
    useChatStore.getState().failLocal(entry.conversationId, clientId, error.message)
    throw error
  }
}

/** Sends everything still waiting, oldest first. Called after (re)connecting. */
export const flushOutbox = async () => {
  if (flushing || !realtime.connected) return
  flushing = true
  try {
    for (const clientId of [...outbox.keys()]) {
      try {
        await trySend(clientId)
      } catch (error) {
        if (error instanceof AppError && (error.code === 'NOT_CONNECTED' || error.code === 'ACK_TIMEOUT')) break // still offline
      }
    }
  } finally {
    flushing = false
  }
}

/** Optimistic send: the message appears instantly, then turns into the server's version when acked. */
export const sendMessage = (conversationId: string, text: string, me: User) => {
  const clientId = newClientId()
  useChatStore.getState().addLocal({
    id: clientId,
    clientMessageId: clientId,
    conversationId,
    senderId: me.id,
    text,
    status: 'sent',
    local: 'sending',
    createdAt: new Date().toISOString(),
    deliveredAt: null,
    readAt: null,
  })
  outbox.set(clientId, { conversationId, text, attempts: 0 })
  // Keep order: if older messages are still queued, this one waits behind them.
  if (outbox.size === 1) void trySend(clientId).catch(() => undefined)
  else void flushOutbox()
}

export const retryMessage = (conversationId: string, clientId: string, text: string) => {
  useChatStore.getState().retryLocal(conversationId, clientId)
  outbox.set(clientId, { conversationId, text, attempts: 0 })
  void flushOutbox()
}

export const discardMessage = (conversationId: string, clientId: string) => {
  outbox.delete(clientId)
  useChatStore.getState().removeLocal(conversationId, clientId)
}

export const clearOutbox = () => outbox.clear()

/** "I've seen up to here" — sent once per new newest-seen message. */
const lastReadSent = new Map<string, string>()
export const markRead = (conversationId: string, lastMessageId: string) => {
  if (lastReadSent.get(conversationId) === lastMessageId || !realtime.connected) return
  lastReadSent.set(conversationId, lastMessageId)
  realtime.emitWithAck('message:read', { conversationId, lastMessageId }).catch(() => {
    lastReadSent.delete(conversationId) // try again next time
  })
}
export const forgetReadReceipts = () => lastReadSent.clear()
