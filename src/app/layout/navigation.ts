import { BookOpen, Headset, Inbox, LayoutDashboard, type LucideIcon, Users } from 'lucide-react'
import type { User } from '../../types/api'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  /** Opens in a new tab (e.g. the backend's API docs). */
  external?: boolean
  /** Show the inbox unread count next to it. */
  unreadBadge?: boolean
}

export interface NavSection {
  title?: string
  items: NavItem[]
}

/** Sidebar entries per role. Links with a #hash scroll to that part of the page. */
export const navigationFor = (role: User['role']): NavSection[] => {
  if (role === 'admin')
    return [
      {
        items: [
          { label: 'Dashboard', to: '/admin', icon: LayoutDashboard },
          { label: 'Inbox', to: '/inbox', icon: Inbox, unreadBadge: true },
        ],
      },
      {
        title: 'Manage',
        items: [
          { label: 'Agents', to: '/admin#agents', icon: Headset },
          { label: 'Customers', to: '/admin#customers', icon: Users },
        ],
      },
      { title: 'Developers', items: [{ label: 'API docs', to: '/api/docs', icon: BookOpen, external: true }] },
    ]
  if (role === 'agent') return [{ items: [{ label: 'Inbox', to: '/inbox', icon: Inbox, unreadBadge: true }] }]
  return []
}
