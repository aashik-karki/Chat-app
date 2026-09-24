import { create } from 'zustand'
import type { Conversation, Message } from '../../types/api'
import { STATUS_RANK, type UiMessage } from './chat.types'

interface Thread {
  messages: UiMessage[] // oldest → newest
  nextCursor: string | null
  status: 'idle' | 'loading' | 'ready' | 'error'
  loadingOlder: boolean
  error: string | null
}

interface ChatState {
  conversations: Record<string, Conversation>
  threads: Record<string, Thread>
  /** conversationId → userId → name, for "Ram is typing…" */
  typing: Record<string, Record<string, string>>
  /** conversationId → assigned agent's name (from conversation:assigned events) */
  agentNames: Record<string, string | null>

  upsertConversations: (conversations: Conversation[], replaceAll?: boolean) => void
  patchConversation: (id: string, patch: Partial<Conversation>) => void
  setThreadLoading: (id: string) => void
  setThreadError: (id: string, error: string) => void
  /** First page: replaces server messages, keeps unsent local ones at the end. */
  setFirstPage: (id: string, messages: Message[], nextCursor: string | null) => void
  setLoadingOlder: (id: string, loading: boolean) => void
  prependOlder: (id: string, messages: Message[], nextCursor: string | null) => void
  addLocal: (message: UiMessage) => void
  /** The server acked our optimistic message: swap in the real one. */
  confirmLocal: (clientMessageId: string, message: Message) => void
  failLocal: (conversationId: string, clientMessageId: string, errorMessage: string) => void
  retryLocal: (conversationId: string, clientMessageId: string) => void
  removeLocal: (conversationId: string, clientMessageId: string) => void
  /** A message pushed by the server (someone else's, or ours from another tab). */
  receive: (message: Message) => void
  applyStatus: (event: { conversationId: string; messageId: string; status: 'delivered' | 'read'; at: string }, isMine: (message: Message) => boolean) => void
  setTyping: (conversationId: string, userId: string, name: string, isTyping: boolean) => void
  setAgentName: (conversationId: string, name: string | null) => void
  reset: () => void
}

const emptyThread = (): Thread => ({ messages: [], nextCursor: null, status: 'idle', loadingOlder: false, error: null })

const byTime = (a: UiMessage, b: UiMessage) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)

/** Merge without duplicates (same server id, or same clientMessageId for our own echo). */
const mergeMessages = (existing: UiMessage[], incoming: UiMessage[]): UiMessage[] => {
  const result = [...existing]
  for (const message of incoming) {
    const index = result.findIndex((item) => item.id === message.id || item.clientMessageId === message.clientMessageId)
    if (index === -1) result.push(message)
    else if (!result[index]!.local) result[index] = forward(result[index]!, message)
    else result[index] = message // a pending local copy is replaced by the server's version
  }
  return result.sort(byTime)
}

/** Keep the most advanced status of two copies of the same message. */
const forward = (current: UiMessage, next: UiMessage): UiMessage =>
  STATUS_RANK[next.status] >= STATUS_RANK[current.status] ? { ...current, ...next } : { ...next, status: current.status, deliveredAt: current.deliveredAt, readAt: current.readAt }

const withThread = (state: ChatState, id: string, update: (thread: Thread) => Partial<Thread>) => ({
  threads: { ...state.threads, [id]: { ...(state.threads[id] ?? emptyThread()), ...update(state.threads[id] ?? emptyThread()) } },
})

