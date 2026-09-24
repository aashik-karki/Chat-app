import { cn } from '../../../lib/cn'
import { formatPercent } from '../format'

interface DeltaBadgeProps {
  /** Percent change; null = no earlier data to compare with. */
  change: number | null
  /** Whether a rise is good news (messages) or bad news (queue length). */
  goodWhen?: 'up' | 'down'
  className?: string
}

/** ▲ 12.3% / ▼ 4% pill: green when the change is good news, red when it isn't. */
export const DeltaBadge = ({ change, goodWhen = 'up', className }: DeltaBadgeProps) => {
  if (change === null) return <span className={cn('rounded-lg bg-surface-2 px-2 py-1 text-xs font-semibold text-muted', className)}>New</span>
  const up = change > 0
  const flat = Math.abs(change) < 0.05
  const good = flat || (up ? goodWhen === 'up' : goodWhen === 'down')
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold tabular-nums',
        flat ? 'bg-surface-2 text-muted' : good ? 'bg-success-soft text-success-strong' : 'bg-danger-soft text-danger-strong',
        className,
      )}
    >
      {!flat && (
        <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true">
          <path d={up ? 'M5 1.5l4 6.5H1z' : 'M5 8.5L1 2h8z'} fill="currentColor" />
        </svg>
      )}
      <span className="sr-only">{flat ? 'No change' : up ? 'Up' : 'Down'}</span>
      {formatPercent(change)}
    </span>
  )
}
