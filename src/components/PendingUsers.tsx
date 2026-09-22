import { useEffect, useState } from 'react'
import type { PendingUser } from '../types/auth'

export function PendingUsers({ load, update }: { load: () => Promise<PendingUser[]>; update: (id: string, status: 'approved' | 'rejected') => Promise<void> }) {
  const [users, setUsers] = useState<PendingUser[]>([])
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { void load().then(setUsers).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load pending users.')) }, [load])
  const decide = async (id: string, status: 'approved' | 'rejected') => { try { await update(id, status); setUsers((current) => current.filter((user) => user.id !== id)) } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to update this account.') } }
  return <section className="pending-users"><h2>Pending accounts</h2>{error && <p>{error}</p>}{users.length === 0 ? <p>No accounts are awaiting review.</p> : users.map((user) => <div key={user.id}><span><strong>{user.name}</strong><small>{user.email}</small></span><button onClick={() => void decide(user.id, 'approved')}>Approve</button><button className="reject" onClick={() => void decide(user.id, 'rejected')}>Reject</button></div>)}</section>
}
