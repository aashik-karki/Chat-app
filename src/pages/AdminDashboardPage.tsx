import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, LogOut, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AdminUsersTable } from '../components/admin/AdminUsersTable'
import { StatCards } from '../components/admin/StatCards'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { adminApi, type UserSummary } from '../lib/adminApi'
import { useAuthStore } from '../store/authStore'

const emptySummary: UserSummary = { total: 0, pending: 0, approved: 0, rejected: 0, users: [] }

/**
 * Full-page admin dashboard at /admin. Reachable only through the
 * `RequireAdmin` route guard. Shows account-status counts plus every
 * regular-user account, with inline approve/reject for pending ones.
 */
export function AdminDashboardPage() {
  const authUser = useAuthStore((state) => state.user)
  const setUserStatus = useAuthStore((state) => state.setUserStatus)
  const logout = useAuthStore((state) => state.logout)
  const [summary, setSummary] = useState<UserSummary>(emptySummary)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSummary = useCallback(async () => {
    try {
      setSummary(await adminApi.getUserSummary())
      setError(null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load the dashboard.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Fetching the dashboard's data on mount is exactly what this effect is
    // for (synchronizing with the backend); the resulting setState calls
    // happen after an await, not synchronously within the effect body, so
    // this eslint rule's static check is overly conservative here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSummary()
  }, [loadSummary])

  const decide = async (id: string, status: 'approved' | 'rejected') => {
    await setUserStatus(id, status)
    // The table's row disposition and the stat tiles both shift on a
    // decision, so just refetch rather than reconciling both by hand.
    await loadSummary()
  }

  return (
    <main className="min-h-svh bg-slate-50">
      <header className="flex flex-wrap items-center gap-4 border-b border-slate-200 bg-white px-7 py-4">
        <Link to="/" className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800">
          <ArrowLeft size={16} />
          Back to chat
        </Link>

        <div className="mr-auto flex items-center gap-2.5 text-orbit">
          <ShieldCheck size={18} />
          <div>
            <h1 className="m-0 text-base font-bold leading-5 text-slate-800">Admin dashboard</h1>
            <span className="text-[10px] leading-[14px] text-slate-400">Signed in as {authUser?.name}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void logout()}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[11px] font-semibold text-slate-600 transition-colors hover:border-violet-300 hover:text-slate-800"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-7">
        {error && (
          <p role="alert" className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </p>
        )}

        <div className="mb-6">
          <StatCards total={summary.total} pending={summary.pending} approved={summary.approved} rejected={summary.rejected} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>User accounts</CardTitle>
            <CardDescription>Everyone who has registered, most recently joined first.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading accounts…</p>
            ) : (
              <AdminUsersTable users={summary.users} onDecide={decide} />
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
