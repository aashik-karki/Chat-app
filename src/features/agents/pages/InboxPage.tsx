import { ArrowLeft, Inbox, PanelRight, RotateCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Avatar } from '../../../components/ui/Avatar'
import { Badge } from '../../../components/ui/Badge'
import { Button, IconButton } from '../../../components/ui/Button'
import { EmptyState } from '../../../components/ui/EmptyState'
import { PageSpinner } from '../../../components/ui/Spinner'
import { cn } from '../../../lib/cn'
import { toAppError } from '../../../lib/errors'
import { formatLastSeen } from '../../../lib/time'
import { useConnectionStore } from '../../../stores/connection.store'
import { useAuthStore } from '../../auth/auth.store'
import { chatApi } from '../../chat/chat.api'
import { useChatStore } from '../../chat/chat.store'
import { ChatView } from '../../chat/components/ChatView'
import { ExportMenu } from '../../chat/components/ExportMenu'
import { useUnreadTitle } from '../../chat/hooks/useUnreadTitle'
import { usePresenceOf, useWatchPresence } from '../../presence/usePresence'
import { useAgentsStore } from '../agents.store'
import { AvailabilityToggle } from '../components/AvailabilityToggle'
import { ConversationDetails } from '../components/ConversationDetails'
import { ConversationList } from '../components/ConversationList'
import { filterInbox, inTab, type InboxTab } from '../inbox.filters'

