import { Bell, BellOff, BellRing } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button, IconButton } from '../../../components/ui/Button'
import { cn } from '../../../lib/cn'
import { disablePush, enablePush, refreshPushState } from '../push.service'
import { usePushStore } from '../push.store'

/** Header bell: shows the notification state and the one action that makes sense for it. */
export const PushToggle = () => {
  const { support, permission, subscribed, busy, serverError } = usePushStore()
  const [open, setOpen] = useState(false)
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    void refreshPushState() // permission may have changed in browser settings
    const close = (event: MouseEvent) => !panel.current?.contains(event.target as Node) && setOpen(false)
    const escape = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  const on = support === 'supported' && permission === 'granted' && subscribed
  const blocked = permission === 'denied'
  const Icon = on ? BellRing : blocked || support !== 'supported' ? BellOff : Bell

  let title = 'Notifications'
  let body: string
  let action: React.ReactNode = null
  if (support === 'ios-needs-install') {
    title = 'Add to Home Screen first'
    body = 'On iPhone and iPad, notifications only work for apps on your Home Screen: tap the Share button, choose “Add to Home Screen”, then open HelpDesk from there.'
  } else if (support === 'insecure') {
    body = 'Notifications need a secure (https) connection.'
  } else if (support === 'unsupported') {
    body = 'This browser can’t show web notifications. Try a recent Chrome, Edge, Firefox or Safari.'
  } else if (blocked) {
    title = 'Notifications are blocked'
    body = 'You blocked notifications for this site. To allow them, click the icon next to the address bar, open Site settings → Notifications → Allow, then reload the page.'
  } else if (serverError) {
    body = serverError
  } else if (on) {
    title = 'Notifications are on'
    body = 'You’ll get an alert for new messages when this tab is in the background or closed.'
    action = (
      <Button size="sm" variant="secondary" loading={busy} onClick={() => void disablePush()}>
        Turn off
      </Button>
    )
  } else {
    title = 'Get notified'
    body = 'Get an alert for new messages when this tab is in the background or closed.'
    action = (
      <Button size="sm" loading={busy} onClick={() => void enablePush()}>
        Turn on notifications
      </Button>
    )
  }

  return (
    <div className="relative" ref={panel}>
      <IconButton label={on ? 'Notifications on' : 'Notifications'} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <Icon size={18} className={cn(on && 'text-primary')} />
      </IconButton>
      {open && (
        <div role="dialog" aria-label={title} className="absolute right-0 z-30 mt-2 w-80 rounded-2xl border border-line bg-surface p-4 shadow-xl">
          <p className="font-semibold text-fg">{title}</p>
          <p className="mt-1 text-sm text-muted">{body}</p>
          {action && <div className="mt-3">{action}</div>}
        </div>
      )}
    </div>
  )
}
