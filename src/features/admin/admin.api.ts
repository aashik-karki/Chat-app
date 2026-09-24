import { http } from '../../lib/http'
import type { Analytics, MetricsUpdate, User } from '../../types/api'

export interface UserSummary {
  total: number
  pending: number
  approved: number
  rejected: number
  users: Required<Pick<User, 'id' | 'name' | 'email' | 'role' | 'status' | 'createdAt'>>[]
}

export const adminApi = {
  /** Counts by status + the newest 200 customer accounts. */
  userSummary: () => http.get<UserSummary>('/api/v1/admin/users/summary'),
  decide: (userId: string, status: 'approved' | 'rejected') => http.patch<{ user: User }>(`/api/v1/admin/users/${userId}/approval`, { status }),
  setRole: (userId: string, role: 'user' | 'agent') => http.patch<{ user: User }>(`/api/v1/admin/users/${userId}/role`, { role }),
  metrics: () => http.get<MetricsUpdate>('/api/v1/metrics/overview'),
  /** Daily messages for the last `days` days (+ the period before), in the browser's time zone. */
  analytics: (days: number, timeZone: string) => http.get<Analytics>(`/api/v1/metrics/analytics?days=${days}&tz=${encodeURIComponent(timeZone)}`),
}
