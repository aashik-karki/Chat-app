import { create } from 'zustand'
import { ApiError, authApi } from '../lib/api'
import { useChatStore } from './chatStore'
import type { AuthUser } from '../types/auth'

type AuthState = 'checking' | 'anonymous' | 'authenticated' | 'pending'

interface AuthStore {
  state: AuthState
  user: AuthUser | null
  csrfToken: string | null
  error: string | null
  restore: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  setUserStatus: (id: string, status: 'approved' | 'rejected') => Promise<void>
}

const applyUser = (user: AuthUser, csrfToken?: string) => ({ user, csrfToken: csrfToken ?? null, state: user.status === 'approved' ? 'authenticated' as const : 'pending' as const })

export const useAuthStore = create<AuthStore>((set, get) => ({
  state: 'checking', user: null, csrfToken: null, error: null,
  restore: async () => {
    try { const result = await authApi.session(); set({ ...applyUser(result.data, result.csrfToken), error: null }) }
    catch (error) { set({ state: 'anonymous', user: null, csrfToken: null, error: error instanceof ApiError && error.status !== 401 ? error.message : null }) }
  },
  login: async (email, password) => {
    set({ error: null })
    try { const result = await authApi.login(email, password, get().csrfToken ?? undefined); set(applyUser(result.data, result.csrfToken)) }
    catch (error) { const message = error instanceof Error ? error.message : 'Unable to sign in.'; set({ state: 'anonymous', error: message }); throw error }
  },
  register: async (name, email, password) => {
    set({ error: null })
    try { const result = await authApi.register(name, email, password, get().csrfToken ?? undefined); set({ ...applyUser(result.data, result.csrfToken), state: 'pending' }) }
    catch (error) { const message = error instanceof Error ? error.message : 'Unable to register.'; set({ error: message }); throw error }
  },
  logout: async () => { try { await authApi.logout(get().csrfToken ?? undefined) } finally { set({ state: 'anonymous', user: null, csrfToken: null, error: null }); useChatStore.getState().reset() } },
  setUserStatus: async (id, status) => { await authApi.setUserStatus(id, status, get().csrfToken ?? undefined) },
}))
