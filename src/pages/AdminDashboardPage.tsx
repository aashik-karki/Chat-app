import { ArrowLeft, LogOut, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PendingUsers } from '../components/PendingUsers'
import { useAuthStore } from '../store/authStore'

/**
 * Full-page admin dashboard at /admin. Reachable only through the
 * `RequireAdmin` route guard. Scope for now is pending-account review;
 * approved/rejected tabs and agent management can follow as their own
 * dashboard sections later.
 */
export function AdminDashboardPage() {
  const authUser = useAuthStore((state) => state.user)
  const pendingUsers = useAuthStore((state) => state.pendingUsers)
  const setUserStatus = useAuthStore((state) => state.setUserStatus)
  const logout = useAuthStore((state) => state.logout)

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

      <section className="mx-auto max-w-3xl px-6 py-7">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(48,35,79,.06)]">
          <PendingUsers load={pendingUsers} update={setUserStatus} />
        </div>
      </section>
    </main>
  )
}
