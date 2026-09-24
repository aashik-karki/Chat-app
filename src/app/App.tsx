import { useEffect } from 'react'
import { RouterProvider } from 'react-router'
import { Toaster } from '../components/ui/Toaster'
import { useAuthStore } from '../features/auth/auth.store'
import { toAppError } from '../lib/errors'
import { toast } from '../stores/toast.store'
import { RealtimeProvider } from './RealtimeProvider'
import { router } from './router'

export const App = () => {
  useEffect(() => {
    useAuthStore
      .getState()
      .restore()
      .catch((error) => toast.error(toAppError(error).message, { label: 'Retry', run: () => window.location.reload() }))
  }, [])

  return (
    <RealtimeProvider>
      <RouterProvider router={router} />
      <Toaster />
    </RealtimeProvider>
  )
}
