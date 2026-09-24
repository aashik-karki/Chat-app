import { API_URL } from './env'
import { AppError, friendlyMessage } from './errors'

/**
 * REST client for the session-cookie + CSRF backend.
 * - always sends cookies (credentials: 'include')
 * - keeps the CSRF token in memory and attaches it to unsafe requests
 * - if the token went stale (e.g. server restart), fetches a new one and retries ONCE
 * - every failure becomes an AppError with a backend error code + friendly message
 */
let csrfToken: string | null = null
let csrfRequest: Promise<string> | null = null

export const setCsrfToken = (token: string | null) => {
  csrfToken = token
}

const REQUEST_TIMEOUT_MS = 15_000

const fetchCsrfToken = async (): Promise<string> => {
  csrfRequest ??= (async () => {
    const response = await rawFetch('GET', '/api/v1/auth/csrf-token')
    const token = (response as { csrfToken?: string }).csrfToken
    if (!token) throw new AppError('INTERNAL_ERROR', 'The server did not return a security token.')
    csrfToken = token
    return token
  })().finally(() => {
    csrfRequest = null
  })
  return csrfRequest
}

const rawFetch = async (method: string, path: string, body?: unknown, extraHeaders?: Record<string, string>): Promise<unknown> => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      credentials: 'include',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...extraHeaders,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch (error) {
    const code = (error as Error).name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR'
    throw new AppError(code, friendlyMessage(code))
  } finally {
    clearTimeout(timer)
  }

  if (response.status === 204) return null
  const isJson = response.headers.get('content-type')?.includes('application/json')
  const payload: unknown = isJson ? await response.json().catch(() => null) : null

  if (!response.ok) {
    const error = (payload as { error?: { code?: string; message?: string; details?: unknown } } | null)?.error
    const code = error?.code ?? (response.status >= 500 ? 'INTERNAL_ERROR' : `HTTP_${response.status}`)
    throw new AppError(code, friendlyMessage(code, error?.message), response.status, error?.details)
  }
  return payload
}

const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export const request = async <T>(method: string, path: string, body?: unknown): Promise<T> => {
  const send = async () => {
    const headers = UNSAFE.has(method) ? { 'X-CSRF-Token': csrfToken ?? (await fetchCsrfToken()) } : undefined
    return rawFetch(method, path, body, headers) as Promise<T>
  }
  try {
    return await send()
  } catch (error) {
    if (error instanceof AppError && error.code === 'CSRF_TOKEN_INVALID') {
      csrfToken = null
      await fetchCsrfToken()
      return send()
    }
    throw error
  }
}

export const http = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body ?? {}),
  delete: <T>(path: string, body?: unknown) => request<T>('DELETE', path, body),
}

/** Downloads a file from an authenticated GET endpoint (e.g. chat export). */
export const downloadFile = async (path: string, fallbackName: string) => {
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, { credentials: 'include' })
  } catch {
    throw new AppError('NETWORK_ERROR', friendlyMessage('NETWORK_ERROR'))
  }
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null
    const code = payload?.error?.code ?? `HTTP_${response.status}`
    throw new AppError(code, friendlyMessage(code, payload?.error?.message), response.status)
  }
  const name = /filename="([^"]+)"/.exec(response.headers.get('content-disposition') ?? '')?.[1] ?? fallbackName
  const url = URL.createObjectURL(await response.blob())
  const link = Object.assign(document.createElement('a'), { href: url, download: name })
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
