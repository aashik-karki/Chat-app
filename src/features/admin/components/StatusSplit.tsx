import { cn } from '../../../lib/cn'
import { formatCount } from '../format'

export interface StatusSegment {
  label: string
  value: number
  /** A chart token class, e.g. 'bg-chart-series'. */
  colorClass: string
}

/**
 * Conversations by status: the numbers with their labels (so identity never relies on
 * color alone), then one stacked bar whose segments are proportional to each share.
 */
export const StatusSplit = ({ title, segments }: { title: string; segments: StatusSegment[] }) => {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-line p-4 sm:p-5" aria-label={title}>
      <h3 className="text-[15px] font-semibold text-fg">{title}</h3>
      <dl className="grid grid-cols-3 gap-3">
        {segments.map((segment) => (
          <div key={segment.label} className="flex min-w-0 flex-col gap-0.5">
            <dt className="order-2 truncate text-[13px] text-muted">{segment.label}</dt>
            <dd className="order-1 flex items-center gap-2">
              <span className={cn('size-2.5 shrink-0 rounded-[3px]', segment.colorClass)} aria-hidden="true" />
              <span className="text-xl font-bold tracking-tight text-fg tabular-nums">{formatCount(segment.value)}</span>
              {total > 0 && <span className="text-xs text-subtle tabular-nums">{Math.round((segment.value / total) * 100)}%</span>}
            </dd>
          </div>
        ))}
      </dl>
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-chart-track" aria-hidden="true">
        {segments
          .filter((segment) => segment.value > 0)
          .map((segment) => (
            <span key={segment.label} className={cn('h-full first:rounded-l-full last:rounded-r-full', segment.colorClass)} style={{ flexGrow: segment.value, flexBasis: 0 }} />
          ))}
      </div>
    </section>
  )
}
