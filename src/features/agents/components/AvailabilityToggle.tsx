import { useState } from 'react'
import { cn } from '../../../lib/cn'
import { toAppError } from '../../../lib/errors'
import { realtime } from '../../../lib/socket'
import { toast } from '../../../stores/toast.store'
import type { AgentStatus, Availability } from '../../../types/api'
import { agentsApi } from '../agents.api'
import { useAgentsStore } from '../agents.store'

const OPTIONS: Array<{ value: Availability; label: string; dot: string; hint: string }> = [
  { value: 'online', label: 'Online', dot: 'bg-success', hint: 'Get new chats' },
  { value: 'busy', label: 'Busy', dot: 'bg-warning', hint: 'Keep my chats, no new ones' },
  { value: 'offline', label: 'Offline', dot: 'bg-subtle', hint: 'My chats go to other agents' },
]

/** The agent's own online / busy / offline switch, with their current load. */
export const AvailabilityToggle = ({ agentId }: { agentId: string }) => {
  const me = useAgentsStore((state) => state.byId[agentId])
  const [saving, setSaving] = useState<Availability | null>(null)

  const choose = async (availability: Availability) => {
    if (availability === me?.availability) return
    setSaving(availability)
    try {
      // Socket first (instant), REST as a fallback when the socket is down.
      const status = realtime.connected
        ? await realtime.emitWithAck<AgentStatus>('agent:set-status', { availability })
        : await agentsApi.setMyStatus(availability)
      useAgentsStore.getState().upsert(status)
    } catch (error) {
      toast.error(toAppError(error).message)
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="border-b border-line p-3">
      <div className="mb-2 flex items-center justify-between px-1 text-xs">
        <span className="font-semibold text-muted uppercase">My status</span>
        {me && (
          <span className="text-muted" title="Open chats / max at once">
            {me.activeChats}/{me.maxConcurrentChats} chats
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1" role="radiogroup" aria-label="My availability">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={me?.availability === option.value}
            title={option.hint}
            disabled={saving !== null}
            onClick={() => void choose(option.value)}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition',
              me?.availability === option.value ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg',
              saving === option.value && 'animate-pulse',
            )}
          >
            <span className={cn('size-2 rounded-full', option.dot)} />
            {option.label}
          </button>
        ))}
      </div>
      {me && me.availability !== 'offline' && !me.connected && <p className="mt-2 px-1 text-xs text-warning">You look offline to others until you reconnect.</p>}
    </div>
  )
}
