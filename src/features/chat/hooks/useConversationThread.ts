import { useEffect } from 'react'
import { realtime } from '../../../lib/socket'
import { useConnectionStore } from '../../../stores/connection.store'
import { EMPTY_MESSAGES, useChatStore } from '../chat.store'
import { loadFirstPage } from '../services/threads'

/**
 * Loads a conversation's newest messages and (for staff) joins its socket room.
 * Customers are placed in their room by the server automatically.
 */
export const useConversationThread = (conversationId: string | null, { join }: { join: boolean }) => {
  const connected = useConnectionStore((state) => state.status === 'connected')
  const thread = useChatStore((state) => (conversationId ? state.threads[conversationId] : undefined))

  useEffect(() => {
    if (conversationId) void loadFirstPage(conversationId)
  }, [conversationId])

  // Join on open and again after every reconnect; leave on close.
  useEffect(() => {
    if (!join || !conversationId || !connected) return
    realtime.emitWithAck('conversation:join', { conversationId }).catch(() => undefined)
    return () => {
      realtime.emitWithAck('conversation:leave', { conversationId }).catch(() => undefined)
    }
  }, [join, conversationId, connected])

  return {
    messages: thread?.messages ?? EMPTY_MESSAGES,
    status: thread?.status ?? 'loading',
    error: thread?.error ?? null,
    hasOlder: Boolean(thread?.nextCursor),
    loadingOlder: thread?.loadingOlder ?? false,
  }
}
