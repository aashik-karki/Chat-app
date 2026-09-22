import { useEffect, useState } from 'react'
import type { PendingUser } from '../types/auth'

interface Props {
  load: () => Promise<PendingUser[]>
  update: (id: string, status: 'approved' | 'rejected') => Promise<void>
}

export function PendingUsers({ load, update }: Props) {
  const [users, setUsers] = useState<PendingUser[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void load()
      .then(setUsers)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load pending users.'))
  }, [load])

  const decide = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await update(id, status)
      setUsers((current) => current.filter((user) => user.id !== id))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update this account.')
    }
  }

  return (
    <section>
      <h2 className="m-0 mb-4 text-sm font-bold text-slate-800">Pending accounts</h2>

      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
          {error}
        </p>
      )}

      {users.length === 0 ? (
        <p className="text-xs text-slate-400">No accounts are awaiting review.</p>
      ) : (
        <ul className="flex flex-col">
          {users.map((user) => (
            <li key={user.id} className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-b-0">
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-[13px] font-semibold text-slate-800">{user.name}</strong>
                <small className="block truncate text-[11px] text-slate-400">{user.email}</small>
              </span>
              <button
                type="button"
                className="rounded-md bg-emerald-600 px-3 py-2 text-[10.5px] font-semibold text-white transition-colors hover:bg-emerald-700"
                onClick={() => void decide(user.id, 'approved')}
              >
                Approve
              </button>
              <button
                type="button"
                className="rounded-md bg-rose-500 px-3 py-2 text-[10.5px] font-semibold text-white transition-colors hover:bg-rose-600"
                onClick={() => void decide(user.id, 'rejected')}
              >
                Reject
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
