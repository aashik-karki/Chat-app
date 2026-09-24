import { useEffect, type ReactNode } from 'react'
import { useAuthStore } from '../features/auth/auth.store'
import { realtime } from '../lib/socket'
import { useConnectionStore } from '../stores/connection.store'
import { toast } from '../stores/toast.store'

/**
 * Opens the socket while someone is logged in and closes it on logout.
 * Also tracks the browser's own online/offline events, so the UI can say
 * "you are offline" instantly instead of waiting for a socket timeout.
 */
export const RealtimeProvider = ({ children }: { children: ReactNode }) => {
  const status = useAuthStore((state) => state.status)

  useEffect(() => {
    const update = () => useConnectionStore.getState().set({ browserOnline: navigator.onLine })
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  useEffect(() => {
    if (status !== 'authenticated') {
      realtime.disconnect()
      return
    }
    realtime.onAuthFailure(() => {
      useAuthStore.getState().sessionExpired()
      toast.error('Your session has ended. Please sign in again.')
    })
    realtime.connect()
    return () => realtime.disconnect()
  }, [status])

  return children
}
