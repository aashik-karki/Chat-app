import { useState } from 'react'
import { cn } from '../../../lib/cn'
import { formatCount } from '../format'
import { DashboardCard } from './DashboardCard'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** Messages per weekday; the busiest day is blue and labelled, the others show their number on hover/focus. */
export const WeekdayBars = ({ byWeekday, days }: { byWeekday: number[] | null; days: number }) => {
  const [hover, setHover] = useState<number | null>(null)
  const values = byWeekday ?? []
  const max = Math.max(0, ...values)
  const top = max > 0 ? values.indexOf(max) : -1
  const shown = hover ?? top

  return (
    <DashboardCard title="Busiest Day" description={`Messages per weekday, last ${days} days`}>
      {byWeekday === null ? (
        <div className="h-[170px] animate-pulse rounded-xl bg-surface-2" />
      ) : (
        <ul className="flex h-[170px] items-stretch justify-between gap-2" onPointerLeave={() => setHover(null)}>
          {values.map((value, i) => (
            <li key={DAYS[i]} className="flex min-w-0 flex-1 flex-col items-center gap-2.5">
              <button
                type="button"
                className="flex w-full flex-1 flex-col items-center justify-end gap-1.5 rounded-xl outline-none focus-visible:outline-2 focus-visible:outline-primary"
                aria-label={`${FULL[i]}: ${value} messages${i === top ? ', busiest day' : ''}`}
                onPointerEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
              >
                <span className={cn('text-[13px] font-semibold text-fg tabular-nums', i === shown ? 'visible' : 'invisible')}>{formatCount(value)}</span>
                <span
                  className={cn('w-full max-w-9 rounded-xl transition-colors', i === top ? 'bg-chart-series' : i === shown ? 'bg-subtle/60' : 'bg-chart-track')}
                  style={{ height: `${max > 0 ? Math.max(6, (value / max) * 100) : 6}%`, maxHeight: 'calc(100% - 24px)' }}
                />
              </button>
              <span className={cn('text-[13px]', i === top ? 'font-semibold text-primary' : 'text-muted')}>{DAYS[i]}</span>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  )
}
