// Shared fetch plumbing for every backend call the app makes (auth, admin,
// conversations, messages) — kept in one place so each API module only has
// to describe its own endpoints, not how to call the server.

const apiUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
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

export async function request<T>(path: string, init: RequestInit = {}, csrfToken?: string) {
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

/** Resolves a CSRF token for a state-changing request: whatever's passed in, else the cookie, else fetched fresh. */
export const withCsrf = async (csrfToken?: string) => csrfToken ?? csrfFromCookie() ?? fetchCsrfToken()
