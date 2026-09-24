import { Navigate, Outlet, useLocation, useParams } from 'react-router'
import { PageSpinner } from '../components/ui/Spinner'
import { homePathFor, useAuthStore } from '../features/auth/auth.store'
import type { Role } from '../types/api'

/** Route guard: must be logged in, and (optionally) have one of `roles`. */
export const RequireAuth = ({ roles }: { roles?: Role[] }) => {
  const status = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)
  const location = useLocation()

  if (status === 'checking') return <PageSpinner label="Checking your session" />
  if (status !== 'authenticated' || !user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (roles && !roles.includes(user.role)) return <Navigate to={homePathFor(user)} replace />
  return <Outlet />
}

/** Login/register pages: bounce logged-in users to their home. */
export const GuestOnly = () => {
  const status = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)
  if (status === 'checking') return <PageSpinner label="Checking your session" />
  if (status === 'authenticated' && user) return <Navigate to={homePathFor(user)} replace />
  return <Outlet />
}

export const HomeRedirect = () => {
  const user = useAuthStore((state) => state.user)
  return <Navigate to={user ? homePathFor(user) : '/login'} replace />
}

/** Push-notification links are /chat/:conversationId: staff open it in the inbox, customers in their chat. */
export const ConversationLinkRedirect = () => {
  const user = useAuthStore((state) => state.user)
  const { conversationId } = useParams()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={user.role === 'user' ? '/chat' : `/inbox/${conversationId}`} replace />
}
