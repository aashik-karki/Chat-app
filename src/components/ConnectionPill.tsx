import { Wifi, WifiOff } from 'lucide-react'
import { cn } from '../lib/cn'
import { useConnectionStore } from '../stores/connection.store'

/** Small live/reconnecting indicator for headers. */
export const ConnectionPill = () => {
  const status = useConnectionStore((state) => state.status)
  const attempt = useConnectionStore((state) => state.attempt)
  const browserOnline = useConnectionStore((state) => state.browserOnline)

  const offline = !browserOnline || status === 'offline'
  const label = offline
    ? 'Offline'
    : status === 'connected'
      ? 'Live'
      : status === 'reconnecting'
        ? attempt > 0
          ? `Reconnecting (${attempt})`
          : 'Reconnecting'
        : 'Connecting'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        status === 'connected' && !offline ? 'bg-success/12 text-success' : offline ? 'bg-danger/12 text-danger' : 'bg-warning/15 text-warning',
      )}
      role="status"
      aria-live="polite"
    >
      {offline ? <WifiOff size={13} /> : <Wifi size={13} className={status === 'connected' ? '' : 'animate-pulse'} />}
      {label}
    </span>
  )
}

/** Full-width banner shown while messages can't be sent in real time. */
export const ConnectionBanner = () => {
  const status = useConnectionStore((state) => state.status)
  const browserOnline = useConnectionStore((state) => state.browserOnline)
  if (status === 'connected' && browserOnline) return null
  if (status === 'idle' || status === 'connecting') return null
  return (
    <div className="flex items-center justify-center gap-2 bg-warning/15 px-4 py-1.5 text-xs font-medium text-warning" role="status">
      <WifiOff size={14} />
      {browserOnline ? 'Connection lost. Reconnecting… Messages you send will go out when it comes back.' : 'You are offline. Messages will be sent when you reconnect.'}
    </div>
  )
}
