import { BellRing, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { useAuthStore } from '../../auth/auth.store'
import { enablePush } from '../push.service'
import { usePushStore } from '../push.store'

const DISMISS_KEY = 'push-prompt-dismissed'

const wasDismissed = () => {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * A gentle, one-time invitation. We never pop the browser's permission dialog on page load
 * (browsers penalise that, and users deny it); the dialog only appears when they click "Turn on".
 */
export const PushPrompt = () => {
  const role = useAuthStore((state) => state.user?.role)
  const { support, permission, subscribed, busy } = usePushStore()
  const [dismissed, setDismissed] = useState(wasDismissed)

  // Shown until enabled or dismissed — also when permission was granted earlier (e.g. by another account on this browser).
  if (dismissed || support !== 'supported' || permission === 'denied' || subscribed) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* private mode: prompt may show again next visit */
    }
  }

  return (
    <div className="flex items-center gap-3 border-b border-line bg-primary/5 px-4 py-2.5 text-sm sm:px-6" role="region" aria-label="Notification settings">
      <BellRing size={16} className="shrink-0 text-primary" />
      <p className="min-w-0 flex-1 text-fg">
        {role === 'user' ? 'Get notified when support replies, even if this tab is closed.' : 'Get notified about new customer messages, even if this tab is closed.'}
      </p>
      <Button size="sm" loading={busy} onClick={() => void enablePush()}>
        Turn on
      </Button>
      <button type="button" aria-label="Not now" className="text-subtle hover:text-fg" onClick={dismiss}>
        <X size={16} />
      </button>
    </div>
  )
}
