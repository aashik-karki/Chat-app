import { useEffect, useState } from 'react'
import { toAppError } from '../../../lib/errors'
import { realtime } from '../../../lib/socket'
import { useConnectionStore } from '../../../stores/connection.store'
import type { MetricsUpdate } from '../../../types/api'
import { adminApi } from '../admin.api'

/**
 * Live dashboard metrics: first load over REST (works before the socket is up),
 * then `metrics:update` pushes every ~5s. Re-subscribes after every reconnect.
 */
export const useLiveMetrics = () => {
  const [data, setData] = useState<MetricsUpdate | null>(null)
  const [error, setError] = useState<string | null>(null)
  const connected = useConnectionStore((state) => state.status === 'connected')

  useEffect(() => {
    let cancelled = false
    adminApi
      .metrics()
      .then((update) => !cancelled && setData(update))
      .catch((caught) => !cancelled && setError(toAppError(caught).message))
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!connected) return
    const off = realtime.on('metrics:update', (update) => {
      setData(update)
      setError(null)
    })
    realtime
      .emitWithAck<MetricsUpdate>('metrics:subscribe', {})
      .then((update) => setData(update))
      .catch((caught) => setError(toAppError(caught).message))
    return () => {
      off()
      realtime.emitWithAck('metrics:unsubscribe', {}).catch(() => undefined)
    }
  }, [connected])

  return { data, error, live: connected }
}
