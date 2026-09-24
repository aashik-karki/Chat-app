import { useMemo } from 'react'
import { useAgentsStore } from '../../agents/agents.store'
import { DashboardCard } from './DashboardCard'

const TICKS = 44
const CX = 130
const CY = 138
const INNER = 98
const OUTER = 126

const ticksPath = (from: number, to: number) => {
  let d = ''
  for (let i = from; i < to; i++) {
    const angle = Math.PI - (i / (TICKS - 1)) * Math.PI
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    d += `M${(CX + INNER * cos).toFixed(1)},${(CY - INNER * sin).toFixed(1)} L${(CX + OUTER * cos).toFixed(1)},${(CY - OUTER * sin).toFixed(1)} `
  }
  return d
}

/**
 * Team capacity in use: open chats held by available agents ÷ the chats they can take.
 * Live from the agents store (agent:status events). Ticks turn orange at 80%, red when full.
 */
export const CapacityGauge = () => {
  const byId = useAgentsStore((state) => state.byId)
  const loaded = useAgentsStore((state) => state.loaded)

  const { active, capacity, available } = useMemo(() => {
    const working = Object.values(byId).filter((agent) => agent.status !== 'offline')
    return {
      active: working.reduce((sum, agent) => sum + agent.activeChats, 0),
      capacity: working.reduce((sum, agent) => sum + agent.maxConcurrentChats, 0),
      available: working.length,
    }
  }, [byId])

  const ratio = capacity > 0 ? Math.min(1, active / capacity) : 0
  const filled = Math.round(ratio * TICKS)
  const color = ratio >= 1 ? 'var(--danger)' : ratio >= 0.8 ? 'var(--warning)' : 'var(--chart-2)'
  const percent = Math.round(ratio * 100)

  return (
    <DashboardCard title="Team Capacity" description="Open chats vs. what available agents can take">
      <div className="relative mx-auto flex w-full max-w-[280px] justify-center">
        <svg viewBox="0 0 260 146" className="w-full" role="img" aria-label={capacity > 0 ? `${percent}% of team capacity in use: ${active} of ${capacity} chats` : 'No agents available'}>
          <path d={ticksPath(filled, TICKS)} stroke="var(--chart-track)" strokeWidth="5" strokeLinecap="round" fill="none" />
          <path d={ticksPath(0, filled)} stroke={color} strokeWidth="5" strokeLinecap="round" fill="none" />
        </svg>
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1" aria-hidden="true">
          {!loaded ? (
            <span className="h-10 w-20 animate-pulse rounded-lg bg-surface-2" />
          ) : capacity > 0 ? (
            <>
              <span className="text-[40px] leading-none font-bold tracking-tight text-fg tabular-nums">{percent}%</span>
              <span className="text-[13px] text-muted tabular-nums">
                {active} of {capacity} chats · {available} {available === 1 ? 'agent' : 'agents'}
              </span>
            </>
          ) : (
            <>
              <span className="text-2xl font-bold text-fg">—</span>
              <span className="text-[13px] text-muted">No agents online</span>
            </>
          )}
        </div>
      </div>
    </DashboardCard>
  )
}
