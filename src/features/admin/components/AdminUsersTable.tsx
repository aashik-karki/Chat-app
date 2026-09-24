import { Check, Headset, X } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/shadcn/badge'
import { Button } from '@/components/shadcn/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/shadcn/table'
import { cn } from '@/lib/utils'
import { Avatar } from '../../../components/ui/Avatar'
import { toAppError } from '../../../lib/errors'
import type { AccountStatus } from '../../../types/api'
import type { UserSummary } from '../admin.api'

const statusBadgeClass: Record<AccountStatus, string> = {
  pending: 'border-transparent bg-warning/15 text-warning',
  approved: 'border-transparent bg-success/12 text-success',
  rejected: 'border-transparent bg-danger/12 text-danger',
}

const formatJoinedDate = (value?: string) =>
  value ? new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)) : '—'

interface AdminUsersTableProps {
  users: UserSummary['users']
  onDecide: (id: string, status: 'approved' | 'rejected') => Promise<void>
  onMakeAgent: (id: string) => Promise<void>
}

/** Every customer account, newest first: approve/reject pending ones, promote approved ones to agent. */
export function AdminUsersTable({ users, onDecide, onMakeAgent }: AdminUsersTableProps) {
  const [pendingActionId, setPendingActionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const act = async (id: string, action: () => Promise<void>) => {
    setPendingActionId(id)
    setError(null)
    try {
      await action()
    } catch (reason) {
      setError(toAppError(reason).message)
    } finally {
      setPendingActionId(null)
    }
  }

  if (users.length === 0) {
    return <p className="px-1 py-8 text-center text-sm text-muted-foreground">No customer accounts yet.</p>
  }

  return (
    <div>
      {error && (
        <p role="alert" className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="hidden xl:table-cell">Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden lg:table-cell">Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <span className="flex items-center gap-2.5">
                  <Avatar name={user.name} seed={user.id} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium text-foreground">{user.name}</span>
                    <span className="block truncate text-xs text-muted-foreground xl:hidden">{user.email}</span>
                  </span>
                </span>
              </TableCell>
              <TableCell className="hidden text-[13px] text-muted-foreground xl:table-cell">{user.email}</TableCell>
              <TableCell>
                <Badge className={cn('capitalize', statusBadgeClass[user.status])}>{user.status}</Badge>
              </TableCell>
              <TableCell className="hidden text-[13px] whitespace-nowrap text-muted-foreground lg:table-cell">{formatJoinedDate(user.createdAt)}</TableCell>
              <TableCell className="text-right whitespace-nowrap">
                {user.status === 'pending' ? (
                  <span className="inline-flex gap-1.5">
                    <Button
                      size="sm"
                      className="h-7 bg-success px-2.5 text-white hover:bg-success/90"
                      disabled={pendingActionId === user.id}
                      onClick={() => void act(user.id, () => onDecide(user.id, 'approved'))}
                      aria-label={`Approve ${user.name}`}
                    >
                      <Check size={14} />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 border-danger/30 px-2.5 text-danger hover:bg-danger/10 hover:text-danger"
                      disabled={pendingActionId === user.id}
                      onClick={() => void act(user.id, () => onDecide(user.id, 'rejected'))}
                      aria-label={`Reject ${user.name}`}
                    >
                      <X size={14} />
                      Reject
                    </Button>
                  </span>
                ) : user.status === 'approved' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2.5"
                    disabled={pendingActionId === user.id}
                    onClick={() => void act(user.id, () => onMakeAgent(user.id))}
                    aria-label={`Make ${user.name} a support agent`}
                  >
                    <Headset size={14} />
                    Make agent
                  </Button>
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
