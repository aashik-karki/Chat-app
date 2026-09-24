import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { avatarColorClass } from '../../lib/avatarColor'
import { initialsFromName } from '../../lib/name'
import { cn } from '@/lib/utils'
import type { AccountStatus, PendingUser } from '../../types/auth'

const statusBadgeClass: Record<AccountStatus, string> = {
  pending: 'border-transparent bg-amber-50 text-amber-700',
  approved: 'border-transparent bg-emerald-50 text-emerald-700',
  rejected: 'border-transparent bg-rose-50 text-rose-700',
}

const formatJoinedDate = (value?: string) =>
  value ? new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)) : '—'

interface AdminUsersTableProps {
  users: PendingUser[]
  onDecide: (id: string, status: 'approved' | 'rejected') => Promise<void>
}

/** Every regular-user account, most recently joined first, with inline approve/reject actions for pending ones. */
export function AdminUsersTable({ users, onDecide }: AdminUsersTableProps) {
  const [pendingActionId, setPendingActionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const decide = async (id: string, status: 'approved' | 'rejected') => {
    setPendingActionId(id)
    setError(null)
    try {
      await onDecide(id, status)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update this account.')
    } finally {
      setPendingActionId(null)
    }
  }

  if (users.length === 0) {
    return <p className="px-1 py-8 text-center text-sm text-muted-foreground">No user accounts yet.</p>
  }

  return (
    <div>
      {error && <p role="alert" className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <span className="flex items-center gap-2.5">
                  <Avatar className="size-8">
                    <AvatarFallback className={cn('text-[11px] text-white', avatarColorClass(user.id))}>
                      {initialsFromName(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[13px] font-medium text-foreground">{user.name}</span>
                </span>
              </TableCell>
              <TableCell className="text-[13px] text-muted-foreground">{user.email}</TableCell>
              <TableCell>
                <Badge className={cn('capitalize', statusBadgeClass[user.status])}>{user.status}</Badge>
              </TableCell>
              <TableCell className="text-[13px] text-muted-foreground">{formatJoinedDate(user.createdAt)}</TableCell>
              <TableCell className="text-right">
                {user.status === 'pending' ? (
                  <span className="inline-flex gap-1.5">
                    <Button
                      size="sm"
                      className="h-7 bg-emerald-600 px-2.5 text-white hover:bg-emerald-700"
                      disabled={pendingActionId === user.id}
                      onClick={() => void decide(user.id, 'approved')}
                    >
                      <Check size={14} />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 border-rose-200 px-2.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      disabled={pendingActionId === user.id}
                      onClick={() => void decide(user.id, 'rejected')}
                    >
                      <X size={14} />
                      Reject
                    </Button>
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
