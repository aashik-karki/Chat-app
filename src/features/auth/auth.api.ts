import { http, setCsrfToken } from '../../lib/http'
import type { User } from '../../types/api'

export const authApi = {
  me: () => http.get<{ user: User }>('/api/v1/auth/me'),

  login: async (email: string, password: string) => {
    const result = await http.post<{ user: User; csrfToken: string }>('/api/v1/auth/login', { email, password })
    // Login rotates the session, so the old CSRF token is dead: use the new one.
    setCsrfToken(result.csrfToken)
    return result.user
  },

  register: (name: string, email: string, password: string) =>
    http.post<{ user: User }>('/api/v1/auth/register', { name, email, password }).then((result) => result.user),

  logout: async () => {
    await http.post<null>('/api/v1/auth/logout')
    setCsrfToken(null)
  },
}
