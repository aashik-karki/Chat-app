import { CalendarDays, ChevronDown, Download, Headset, MessageSquareText, MessagesSquare, RotateCw, Send } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/shadcn/button'
import { toAppError } from '../../../lib/errors'
import { toast } from '../../../stores/toast.store'
import { agentsApi } from '../../agents/agents.api'
import { useAgentsStore } from '../../agents/agents.store'
import { adminApi, type UserSummary } from '../admin.api'
import { AdminUsersTable } from '../components/AdminUsersTable'
import { AgentBoard } from '../components/AgentBoard'
import { CapacityGauge } from '../components/CapacityGauge'
import { DashboardCard } from '../components/DashboardCard'
import { MessagesCard } from '../components/MessagesCard'
import { PendingApprovals } from '../components/PendingApprovals'
import { StatCard } from '../components/StatCard'
import { WeekdayBars } from '../components/WeekdayBars'
import { formatCount, formatDay } from '../format'
import { useAnalytics } from '../hooks/useAnalytics'
import { useLiveMetrics } from '../hooks/useLiveMetrics'

const emptySummary: UserSummary = { total: 0, pending: 0, approved: 0, rejected: 0, users: [] }
const PERIODS = [7, 30, 90] as const

/** Client-side CSV of the daily series currently on screen. */
const downloadCsv = (rows: Array<{ date: string; messages: number; previous: number }>, days: number) => {
  const csv = ['date,messages,previous_period_messages', ...rows.map((row) => `${row.date},${row.messages},${row.previous}`)].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = Object.assign(document.createElement('a'), { href: url, download: `messages-last-${days}-days.csv` })
  link.click()
  URL.revokeObjectURL(url)
}

