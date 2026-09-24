import type { PendingUser } from '../types/auth'
import { request } from './httpClient'

const adminUsersPath = import.meta.env.VITE_ADMIN_USERS_PATH ?? '/api/v1/admin/users'

export interface UserSummary {
  total: number
  pending: number
  approved: number
  rejected: number
  users: PendingUser[]
}

export const adminApi = {
  /** Dashboard data: account counts by status, plus every regular-user account (most recently joined first). */
  getUserSummary: async (): Promise<UserSummary> => {
    const result = await request<UserSummary>(`${adminUsersPath}/summary`)
    return result.data
  },
}
