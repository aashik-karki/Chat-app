import { create } from 'zustand'
import { AppError, toAppError } from '../../lib/errors'
import { setCsrfToken } from '../../lib/http'
import type { User } from '../../types/api'
import { authApi } from './auth.api'

type AuthStatus = 'checking' | 'anonymous' | 'authenticated'

/** Work that must happen while the session is still valid (e.g. removing this browser's push subscription). */
const beforeLogoutHooks: Array<() => Promise<void>> = []
export const onBeforeLogout = (hook: () => Promise<void>) => {
  beforeLogoutHooks.push(hook)
}

interface AuthState {
  status: AuthStatus
  user: User | null
  /** The just-registered account, shown on the "waiting for approval" screen. */
  pendingAccount: User | null
  restore: () => Promise<void>
  login: (email: string, password: string) => Promise<User>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  /** Session died elsewhere (expired, logged out in another tab, socket refused). */
  sessionExpired: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'checking',
  user: null,
  pendingAccount: null,

  restore: async () => {
    try {
      const { user } = await authApi.me()
      set({ status: 'authenticated', user })
    } catch (error) {
      // 401 is the normal "not logged in" answer; network errors also land here.
      set({ status: 'anonymous', user: null })
      if (!(error instanceof AppError && error.status === 401)) throw error
    }
  },

  login: async (email, password) => {
    try {
      const user = await authApi.login(email, password)
      set({ status: 'authenticated', user, pendingAccount: null })
      return user
    } catch (error) {
      throw toAppError(error)
    }
  },

  register: async (name, email, password) => {
    const user = await authApi.register(name, email, password)
    set({ pendingAccount: user })
  },

  logout: async () => {
    try {
      await Promise.allSettled(beforeLogoutHooks.map((hook) => hook()))
      await authApi.logout()
    } finally {
      set({ status: 'anonymous', user: null })
    }
  },

  sessionExpired: () => {
    setCsrfToken(null)
    set({ status: 'anonymous', user: null })
  },
}))

/** Where each role lands after login. */
export const homePathFor = (user: Pick<User, 'role'>) => (user.role === 'admin' ? '/admin' : user.role === 'agent' ? '/inbox' : '/chat')
