import { useEffect } from 'react'
import { RouterProvider } from 'react-router'
import { Toaster } from '../components/ui/Toaster'
import { onBeforeLogout, useAuthStore } from '../features/auth/auth.store'
import { disablePush, syncPushAfterLogin } from '../features/push/push.service'
import { toAppError } from '../lib/errors'
import { toast } from '../stores/toast.store'
import { RealtimeProvider } from './RealtimeProvider'
import { router } from './router'

// A shared computer: the next person must not get the previous user's notifications.
onBeforeLogout(() => disablePush({ quiet: true }))

export const App = () => {
  useEffect(() => {
    useAuthStore
      .getState()
      .restore()
      .catch((error) => toast.error(toAppError(error).message, { label: 'Retry', run: () => window.location.reload() }))
  }, [])

  // Whoever signs in owns this browser's existing push subscription.
  useEffect(
    () =>
      useAuthStore.subscribe((state, previous) => {
        if (state.user && state.user.id !== previous.user?.id) void syncPushAfterLogin()
      }),
    [],
  )

  return (
    <RealtimeProvider>
      <RouterProvider router={router} />
      <Toaster />
    </RealtimeProvider>
  )
}
