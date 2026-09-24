import { useCallback, useEffect, useState } from 'react'
import { toAppError } from '../../../lib/errors'
import type { Analytics } from '../../../types/api'
import { adminApi } from '../admin.api'

const REFRESH_MS = 60_000 // the server caches for 60s too
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

/** Daily history for the charts. Refreshes every minute while the tab is visible, and when the admin comes back to it. */
export const useAnalytics = (days: number) => {
  const [data, setData] = useState<Analytics | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick((value) => value + 1), [])

  useEffect(() => {
    let cancelled = false
    adminApi
      .analytics(days, timeZone)
      .then((result) => {
        if (cancelled) return
        setData(result)
        setError(null)
      })
      .catch((caught) => !cancelled && setError(toAppError(caught).message))
    return () => {
      cancelled = true
    }
  }, [days, tick])

  useEffect(() => {
    const timer = window.setInterval(() => document.visibilityState === 'visible' && reload(), REFRESH_MS)
    window.addEventListener('focus', reload)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', reload)
    }
  }, [reload])

  // Data for another period stays on screen (dimmed by the caller) until the new one arrives.
  const loading = !data || data.range.days !== days
  return { data, error, loading, reload }
}
