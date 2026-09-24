import type { AuthUser } from '../types/auth'
import { request, withCsrf } from './httpClient'

const sessionPath = import.meta.env.VITE_AUTH_SESSION_PATH ?? '/api/v1/auth/me'
const adminUsersPath = import.meta.env.VITE_ADMIN_USERS_PATH ?? '/api/v1/admin/users'

// The backend wraps auth responses as `{ user: {...} }` rather than the
// generic `{ data: ... }` envelope `request` otherwise understands, so these
// calls unwrap that one extra layer themselves.
const unwrapUser = (result: { data: { user: AuthUser }; csrfToken?: string }) => ({ data: result.data.user, csrfToken: result.csrfToken })

export const authApi = {
  session: async () => unwrapUser(await request<{ user: AuthUser }>(sessionPath)),
  login: async (email: string, password: string, csrfToken?: string) =>
    unwrapUser(await request<{ user: AuthUser }>('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }, await withCsrf(csrfToken))),
  register: async (name: string, email: string, password: string, csrfToken?: string) =>
    unwrapUser(await request<{ user: AuthUser }>('/api/v1/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }, await withCsrf(csrfToken))),
  logout: async (csrfToken?: string) => request<null>('/api/v1/auth/logout', { method: 'POST' }, await withCsrf(csrfToken)),
  setUserStatus: async (id: string, status: 'approved' | 'rejected', csrfToken?: string) =>
    unwrapUser(await request<{ user: AuthUser }>(`${adminUsersPath}/${id}/approval`, { method: 'PATCH', body: JSON.stringify({ status }) }, await withCsrf(csrfToken))),
}

export { ApiError } from './httpClient'
