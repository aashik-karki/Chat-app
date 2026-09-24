import { Activity, CheckCircle2, Clock, Headset, Hourglass, MessageSquareText, MessagesSquare, RotateCw, Send, Users, XCircle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/shadcn/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shadcn/card'
import { cn } from '@/lib/utils'
import { toAppError } from '../../../lib/errors'
import { toast } from '../../../stores/toast.store'
import { agentsApi } from '../../agents/agents.api'
import { useAgentsStore } from '../../agents/agents.store'
import { adminApi, type UserSummary } from '../admin.api'
import { AdminUsersTable } from '../components/AdminUsersTable'
import { AgentBoard } from '../components/AgentBoard'
import { MessagesChart } from '../components/MessagesChart'
import { StatCards, type StatItem } from '../components/StatCards'
import { useLiveMetrics } from '../hooks/useLiveMetrics'

const emptySummary: UserSummary = { total: 0, pending: 0, approved: 0, rejected: 0, users: [] }

/** Admin dashboard: live support metrics, agent board, and customer account approvals. */
export const AdminDashboardPage = () => {
  const { data: metrics, error: metricsError, live } = useLiveMetrics()
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
  const liveItems: StatItem[] = snap
    ? [
        { label: 'Active users', value: snap.activeUsers, icon: Activity, tone: 'primary', hint: 'connected right now' },
        { label: 'Agents online', value: snap.agents.online, icon: Headset, tone: 'success', hint: `${snap.agents.busy} busy · ${snap.agents.offline} offline` },
        { label: 'Waiting in queue', value: snap.conversations.waitingInQueue, icon: Hourglass, tone: snap.conversations.waitingInQueue > 0 ? 'warning' : 'neutral', hint: 'customers without an agent' },
        { label: 'Open conversations', value: snap.conversations.open, icon: MessagesSquare, tone: 'primary' },
        { label: 'Messages today', value: snap.messages.today, icon: MessageSquareText, tone: 'primary', hint: `${snap.messages.lastHour} in the last hour` },
        { label: 'Push delivered today', value: snap.push.sent, icon: Send, tone: snap.push.failed > 0 ? 'warning' : 'success', hint: `${snap.push.failed} failed · ${snap.push.expired} expired` },
      ]
    : []

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Live view of your support desk.</p>
          </div>
          <span className={cn('inline-flex items-center gap-1.5 text-xs', live ? 'text-success' : 'text-muted-foreground')} role="status">
            <span className={cn('size-2 rounded-full', live ? 'animate-pulse bg-success' : 'bg-subtle')} />
            {live ? `Live · updated ${metrics ? new Date(metrics.snapshot.timestamp).toLocaleTimeString() : '…'}` : 'Paused while offline'}
          </span>
        </div>

        {metricsError && !snap && (
          <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
            {metricsError}
          </p>
        )}

        {snap ? <StatCards items={liveItems} columns={6} /> : !metricsError && <div className="h-24 animate-pulse rounded-2xl bg-surface-2" />}

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Messages per minute</CardTitle>
              <CardDescription>Last 60 minutes · updates every 5 seconds</CardDescription>
            </CardHeader>
            <CardContent>{metrics ? <MessagesChart points={metrics.messagesPerMinute} /> : <div className="h-[220px] animate-pulse rounded-xl bg-surface-2" />}</CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Agents</CardTitle>
              <CardDescription>Status and load, live</CardDescription>
            </CardHeader>
            <CardContent>
              <AgentBoard />
            </CardContent>
          </Card>
        </div>

        <section className="flex flex-col gap-4" aria-labelledby="customers-heading">
          <StatCards
            columns={4}
            items={[
              { label: 'Total customers', value: summary.total, icon: Users, tone: 'primary' },
              { label: 'Pending approval', value: summary.pending, icon: Clock, tone: summary.pending > 0 ? 'warning' : 'neutral' },
              { label: 'Approved', value: summary.approved, icon: CheckCircle2, tone: 'success' },
              { label: 'Rejected', value: summary.rejected, icon: XCircle, tone: 'danger' },
            ]}
          />
          <Card>
            <CardHeader className="flex-row items-start">
              <div className="flex flex-col gap-1">
                <CardTitle id="customers-heading">Customer accounts</CardTitle>
                <CardDescription>Everyone who has registered, most recently joined first.</CardDescription>
              </div>
              <CardAction>
                <Button size="sm" variant="outline" onClick={reloadUsers} aria-label="Refresh accounts">
                  <RotateCw size={14} />
                  Refresh
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              {usersError && (
                <p role="alert" className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
                  {usersError}
                </p>
              )}
              {usersLoading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Loading accounts…</p>
              ) : (
                <AdminUsersTable users={summary.users} onDecide={decide} onMakeAgent={makeAgent} />
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