export const useChatStore = create<ChatState>((set) => ({
  conversations: {},
  threads: {},
  typing: {},
  agentNames: {},

  upsertConversations: (conversations, replaceAll) =>
    set((state) => ({
      conversations: {
        ...(replaceAll ? {} : state.conversations),
        ...Object.fromEntries(conversations.map((conversation) => [conversation.id, conversation])),
      },
    })),

  patchConversation: (id, patch) =>
    set((state) => (state.conversations[id] ? { conversations: { ...state.conversations, [id]: { ...state.conversations[id]!, ...patch } } } : state)),

  setThreadLoading: (id) => set((state) => withThread(state, id, (thread) => ({ status: thread.status === 'ready' ? 'ready' : 'loading', error: null }))),
  setThreadError: (id, error) => set((state) => withThread(state, id, () => ({ status: 'error', error }))),

  setFirstPage: (id, messages, nextCursor) =>
    set((state) =>
      withThread(state, id, (thread) => {
        const unsent = thread.messages.filter((message) => message.local && !messages.some((m) => m.clientMessageId === message.clientMessageId))
        // Keep older pages we already loaded (they don't change), refresh the newest page.
        const oldestNew = messages[0]?.createdAt
        const olderKept = oldestNew ? thread.messages.filter((message) => !message.local && message.createdAt < oldestNew) : []
        return {
          messages: mergeMessages([...olderKept, ...unsent], messages),
          nextCursor: olderKept.length > 0 ? thread.nextCursor : nextCursor,
          status: 'ready',
          error: null,
        }
      }),
    ),

  setLoadingOlder: (id, loadingOlder) => set((state) => withThread(state, id, () => ({ loadingOlder }))),

  prependOlder: (id, messages, nextCursor) =>
    set((state) => withThread(state, id, (thread) => ({ messages: mergeMessages(thread.messages, messages), nextCursor, loadingOlder: false }))),

  addLocal: (message) => set((state) => withThread(state, message.conversationId, (thread) => ({ messages: mergeMessages(thread.messages, [message]) }))),

  confirmLocal: (clientMessageId, message) =>
    set((state) =>
      withThread(state, message.conversationId, (thread) => ({
        messages: mergeMessages(
          thread.messages.filter((item) => item.clientMessageId !== clientMessageId || !item.local),
          [message],
        ),
      })),
    ),

  failLocal: (conversationId, clientMessageId, errorMessage) =>
    set((state) =>
      withThread(state, conversationId, (thread) => ({
        messages: thread.messages.map((message) => (message.clientMessageId === clientMessageId && message.local ? { ...message, local: 'failed', errorMessage } : message)),
      })),
    ),

  retryLocal: (conversationId, clientMessageId) =>
    set((state) =>
      withThread(state, conversationId, (thread) => ({
        messages: thread.messages.map((message) =>
          message.clientMessageId === clientMessageId && message.local ? { ...message, local: 'sending', errorMessage: undefined } : message,
        ),
      })),
    ),

  removeLocal: (conversationId, clientMessageId) =>
    set((state) =>
      withThread(state, conversationId, (thread) => ({
        messages: thread.messages.filter((message) => !(message.clientMessageId === clientMessageId && message.local)),
      })),
    ),

  receive: (message) =>
    set((state) => {
      const next = withThread(state, message.conversationId, (thread) => ({ messages: mergeMessages(thread.messages, [message]) }))
      const typing = state.typing[message.conversationId]
      // Whoever just sent a message has stopped typing.
      if (typing?.[message.senderId]) {
        const rest = { ...typing }
        delete rest[message.senderId]
        return { ...next, typing: { ...state.typing, [message.conversationId]: rest } }
      }
      return next
    }),

  applyStatus: ({ conversationId, messageId, status, at }, isMine) =>
    set((state) =>
      withThread(state, conversationId, (thread) => {
        const target = thread.messages.find((message) => message.id === messageId)
        const rank = STATUS_RANK[status]
        return {
          messages: thread.messages.map((message) => {
            if (message.local || STATUS_RANK[message.status] >= rank) return message
            // "read" up to X means every earlier message of mine was read too.
            const applies =
              message.id === messageId ||
              (status === 'read' && isMine(message) && message.createdAt <= (target?.createdAt ?? at))
            if (!applies) return message
            return status === 'read'
              ? { ...message, status, readAt: at, deliveredAt: message.deliveredAt ?? at }
              : { ...message, status, deliveredAt: at }
          }),
        }
      }),
    ),

  setTyping: (conversationId, userId, name, isTyping) =>
    set((state) => {
      const current = { ...(state.typing[conversationId] ?? {}) }
      if (isTyping) current[userId] = name
      else delete current[userId]
      return { typing: { ...state.typing, [conversationId]: current } }
    }),

  setAgentName: (conversationId, name) => set((state) => ({ agentNames: { ...state.agentNames, [conversationId]: name } })),

  reset: () => set({ conversations: {}, threads: {}, typing: {}, agentNames: {} }),
}))

export const EMPTY_MESSAGES: UiMessage[] = []
export const EMPTY_TYPING: Record<string, string> = {}
