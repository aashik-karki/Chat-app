import { Search } from 'lucide-react'
import { memo } from 'react'
import { NavLink } from 'react-router'
import { Avatar } from '../../../components/ui/Avatar'
import { CountBadge } from '../../../components/ui/Badge'
import { EmptyState } from '../../../components/ui/EmptyState'
import { cn } from '../../../lib/cn'
import { formatListTime } from '../../../lib/time'
import type { Conversation, User } from '../../../types/api'
import { usePresenceOf } from '../../presence/usePresence'
import { useAgentsStore } from '../agents.store'
import type { InboxTab } from '../inbox.filters'

interface ConversationListProps {
  conversations: Conversation[]
  tab: InboxTab
  counts: Record<InboxTab, number>
  onTab: (tab: InboxTab) => void
  search: string
  onSearch: (value: string) => void
  me: User
}

const TABS: Array<{ value: InboxTab; label: string }> = [
  { value: 'mine', label: 'Mine' },
  { value: 'queue', label: 'Queue' },
  { value: 'all', label: 'All' },
]

const Row = memo(({ conversation, me }: { conversation: Conversation; me: User }) => {
  const presence = usePresenceOf(conversation.customer.id)
  const agentName = useAgentsStore((state) => (conversation.assignedAgentId ? state.byId[conversation.assignedAgentId]?.name : undefined))
  const assignee = !conversation.assignedAgentId
    ? conversation.status === 'closed'
      ? 'Closed'
      : 'Waiting'
    : conversation.assignedAgentId === me.id
      ? null
      : (agentName ?? conversation.assignedAgent?.name ?? 'Another agent')

  return (
    <NavLink
      to={`/inbox/${conversation.id}`}
      className={({ isActive }) =>
        cn('flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors', isActive ? 'bg-primary/10' : 'hover:bg-surface-2')
      }
    >
      <Avatar name={conversation.customer.name} seed={conversation.customer.id} presence={presence ? (presence.online ? 'online' : 'offline') : undefined} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className={cn('truncate text-sm text-fg', conversation.unreadCount > 0 ? 'font-semibold' : 'font-medium')}>{conversation.customer.name}</span>
          <span className="shrink-0 text-[11px] text-subtle">{formatListTime(conversation.lastMessageAt)}</span>
        </span>
        <span className="flex items-center justify-between gap-2">
          <span className={cn('truncate text-xs', conversation.unreadCount > 0 ? 'text-fg' : 'text-muted')}>{conversation.lastMessagePreview ?? 'No messages yet'}</span>
          <CountBadge count={conversation.unreadCount} />
        </span>
        {assignee && <span className="mt-0.5 block truncate text-[11px] text-subtle">{assignee}</span>}
      </span>
    </NavLink>
  )
})
Row.displayName = 'ConversationRow'

export const ConversationList = ({ conversations, tab, counts, onTab, search, onSearch, me }: ConversationListProps) => (
  <div className="flex min-h-0 flex-1 flex-col">
    <div className="space-y-2 p-3">
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1" role="tablist" aria-label="Inbox">
        {TABS.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={tab === item.value}
            onClick={() => onTab(item.value)}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-sm font-medium transition',
              tab === item.value ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg',
            )}
          >
            {item.label}
            <span className={cn('text-xs', item.value === 'queue' && counts.queue > 0 ? 'font-semibold text-warning' : 'text-subtle')}>{counts[item.value]}</span>
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 rounded-xl border border-line bg-bg px-3 focus-within:border-primary">
        <Search size={15} className="text-subtle" />
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search customers or messages"
          aria-label="Search conversations"
          className="h-9 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-subtle"
        />
      </label>
    </div>
    <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-3" aria-label="Conversations">
      {conversations.length === 0 ? (
        <EmptyState title={search ? 'No matches' : tab === 'queue' ? 'Nobody is waiting' : tab === 'mine' ? 'No chats assigned to you' : 'No conversations yet'}>
          {!search && tab === 'mine' && 'Set yourself Online to receive chats.'}
        </EmptyState>
      ) : (
        conversations.map((conversation) => <Row key={conversation.id} conversation={conversation} me={me} />)
      )}
    </nav>
  </div>
)
