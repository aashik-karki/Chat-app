import { AuthScreen } from '../components/AuthScreen'
import { useAuthStore } from '../store/authStore'

/**
 * Hosts sign-in/registration at /login. `RedirectIfSignedIn` (routes/guards)
 * already keeps an authenticated user off this route, so this page only
 * needs to render the anonymous and pending-approval views.
 */
export function LoginPage() {
  const authState = useAuthStore((state) => state.state)
  const authUser = useAuthStore((state) => state.user)
  const authError = useAuthStore((state) => state.error)
  const login = useAuthStore((state) => state.login)
  const register = useAuthStore((state) => state.register)

  return (
    <AuthScreen
      error={authError}
      pendingUser={authState === 'pending' ? authUser : null}
      onLogin={login}
      onRegister={register}
    />
  )
}
