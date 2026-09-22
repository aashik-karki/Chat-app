export type AccountStatus = 'pending' | 'approved' | 'rejected'
export type UserRole = 'admin' | 'agent' | 'user' | string

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  status: AccountStatus
}

export interface PendingUser extends AuthUser {
  createdAt?: string
}
