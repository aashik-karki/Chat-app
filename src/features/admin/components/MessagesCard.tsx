import { useState } from 'react'
import { cn } from '../../../lib/cn'
import type { Analytics, MetricsUpdate } from '../../../types/api'
import { formatCount, formatDay, formatMinute, percentChange } from '../format'
import { DashboardCard } from './DashboardCard'
import { DeltaBadge } from './DeltaBadge'
import { StatusSplit, type StatusSegment } from './StatusSplit'
import { TrendChart, type TrendPoint } from './TrendChart'

type Mode = 'daily' | 'live'

interface MessagesCardProps {
  analytics: Analytics | null
  live: MetricsUpdate | null
  /** Dim the chart while another period loads. */
  stale: boolean
  segments: StatusSegment[]
}

/** Messages over time: per day vs. the previous period, or per minute live. Status split underneath. */
export const MessagesCard = ({ analytics, live, stale, segments }: MessagesCardProps) => {
  const [mode, setMode] = useState<Mode>('daily')

  const daily: TrendPoint[] = (analytics?.messages.daily ?? []).map((day) => ({ label: formatDay(day.date), title: formatDay(day.date, true), value: day.messages, previous: day.previous }))
  const perMinute: TrendPoint[] = (live?.messagesPerMinute ?? []).map((point) => ({ label: formatMinute(point.minute), title: formatMinute(point.minute), value: point.messages }))
  const points = mode === 'daily' ? daily : perMinute
  const headline = mode === 'daily' ? (analytics?.messages.total ?? null) : live ? perMinute.reduce((sum, point) => sum + point.value, 0) : null

  const tabs = (
    <div className="flex rounded-full bg-surface-2 p-1" role="group" aria-label="Chart range">
      {(['daily', 'live'] as const).map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={mode === value}
          onClick={() => setMode(value)}
          className={cn('h-8 rounded-full px-3.5 text-[13px] font-medium transition-colors', mode === value ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg')}
        >
          {value === 'daily' ? 'Per day' : 'Live · 60 min'}
        </button>
      ))}
    </div>
  )

  return (
    <DashboardCard title="Messages" description={mode === 'daily' ? `All conversations, last ${analytics?.range.days ?? '…'} days` : 'Per minute, updates every 5 seconds'} action={tabs}>
      <div className="flex flex-col gap-6 md:flex-row md:items-end">
        <div className="flex shrink-0 flex-col gap-3 md:w-44 md:pb-10">
          {headline === null ? (
            <span className="h-11 w-32 animate-pulse rounded-lg bg-surface-2" />
          ) : (
            <span className="text-[44px] leading-none font-bold tracking-tight text-fg tabular-nums">{formatCount(headline)}</span>
          )}
          {mode === 'daily' && analytics ? (
            <span className="flex flex-wrap items-center gap-2 text-sm text-muted">
              <DeltaBadge change={percentChange(analytics.messages.total, analytics.messages.previousTotal)} />
              vs. last period
            </span>
          ) : (
            <span className="text-sm text-muted">{mode === 'live' ? 'in the last hour' : ''}</span>
          )}
        </div>
        <div className={cn('min-w-0 flex-1 transition-opacity', stale && mode === 'daily' && 'opacity-50')}>
          {points.length > 0 ? (
            <TrendChart
              points={points}
              seriesLabel={mode === 'daily' ? 'This period' : 'Messages'}
              previousLabel={mode === 'daily' ? 'Last period' : undefined}
              ariaLabel={mode === 'daily' ? 'Messages per day, this period compared with the previous one' : 'Messages per minute over the last hour'}
            />
          ) : (
            <div className="h-[240px] animate-pulse rounded-xl bg-surface-2" />
          )}
        </div>
      </div>
      <StatusSplit title="Conversations by status" segments={segments} />
    </DashboardCard>
  )
}
