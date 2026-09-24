import type { LucideIcon } from 'lucide-react'
import { formatCount } from '../format'
import { DeltaBadge } from './DeltaBadge'

export interface StatCardProps {
  label: string
  value: number | null
  icon: LucideIcon
  /** Percent change vs. the previous period (omit for live values). */
  change?: number | null
  goodWhen?: 'up' | 'down'
  /** Small line under the number, e.g. "vs. 1,204 last period". */
  caption?: string
}

/** Headline number tile: label + icon, big value, change badge, caption. */
export const StatCard = ({ label, value, icon: Icon, change, goodWhen, caption }: StatCardProps) => (
  <section className="flex min-w-0 flex-col gap-4 rounded-[20px] border border-line bg-surface p-5 sm:p-6" aria-label={label}>
    <div className="flex items-center justify-between gap-3">
      <h2 className="truncate text-base font-semibold tracking-tight text-fg">{label}</h2>
      <Icon size={22} className="shrink-0 text-primary" aria-hidden="true" />
    </div>
    <div className="flex flex-wrap items-center gap-3">
      {value === null ? (
        <span className="h-9 w-24 animate-pulse rounded-lg bg-surface-2" />
      ) : (
        <span className="text-[32px] leading-none font-bold tracking-tight text-fg tabular-nums">{formatCount(value)}</span>
      )}
      {change !== undefined && value !== null && <DeltaBadge change={change} goodWhen={goodWhen} />}
    </div>
    {caption && <p className="truncate text-[13px] text-muted">{caption}</p>}
  </section>
)