/** Admin dashboard: headline numbers, message trends, busiest day, team capacity, agents and account approvals. */
export const AdminDashboardPage = () => {
  const [days, setDays] = useState<number>(30)
  const { data: metrics, error: metricsError } = useLiveMetrics()
  const { data: analytics, error: analyticsError, loading: analyticsLoading } = useAnalytics(days)
  const agentsById = useAgentsStore((state) => state.byId)
  const [summary, setSummary] = useState<UserSummary>(emptySummary)
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    adminApi
      .userSummary()
      .then((result) => {
        if (cancelled) return
        setSummary(result)
        setUsersError(null)
      })
      .catch((caught) => !cancelled && setUsersError(toAppError(caught).message))
      .finally(() => !cancelled && setUsersLoading(false))
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  // New sign-ups aren't pushed over the socket: refresh when the admin comes back to the tab.
  useEffect(() => {
    const onFocus = () => setRefreshKey((key) => key + 1)
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  const reloadUsers = useCallback(() => setRefreshKey((key) => key + 1), [])

  const decide = async (id: string, status: 'approved' | 'rejected') => {
    await adminApi.decide(id, status)
    toast.success(status === 'approved' ? 'Account approved.' : 'Account rejected.')
    reloadUsers()
  }

  const makeAgent = async (id: string) => {
    const { user } = await adminApi.setRole(id, 'agent')
    toast.success(`${user.name} is now a support agent. They start as Offline until they sign in and go Online.`)
    reloadUsers()
    useAgentsStore.getState().setAll(await agentsApi.list())
  }

  const snap = metrics?.snapshot
  const period = analytics && !analyticsLoading ? analytics : null
  const onlineAgents = useMemo(() => Object.values(agentsById).filter((agent) => agent.status !== 'offline').length, [agentsById])

  const segments = [
    { label: 'Assigned', value: snap ? snap.conversations.open - snap.conversations.waitingInQueue : 0, colorClass: 'bg-chart-series' },
    { label: `Closed · ${days}d`, value: period?.conversations.closed ?? 0, colorClass: 'bg-chart-2' },
    { label: 'In queue', value: snap?.conversations.waitingInQueue ?? 0, colorClass: 'bg-chart-3' },
  ]

  const error = metricsError && !snap ? metricsError : analyticsError && !analytics ? analyticsError : null

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-[28px] font-bold tracking-tight text-fg sm:text-[32px]">Dashboard</h1>
            <p className="text-sm text-muted">{snap ? `${formatCount(snap.activeUsers)} ${snap.activeUsers === 1 ? 'person' : 'people'} connected right now` : 'Live view of your support desk'}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-11 items-center rounded-full border border-line bg-surface text-[15px] text-fg">
              <span className="hidden items-center gap-2.5 border-r border-line px-4 md:flex">
                <CalendarDays size={17} className="text-muted" aria-hidden="true" />
                {analytics ? `${formatDay(analytics.range.from)} – ${formatDay(analytics.range.to, true)}` : '…'}
              </span>
              <label className="relative flex h-full items-center">
                <span className="sr-only">Period</span>
                <select
                  value={days}
                  onChange={(event) => setDays(Number(event.target.value))}
                  className="h-full cursor-pointer appearance-none rounded-full bg-transparent pr-10 pl-4 outline-none focus-visible:outline-2 focus-visible:outline-primary"
                >
                  {PERIODS.map((value) => (
                    <option key={value} value={value}>
                      Last {value} days
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute right-4 text-muted" aria-hidden="true" />
              </label>
            </div>
            <button
              type="button"
              disabled={!period}
              onClick={() => period && downloadCsv(period.messages.daily, days)}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-[15px] font-semibold text-primary-fg shadow-[0_6px_16px_-4px] shadow-primary/40 transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              <Download size={17} aria-hidden="true" />
              Export
            </button>
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger-strong">
            {error}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
          <StatCard label="Messages today" icon={MessageSquareText} value={snap?.messages.today ?? null} caption={snap ? `${formatCount(snap.messages.lastHour)} in the last hour` : undefined} />
          <StatCard
            label="Open conversations"
            icon={MessagesSquare}
            value={snap?.conversations.open ?? null}
            caption={snap ? `${snap.conversations.waitingInQueue} waiting in queue` : undefined}
          />
          <StatCard label="Agents online" icon={Headset} value={snap ? snap.agents.online + snap.agents.busy : null} caption={snap ? `${snap.agents.busy} busy · ${snap.agents.offline} offline` : undefined} />
          <StatCard label="Push delivered today" icon={Send} value={snap?.push.sent ?? null} caption={snap ? `${snap.push.failed} failed · ${snap.push.expired} expired` : undefined} />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.86fr)_minmax(0,1fr)]">
          <MessagesCard analytics={analytics} live={metrics} stale={analyticsLoading} segments={segments} />
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-1">
            <WeekdayBars byWeekday={period?.byWeekday ?? null} days={days} />
            <CapacityGauge />
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <DashboardCard
            id="agents"
            title={
              <span className="flex items-center gap-2.5">
                Agents
                <span className="rounded-lg bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">{onlineAgents} available</span>
              </span>
            }
            description="Status and load, live"
          >
            <AgentBoard />
          </DashboardCard>
          <PendingApprovals users={summary.users} loading={usersLoading} onDecide={decide} />
        </div>

        <DashboardCard
          id="customers"
          title="Customers"
          description={`${formatCount(summary.total)} accounts · ${summary.pending} pending · ${summary.approved} approved · ${summary.rejected} rejected`}
          action={
            <Button size="sm" variant="outline" onClick={reloadUsers} aria-label="Refresh accounts">
              <RotateCw size={14} />
              Refresh
            </Button>
          }
        >
          {usersError && (
            <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger-strong">
              {usersError}
            </p>
          )}
          {usersLoading ? <p className="py-8 text-center text-sm text-muted">Loading accounts…</p> : <AdminUsersTable users={summary.users} onDecide={decide} onMakeAgent={makeAgent} />}
        </DashboardCard>
      </div>
    </div>
  )
}
