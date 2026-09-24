import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

/**
 * Blocks rendering until the initial session check (GET /auth/me) resolves,
 * so a page never briefly flashes as "signed out" on a hard refresh.
 */
function useSettledAuth() {
  const state = useAuthStore((store) => store.state)
  const user = useAuthStore((store) => store.user)
  return { state, user, settled: state !== 'checking' }
}

/** Renders children only for an approved, signed-in user; otherwise redirects. */
export function RequireApprovedUser({ children }: { children: ReactNode }) {
  const { state, settled } = useSettledAuth()
  if (!settled) return <AuthCheckingScreen />
  if (state !== 'authenticated') return <Navigate to="/login" replace />
  return <>{children}</>
}

/** Renders children only for an approved admin; otherwise redirects. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { state, user, settled } = useSettledAuth()
  if (!settled) return <AuthCheckingScreen />
  if (state !== 'authenticated') return <Navigate to="/login" replace />
  if (user?.role !== 'admin') return <Navigate to="/" replace />
  return <>{children}</>
}

/** Keeps an already signed-in user off the login screen, landing them on their own dashboard: admins go to /admin, everyone else to the chat at /. */
export function RedirectIfSignedIn({ children }: { children: ReactNode }) {
  const { state, user, settled } = useSettledAuth()
  if (!settled) return <AuthCheckingScreen />
  if (state === 'authenticated') return <Navigate to={user?.role === 'admin' ? '/admin' : '/'} replace />
  return <>{children}</>
}

function AuthCheckingScreen() {
  return (
    <main className="grid min-h-svh place-items-center bg-slate-50 p-6">
      <p className="text-xs font-semibold text-slate-500">Checking your session…</p>
    </main>
  )
}
