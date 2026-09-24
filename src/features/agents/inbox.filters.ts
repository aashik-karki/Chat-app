import type { Conversation, User } from '../../types/api'

export type InboxTab = 'mine' | 'queue' | 'all'

export const isQueued = (conversation: Conversation) =>
  conversation.status === 'open' && !conversation.assignedAgentId && Boolean(conversation.lastMessageAt)

export const inTab = (conversation: Conversation, tab: InboxTab, me: User) => {
  if (tab === 'mine') return conversation.status === 'open' && conversation.assignedAgentId === me.id
  if (tab === 'queue') return isQueued(conversation)
  return Boolean(conversation.lastMessageAt) // "all": every thread that has started
}

const byRecent = (a: Conversation, b: Conversation) => (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? '')
/** Queue is first-come first-served: oldest waiting first. */
const byOldest = (a: Conversation, b: Conversation) => (a.lastMessageAt ?? '').localeCompare(b.lastMessageAt ?? '')

export const filterInbox = (conversations: Conversation[], tab: InboxTab, me: User, search: string) => {
  const query = search.trim().toLowerCase()
  return conversations
    .filter((conversation) => inTab(conversation, tab, me))
    .filter(
      (conversation) =>
        !query ||
        conversation.customer.name.toLowerCase().includes(query) ||
        conversation.customer.email.toLowerCase().includes(query) ||
        (conversation.lastMessagePreview ?? '').toLowerCase().includes(query),
    )
    .sort(tab === 'queue' ? byOldest : byRecent)
}
