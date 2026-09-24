import { Check, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Avatar } from '../../../components/ui/Avatar'
import { cn } from '../../../lib/cn'
import { toAppError } from '../../../lib/errors'
import { formatAgo } from '../../../lib/time'
import { toast } from '../../../stores/toast.store'
import type { UserSummary } from '../admin.api'
import { DashboardCard } from './DashboardCard'

const SHOWN = 5

/** Newest sign-ups waiting for approval, with one-click Approve / Reject. */
export const PendingApprovals = ({ users, loading, onDecide }: { users: UserSummary['users']; loading: boolean; onDecide: (id: string, status: 'approved' | 'rejected') => Promise<void> }) => {
  const [busy, setBusy] = useState<string | null>(null)
  const pending = users.filter((user) => user.status === 'pending')

  const decide = async (id: string, status: 'approved' | 'rejected') => {
    setBusy(id)
    try {
      await onDecide(id, status)
    } catch (error) {
      toast.error(toAppError(error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <DashboardCard
      title={
        <span className="flex items-center gap-2.5">
          Pending Approvals
          {pending.length > 0 && <span className="rounded-lg bg-chart-3/12 px-2 py-0.5 text-xs font-semibold text-chart-3">{pending.length}</span>}
        </span>
      }
      action={
        <Link to="/admin#customers" className="text-sm font-medium text-primary hover:underline">
          View all
        </Link>
      }
    >
      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-surface-2" />
          ))}
        </div>
      ) : pending.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">No one is waiting. New sign-ups show up here.</p>
      ) : (
        <ul className="-my-2 flex flex-col">
          {pending.slice(0, SHOWN).map((user) => (
            <li key={user.id} className="flex items-center gap-3 border-b border-line py-3 last:border-b-0">
              <Avatar name={user.name} seed={user.id} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-fg">{user.name}</p>
                <p className="truncate text-xs text-muted">
                  {user.email} · {formatAgo(user.createdAt)}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Reject ${user.name}`}
                title="Reject"
                disabled={busy === user.id}
                onClick={() => void decide(user.id, 'rejected')}
                className="grid size-9 shrink-0 place-items-center rounded-xl border border-line text-muted transition-colors hover:border-danger/40 hover:text-danger disabled:opacity-50"
              >
                <X size={15} />
              </button>
              <button
                type="button"
                disabled={busy === user.id}
                onClick={() => void decide(user.id, 'approved')}
                className={cn('inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-primary-soft px-3 text-[13px] font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-fg disabled:opacity-50')}
              >
                <Check size={14} aria-hidden="true" />
                Approve
              </button>
            </li>
          ))}
        </ul>
      )}
      {pending.length > SHOWN && <p className="text-xs text-muted">+{pending.length - SHOWN} more in Customers below</p>}
    </DashboardCard>
  )
}
