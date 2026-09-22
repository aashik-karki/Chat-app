import type { AuthUser, PendingUser } from '../types/auth'

const apiUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
const sessionPath = import.meta.env.VITE_AUTH_SESSION_PATH ?? '/api/v1/auth/me'
const adminUsersPath = import.meta.env.VITE_ADMIN_USERS_PATH ?? '/api/v1/admin/users'
const csrfCookieName = import.meta.env.VITE_CSRF_COOKIE_NAME ?? 'XSRF-TOKEN'
const csrfPath = import.meta.env.VITE_CSRF_PATH ?? '/api/v1/auth/csrf-token'

const csrfFromCookie = () => document.cookie.split('; ').find((cookie) => cookie.startsWith(`${csrfCookieName}=`))?.split('=').slice(1).join('=')

export class ApiError extends Error {
  readonly status: number
  constructor(message: string, status: number) { super(message); this.status = status }
}

type ApiEnvelope<T> = T | { data: T; csrfToken?: string; message?: string }

function unwrap<T>(payload: ApiEnvelope<T>): { data: T; csrfToken?: string } {
  return payload && typeof payload === 'object' && 'data' in payload
    ? payload as { data: T; csrfToken?: string }
    : { data: payload as T }
}

async function request<T>(path: string, init: RequestInit = {}, csrfToken?: string) {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body) headers.set('Content-Type', 'application/json')
  const csrf = csrfToken ?? csrfFromCookie()
  if (csrf) headers.set('X-CSRF-Token', decodeURIComponent(csrf))
  const response = await fetch(`${apiUrl}${path}`, { ...init, headers, credentials: 'include' })
  const payload = response.headers.get('content-type')?.includes('application/json') ? await response.json() : null
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string' ? payload.message : 'Request failed. Please try again.'
    throw new ApiError(message, response.status)
  }
  return unwrap<T>(payload as ApiEnvelope<T>)
}

async function fetchCsrfToken() {
  const response = await fetch(`${apiUrl}${csrfPath}`, { credentials: 'include', headers: { Accept: 'application/json' } })
  const payload = response.headers.get('content-type')?.includes('application/json') ? await response.json() : null
  if (!response.ok) throw new ApiError('Unable to start a secure session. Please refresh and try again.', response.status)
  const value = unwrap<{ csrfToken?: string } | { token?: string }>(payload as ApiEnvelope<{ csrfToken?: string } | { token?: string }>).data
  const token = ('csrfToken' in value ? value.csrfToken : undefined) ?? ('token' in value ? value.token : undefined)
  if (!token) throw new ApiError('The server did not provide a CSRF token.', 500)
  return token
}

const withCsrf = async (csrfToken?: string) => csrfToken ?? csrfFromCookie() ?? fetchCsrfToken()

export const authApi = {
  session: () => request<AuthUser>(sessionPath),
  login: async (email: string, password: string, csrfToken?: string) => request<AuthUser>('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }, await withCsrf(csrfToken)),
  register: async (name: string, email: string, password: string, csrfToken?: string) => request<AuthUser>('/api/v1/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }, await withCsrf(csrfToken)),
  logout: async (csrfToken?: string) => request<null>('/api/v1/auth/logout', { method: 'POST' }, await withCsrf(csrfToken)),
  pendingUsers: (csrfToken?: string) => request<PendingUser[]>(`${adminUsersPath}/pending`, {}, csrfToken),
  setUserStatus: async (id: string, status: 'approved' | 'rejected', csrfToken?: string) => request<AuthUser>(`${adminUsersPath}/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }, await withCsrf(csrfToken)),
}
