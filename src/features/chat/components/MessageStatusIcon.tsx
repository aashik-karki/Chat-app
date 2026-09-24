import { AlertCircle, Check, CheckCheck, Clock3 } from 'lucide-react'
import { cn } from '../../../lib/cn'
import type { DisplayStatus } from '../chat.types'

const labels: Record<DisplayStatus, string> = {
  sending: 'Sending',
  failed: 'Not sent',
  sent: 'Sent',
  delivered: 'Delivered',
  read: 'Read',
}

/** ⏱ sending · ✓ sent · ✓✓ delivered · ✓✓ (blue) read · ⚠ failed */
export const MessageStatusIcon = ({ status, className }: { status: DisplayStatus; className?: string }) => {
  const common = cn('shrink-0', className)
  const icon =
    status === 'sending' ? (
      <Clock3 size={13} className={common} />
    ) : status === 'failed' ? (
      <AlertCircle size={14} className={cn(common, 'text-danger')} />
    ) : status === 'sent' ? (
      <Check size={14} className={common} />
    ) : (
      <CheckCheck size={14} className={cn(common, status === 'read' && 'text-sky-300')} />
    )
  return (
    <span role="img" aria-label={labels[status]} title={labels[status]} className="inline-flex">
      {icon}
    </span>
  )
}