/** Staff inbox: conversation list · chat · details. On phones: list OR chat. */
export const InboxPage = () => {
  const me = useAuthStore((state) => state.user)!
  const { conversationId } = useParams()
  const conversationsById = useChatStore((state) => state.conversations)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [tab, setTab] = useState<InboxTab>(me.role === 'admin' ? 'all' : 'mine')
  const [search, setSearch] = useState('')
  const [showDetails, setShowDetails] = useState(true)
  const connected = useConnectionStore((state) => state.status === 'connected')

  // Load every conversation; reload after a reconnect so nothing missed is stale.
  useEffect(() => {
    if (!connected && attempt === 0 && status === 'ready') return
    let cancelled = false
    chatApi
      .list()
      .then((list) => {
        if (cancelled) return
        useChatStore.getState().upsertConversations(list, true)
        setStatus('ready')
      })
      .catch((caught) => {
        if (cancelled) return
        setError(toAppError(caught).message)
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, connected])

  const all = useMemo(() => Object.values(conversationsById), [conversationsById])
  const counts = useMemo(
    () => ({ mine: all.filter((c) => inTab(c, 'mine', me)).length, queue: all.filter((c) => inTab(c, 'queue', me)).length, all: all.filter((c) => inTab(c, 'all', me)).length }),
    [all, me],
  )
  const visible = useMemo(() => filterInbox(all, tab, me, search), [all, tab, me, search])
  const active = conversationId ? conversationsById[conversationId] : undefined

  useWatchPresence(visible.slice(0, 150).map((conversation) => conversation.customer.id))
  useUnreadTitle(all.filter((c) => c.assignedAgentId === me.id || me.role === 'admin').reduce((sum, c) => sum + c.unreadCount, 0))

  const retry = () => {
    setError(null)
    setStatus('loading')
    setAttempt((value) => value + 1)
  }

  if (status === 'loading' && all.length === 0) return <PageSpinner label="Loading conversations" />
  if (status === 'error' && all.length === 0)
    return (
      <EmptyState title="Couldn't load conversations">
        <p className="mb-3">{error}</p>
        <Button variant="secondary" size="sm" icon={<RotateCw size={14} />} onClick={retry}>
          Try again
        </Button>
      </EmptyState>
    )

  return (
    <div className="flex min-h-0 flex-1">
      <aside className={cn('flex w-full shrink-0 flex-col border-r border-line bg-surface md:w-80', conversationId && 'hidden md:flex')} aria-label="Inbox">
        {me.role === 'agent' && <AvailabilityToggle agentId={me.id} />}
        <ConversationList conversations={visible} tab={tab} counts={counts} onTab={setTab} search={search} onSearch={setSearch} me={me} />
      </aside>

      <div className={cn('min-w-0 flex-1 flex-col', conversationId ? 'flex' : 'hidden md:flex')}>
        {!conversationId ? (
          <EmptyState icon={<Inbox size={22} />} title="Pick a conversation">
            Chats assigned to you are under <strong>Mine</strong>; customers waiting for anyone are in the <strong>Queue</strong>.
          </EmptyState>
        ) : !active ? (
          <EmptyState title="Conversation not found">
            <Link to="/inbox" className="font-semibold text-primary hover:underline">
              Back to the inbox
            </Link>
          </EmptyState>
        ) : (
          <div className="flex min-h-0 flex-1">
            <StaffChat conversationId={active.id} showDetails={showDetails} onToggleDetails={() => setShowDetails((value) => !value)} />
            {showDetails && (
              <div className="hidden xl:flex">
                <ConversationDetails conversation={active} me={me} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/** The chat column for staff: header + shared ChatView (joins the room). */
const StaffChat = ({ conversationId, showDetails, onToggleDetails }: { conversationId: string; showDetails: boolean; onToggleDetails: () => void }) => {
  const me = useAuthStore((state) => state.user)!
  const conversation = useChatStore((state) => state.conversations[conversationId])!
  const agents = useAgentsStore((state) => state.byId)
  const presence = usePresenceOf(conversation.customer.id)

  const nameOf = useCallback(
    (senderId: string) =>
      senderId === me.id ? 'You' : senderId === conversation.customer.id ? conversation.customer.name : (agents[senderId]?.name ?? 'Support team'),
    [me.id, conversation.customer, agents],
  )

  const assignedElsewhere = conversation.assignedAgentId && conversation.assignedAgentId !== me.id
  const assigneeName = conversation.assignedAgentId ? (agents[conversation.assignedAgentId]?.name ?? conversation.assignedAgent?.name ?? 'another agent') : null
  // Mirrors the backend rule: agents reply only in their own (or unassigned) chats; admins anywhere.
  const disabledReason = me.role === 'agent' && assignedElsewhere ? `${assigneeName} is handling this chat. Only they (or an admin) can reply.` : undefined

  const header = (
    <header className="flex items-center gap-3 border-b border-line bg-surface px-3 py-3 sm:px-5">
      <Link to="/inbox" className="md:hidden" aria-label="Back to inbox">
        <ArrowLeft size={20} className="text-muted" />
      </Link>
      <Avatar name={conversation.customer.name} seed={conversation.customer.id} presence={presence ? (presence.online ? 'online' : 'offline') : undefined} />
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-semibold text-fg">{conversation.customer.name}</h1>
        <p className="truncate text-xs text-muted">
          {presence?.online ? 'Online now' : formatLastSeen(presence?.lastSeen ?? null)}
          {conversation.assignedAgentId === me.id && ' · assigned to you'}
          {!conversation.assignedAgentId && conversation.status === 'open' && ' · waiting — replying takes this chat'}
        </p>
      </div>
      {conversation.status === 'closed' && <Badge>Closed</Badge>}
      <ExportMenu conversationId={conversation.id} />
      {/* The details panel only exists on wide screens, so its toggle does too. */}
      <span className="hidden xl:inline-flex">
        <IconButton label={showDetails ? 'Hide details' : 'Show details'} onClick={onToggleDetails}>
          <PanelRight size={18} />
        </IconButton>
      </span>
    </header>
  )

  return (
    <ChatView
      key={conversation.id}
      conversation={conversation}
      me={me}
      join
      header={header}
      nameOf={nameOf}
      showNames
      composerDisabledReason={disabledReason}
      emptyHint="This customer hasn't written anything yet."
    />
  )
}
