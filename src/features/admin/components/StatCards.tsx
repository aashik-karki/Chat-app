import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/shadcn/card'
import { cn } from '@/lib/utils'
import { formatCount } from '../format'

export type StatTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral'

export interface StatItem {
  label: string
  value: number
  icon: LucideIcon
  tone: StatTone
  /** Small secondary line, e.g. "3 busy · 1 offline". */
  hint?: string
}

const tones: Record<StatTone, string> = {
  primary: 'text-primary bg-primary/10',
  success: 'text-success bg-success/12',
  warning: 'text-warning bg-warning/15',
  danger: 'text-danger bg-danger/12',
  neutral: 'text-muted-foreground bg-surface-2',
}

/** At-a-glance tiles: icon + big number + label (+ optional hint). The number is the chart. */
export function StatCards({ items, columns = 4 }: { items: StatItem[]; columns?: 3 | 4 | 6 }) {
  return (
    <div className={cn('grid grid-cols-2 gap-3 sm:gap-4', columns === 3 && 'lg:grid-cols-3', columns === 4 && 'lg:grid-cols-4', columns === 6 && 'lg:grid-cols-3 2xl:grid-cols-6')}>
      {items.map(({ label, value, icon: Icon, tone, hint }) => (
        <Card key={label} className="py-4">
          <CardContent className="flex items-center gap-3.5 px-4">
            <span className={cn('grid size-10 shrink-0 place-items-center rounded-full', tones[tone])} aria-hidden="true">
              <Icon size={18} />
            </span>
            <span className="min-w-0">
              <span className="block text-2xl leading-none font-semibold text-foreground">{formatCount(value)}</span>
              <span className="mt-1 block truncate text-xs text-muted-foreground">{label}</span>
              {hint && <span className="block truncate text-[11px] text-subtle">{hint}</span>}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
