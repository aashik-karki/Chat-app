import { Settings2, UserMinus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/shadcn/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/shadcn/table'
import { cn } from '@/lib/utils'
import { Avatar } from '../../../components/ui/Avatar'
import { toAppError } from '../../../lib/errors'
import { formatLastSeen } from '../../../lib/time'
import { toast } from '../../../stores/toast.store'
import type { AgentStatus, ConversationTopic } from '../../../types/api'
import { agentsApi } from '../../agents/agents.api'
import { useAgentsStore } from '../../agents/agents.store'
import { TOPICS } from '../../chat/topics'
import { adminApi } from '../admin.api'

const STATUS: Record<AgentStatus['status'], { label: string; dot: string; rank: number }> = {
  online: { label: 'Online', dot: 'bg-success', rank: 0 },
  busy: { label: 'Busy', dot: 'bg-warning', rank: 1 },
  offline: { label: 'Offline', dot: 'bg-subtle', rank: 2 },
}

/** Load meter: fill = severity (primary → warning ≥ 80% → danger when full); track = same hue, lighter. */
const LoadMeter = ({ active, max }: { active: number; max: number }) => {
  const ratio = max > 0 ? Math.min(1, active / max) : 0
  const tone = ratio >= 1 ? 'bg-danger' : ratio >= 0.8 ? 'bg-warning' : 'bg-primary'
  const track = ratio >= 1 ? 'bg-danger/15' : ratio >= 0.8 ? 'bg-warning/15' : 'bg-primary/15'
  return (
    <span className="flex items-center gap-2" title={`${active} of ${max} chats`}>
      <span className={cn('h-1.5 w-20 overflow-hidden rounded-full', track)} role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={active} aria-label="Open chats">
        <span className={cn('block h-full rounded-full transition-[width]', tone)} style={{ width: `${ratio * 100}%` }} />
      </span>
      <span className="text-xs text-muted-foreground tabular-nums">
        {active}/{max}
      </span>
    </span>
  )
}

const SettingsEditor = ({ agent, onDone }: { agent: AgentStatus; onDone: () => void }) => {
  const [max, setMax] = useState(agent.maxConcurrentChats)
  const [skills, setSkills] = useState<string[]>(agent.skills)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const updated = await agentsApi.updateSettings(agent.agentId, { maxConcurrentChats: max, skills })
      useAgentsStore.getState().upsert(updated)
      toast.success(`${agent.name}'s settings saved.`)
      onDone()
    } catch (error) {
      toast.error(toAppError(error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-end gap-4 rounded-xl bg-surface-2 p-3">
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Max chats at once
        <input
          type="number"
          min={1}
          max={50}
          value={max}
          onChange={(event) => setMax(Math.max(1, Math.min(50, Number(event.target.value) || 1)))}
          className="h-8 w-20 rounded-lg border border-border bg-card px-2 text-sm text-foreground"
        />
      </label>
      <fieldset className="flex flex-col gap-1 text-xs text-muted-foreground">
        <legend className="mb-1">Skills (routing)</legend>
        <span className="flex flex-wrap gap-1.5">
          {TOPICS.filter((topic) => topic.value !== 'general').map((topic) => {
            const on = skills.includes(topic.value)
            return (
              <button
                key={topic.value}
                type="button"
                aria-pressed={on}
                onClick={() => setSkills(on ? skills.filter((skill) => skill !== topic.value) : [...skills, topic.value as ConversationTopic])}
                className={cn('rounded-full border px-2.5 py-1 text-xs', on ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground')}
              >
                {topic.label}
              </button>
            )
          })}
        </span>
      </fieldset>
      <span className="ml-auto flex gap-2">
        <Button size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button size="sm" disabled={saving} onClick={() => void save()}>
          Save
        </Button>
      </span>
    </div>
  )
}

/** Live status of every agent (updates arrive over the socket as `agent:status`). */
export function AgentBoard() {
  const byId = useAgentsStore((state) => state.byId)
  const loaded = useAgentsStore((state) => state.loaded)
  const [editing, setEditing] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  const agents = useMemo(
    () => Object.values(byId).sort((a, b) => STATUS[a.status].rank - STATUS[b.status].rank || b.activeChats - a.activeChats || a.name.localeCompare(b.name)),
    [byId],
  )

  const demote = async (agent: AgentStatus) => {
    setRemoving(agent.agentId)
    try {
      await adminApi.setRole(agent.agentId, 'user')
      const rest = { ...useAgentsStore.getState().byId }
      delete rest[agent.agentId]
      useAgentsStore.getState().setAll(Object.values(rest))
      toast.success(`${agent.name} is a customer again. Their open chats go back to the queue.`)
    } catch (error) {
      toast.error(toAppError(error).message)
    } finally {
      setRemoving(null)
    }
  }

  if (!loaded) return <p className="py-6 text-center text-sm text-muted-foreground">Loading agents…</p>
  if (agents.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">No agents yet. Use “Make agent” on an approved customer below.</p>

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Agent</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Load</TableHead>
          <TableHead className="hidden 2xl:table-cell">Skills</TableHead>
          <TableHead className="text-right">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {agents.map((agent) => (
          <TableRow key={agent.agentId} className="align-top">
            <TableCell colSpan={editing === agent.agentId ? 5 : 1}>
              <span className="flex items-center gap-2.5">
                <Avatar name={agent.name} seed={agent.agentId} size="sm" presence={agent.status} />
                <span className="min-w-0 max-w-[11rem]">
                  <span className="block truncate text-[13px] font-medium text-foreground">{agent.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{agent.connected ? agent.email : formatLastSeen(agent.lastSeen)}</span>
                </span>
              </span>
              {editing === agent.agentId && <SettingsEditor agent={agent} onDone={() => setEditing(null)} />}
            </TableCell>
            {editing !== agent.agentId && (
              <>
                <TableCell>
                  <span className="inline-flex items-center gap-1.5 text-[13px] text-foreground">
                    <span className={cn('size-2 rounded-full', STATUS[agent.status].dot)} aria-hidden="true" />
                    {STATUS[agent.status].label}
                  </span>
                  {agent.availability !== agent.status && <span className="block text-[11px] text-subtle">chose {agent.availability}, disconnected</span>}
                </TableCell>
                <TableCell>
                  <LoadMeter active={agent.activeChats} max={agent.maxConcurrentChats} />
                </TableCell>
                <TableCell className="hidden 2xl:table-cell">
                  <span className="flex flex-wrap gap-1">
                    {agent.skills.length === 0 ? (
                      <span className="text-xs text-subtle">Generalist</span>
                    ) : (
                      agent.skills.map((skill) => (
                        <span key={skill} className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-muted-foreground capitalize">
                          {skill}
                        </span>
                      ))
                    )}
                  </span>
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Button size="icon" variant="ghost" className="size-8" aria-label={`Edit ${agent.name}'s settings`} onClick={() => setEditing(agent.agentId)}>
                    <Settings2 size={15} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 text-muted-foreground hover:text-danger"
                    aria-label={`Remove ${agent.name}'s agent role`}
                    disabled={removing === agent.agentId}
                    onClick={() => void demote(agent)}
                  >
                    <UserMinus size={15} />
                  </Button>
                </TableCell>
              </>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
