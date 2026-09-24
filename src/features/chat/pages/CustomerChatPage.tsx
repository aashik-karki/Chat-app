import { Headset, RotateCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Avatar } from '../../../components/ui/Avatar'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { EmptyState } from '../../../components/ui/EmptyState'
import { PageSpinner } from '../../../components/ui/Spinner'
import { toAppError } from '../../../lib/errors'
import { formatLastSeen } from '../../../lib/time'
import { useConnectionStore } from '../../../stores/connection.store'
import { useAuthStore } from '../../auth/auth.store'
import { usePresenceOf, useWatchPresence } from '../../presence/usePresence'
import { chatApi } from '../chat.api'
import { useChatStore } from '../chat.store'
import { ChatView } from '../components/ChatView'
import { ExportMenu } from '../components/ExportMenu'
import { TopicPicker } from '../components/TopicPicker'
import { TOPICS } from '../topics'
import { useUnreadTitle } from '../hooks/useUnreadTitle'

/** A customer's single support thread. */
export const CustomerChatPage = () => {
  const me = useAuthStore((state) => state.user)!
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const conversation = useChatStore((state) => (conversationId ? state.conversations[conversationId] : undefined))
  const liveAgentName = useChatStore((state) => (conversationId ? state.agentNames[conversationId] : undefined))

  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    chatApi
      .mine()
      .then((mine) => {
        if (cancelled) return
        useChatStore.getState().upsertConversations([mine])
        setConversationId(mine.id)
      })
      .catch((caught) => !cancelled && setError(toAppError(caught).message))
    return () => {
      cancelled = true
    }
  }, [attempt])

  const retry = () => {
    setError(null)
    setAttempt((value) => value + 1)
  }

  const agentId = conversation?.assignedAgentId ?? null
  useWatchPresence([agentId])
  const livePresence = usePresenceOf(agentId)
  const connected = useConnectionStore((state) => state.status === 'connected' && state.browserOnline)
  // While we're disconnected, the last known presence may be stale: don't show it.
  const agentPresence = connected ? livePresence : undefined
  useUnreadTitle(conversation?.unreadCount ?? 0)

  const nameOf = useCallback(
    (senderId: string) => (senderId === me.id ? 'You' : senderId === agentId ? (liveAgentName ?? conversation?.assignedAgent?.name ?? 'Support') : 'Support team'),
    [me.id, agentId, liveAgentName, conversation?.assignedAgent?.name],
  )

  if (error) {
    return (
      <EmptyState title="Couldn't open your chat">
        <p className="mb-3">{error}</p>
        <Button variant="secondary" size="sm" icon={<RotateCw size={14} />} onClick={retry}>
          Try again
        </Button>
      </EmptyState>
    )
  }
  if (!conversation) return <PageSpinner label="Opening your chat" />

  const agentName = agentId ? (liveAgentName ?? conversation.assignedAgent?.name ?? 'Support agent') : null
  const hasMessages = Boolean(conversation.lastMessageAt)
  const topicLabel = TOPICS.find((topic) => topic.value === conversation.topic)?.label

  const subtitle = conversation.status === 'closed'
    ? 'This chat was closed. Send a message to start again.'
    : !connected
      ? 'Connecting…'
      : agentName
      ? agentPresence?.online
        ? 'Online now'
        : agentPresence
          ? formatLastSeen(agentPresence.lastSeen)
          : 'Your support agent'
      : hasMessages
        ? 'Waiting for the next available agent…'
        : 'We usually reply within a few minutes'

  const header = (
    <header className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3 sm:px-6">
      {agentName ? (
        <Avatar name={agentName} seed={agentId ?? undefined} presence={agentPresence ? (agentPresence.online ? 'online' : 'offline') : undefined} />
      ) : (
        <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Headset size={20} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-semibold text-fg">{agentName ?? 'Support team'}</h1>
        <p className="truncate text-xs text-muted">{subtitle}</p>
      </div>
      {topicLabel && hasMessages && <Badge className="hidden sm:inline-flex">{topicLabel}</Badge>}
      {conversation.status === 'closed' && <Badge tone="neutral">Closed</Badge>}
      <ExportMenu conversationId={conversation.id} />
    </header>
  )

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col border-line sm:border-x">
      <ChatView
        conversation={conversation}
        me={me}
        join={false}
        header={header}
        nameOf={nameOf}
        emptyHint={
          <div className="flex flex-col items-center gap-4">
            <p>Tell us what you need help with, then send your first message.</p>
            <TopicPicker current={conversation.topic} />
          </div>
        }
      />
    </div>
  )
}
