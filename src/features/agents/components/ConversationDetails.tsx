import { ArrowRightLeft, CheckCircle2, Hand, Mail, Tag } from 'lucide-react'
import { useState } from 'react'
import { Avatar } from '../../../components/ui/Avatar'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { toAppError } from '../../../lib/errors'
import { formatLastSeen } from '../../../lib/time'
import { toast } from '../../../stores/toast.store'
import type { Conversation, User } from '../../../types/api'
import { useChatStore } from '../../chat/chat.store'
import { TOPICS } from '../../chat/topics'
import { usePresenceOf } from '../../presence/usePresence'
import { agentsApi } from '../agents.api'
import { useAgentsStore } from '../agents.store'

/** Right panel: who the customer is, who handles the chat, and the actions for it. */
export const ConversationDetails = ({ conversation, me }: { conversation: Conversation; me: User }) => {
  const presence = usePresenceOf(conversation.customer.id)
  const agents = useAgentsStore((state) => state.byId)
  const [busy, setBusy] = useState<string | null>(null)
  const isAdmin = me.role === 'admin'
  const mine = conversation.assignedAgentId === me.id
  const assigneeName = conversation.assignedAgentId ? (agents[conversation.assignedAgentId]?.name ?? conversation.assignedAgent?.name ?? 'Another agent') : null

  const run = async (label: string, action: () => Promise<unknown>, success: string, patch?: Partial<Conversation>) => {
    setBusy(label)
    try {
      await action()
      if (patch) useChatStore.getState().patchConversation(conversation.id, patch)
      toast.success(success)
    } catch (error) {
      toast.error(toAppError(error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col gap-5 overflow-y-auto border-l border-line bg-surface p-5" aria-label="Conversation details">
      <div className="flex flex-col items-center text-center">
        <Avatar name={conversation.customer.name} seed={conversation.customer.id} size="lg" presence={presence ? (presence.online ? 'online' : 'offline') : undefined} />
        <h2 className="mt-3 font-semibold text-fg">{conversation.customer.name}</h2>
        <p className="text-xs text-muted">{presence?.online ? 'Online now' : formatLastSeen(presence?.lastSeen ?? null)}</p>
      </div>

      <dl className="space-y-3 text-sm">
        <div className="flex items-center gap-2.5 text-muted">
          <Mail size={15} />
          <dd className="truncate text-fg">{conversation.customer.email}</dd>
        </div>
        <div className="flex items-center gap-2.5 text-muted">
          <Tag size={15} />
          <dd className="text-fg">{TOPICS.find((topic) => topic.value === conversation.topic)?.label ?? 'General question'}</dd>
        </div>
      </dl>

      <section className="rounded-2xl border border-line p-4">
        <h3 className="mb-2 text-xs font-semibold text-muted uppercase">Assignment</h3>
        <div className="mb-3 flex items-center gap-2">
          {conversation.status === 'closed' ? (
            <Badge>Closed</Badge>
          ) : assigneeName ? (
            <Badge tone={mine ? 'primary' : 'neutral'}>{mine ? 'Assigned to you' : assigneeName}</Badge>
          ) : (
            <Badge tone="warning">Waiting in queue</Badge>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {conversation.status === 'open' && !conversation.assignedAgentId && me.role === 'agent' && (
            <Button
              size="sm"
              icon={<Hand size={15} />}
              loading={busy === 'claim'}
              onClick={() => void run('claim', () => agentsApi.claim(conversation.id), 'You took this conversation.', { assignedAgentId: me.id })}
            >
              Take this chat
            </Button>
          )}
          {conversation.status === 'open' && (mine || isAdmin) && (
            <Button
              size="sm"
              variant="secondary"
              icon={<CheckCircle2 size={15} />}
              loading={busy === 'close'}
              onClick={() => void run('close', () => agentsApi.close(conversation.id), 'Conversation closed.', { status: 'closed', assignedAgentId: null })}
            >
              Close conversation
            </Button>
          )}
          {isAdmin && conversation.status === 'open' && (
            <label className="mt-1 flex flex-col gap-1 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <ArrowRightLeft size={13} /> Transfer to
              </span>
              <select
                className="h-9 rounded-lg border border-line bg-bg px-2 text-sm text-fg"
                value={conversation.assignedAgentId ?? ''}
                disabled={busy !== null}
                aria-label="Transfer to agent"
                onChange={(event) => {
                  const agentId = event.target.value || null
                  const name = agentId ? agents[agentId]?.name : 'the queue'
                  void run('transfer', () => agentsApi.transfer(conversation.id, agentId), `Moved to ${name}.`, { assignedAgentId: agentId })
                }}
              >
                <option value="">— Queue (unassigned) —</option>
                {Object.values(agents)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((agent) => (
                    <option key={agent.agentId} value={agent.agentId}>
                      {agent.name} · {agent.status} · {agent.activeChats}/{agent.maxConcurrentChats}
                    </option>
                  ))}
              </select>
            </label>
          )}
        </div>
      </section>
    </aside>
  )
}
