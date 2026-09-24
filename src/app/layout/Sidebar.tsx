import { ExternalLink, LogOut, PanelLeft, X } from 'lucide-react'
import { useMemo } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { Avatar } from '../../components/ui/Avatar'
import { IconButton } from '../../components/ui/Button'
import { cn } from '../../lib/cn'
import { useAuthStore } from '../../features/auth/auth.store'
import { useChatStore } from '../../features/chat/chat.store'
import { BrandMark } from './BrandMark'
import { navigationFor, type NavItem } from './navigation'

const roleLabel = { admin: 'Admin', agent: 'Support agent', user: 'Customer' } as const

interface SidebarProps {
  /** Icon-only rail (desktop). */
  collapsed: boolean
  onToggleCollapsed: () => void
  /** Rendered inside the mobile drawer: shows a close button instead of the collapse toggle. */
  onClose?: () => void
  onSignOut: () => void
}

const itemClass = (active: boolean, collapsed: boolean) =>
  cn(
    'flex h-11 items-center gap-3 rounded-xl text-[15px] font-medium transition-colors',
    collapsed ? 'justify-center px-0' : 'px-3.5',
    active ? 'bg-primary-soft text-primary' : 'text-fg/85 hover:bg-surface-2 hover:text-fg',
  )

/** Unread messages in conversations assigned to me (admins: all). */
const useInboxUnread = () => {
  const me = useAuthStore((state) => state.user)
  const conversations = useChatStore((state) => state.conversations)
  return useMemo(
    () => Object.values(conversations).reduce((sum, c) => (me && (me.role === 'admin' || c.assignedAgentId === me.id) ? sum + c.unreadCount : sum), 0),
    [conversations, me],
  )
}

const NavEntry = ({ item, collapsed, unread, onNavigate }: { item: NavItem; collapsed: boolean; unread: number; onNavigate?: () => void }) => {
  const location = useLocation()
  const Icon = item.icon
  const badge = item.unreadBadge && unread > 0 ? (unread > 99 ? '99+' : String(unread)) : null
  const content = (
    <>
      <span className="relative shrink-0">
        <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
        {collapsed && badge && <span className="absolute -top-1 -right-1.5 size-2.5 rounded-full bg-primary ring-2 ring-surface" aria-hidden="true" />}
      </span>
      {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
      {!collapsed && item.external && <ExternalLink size={14} className="text-subtle" aria-hidden="true" />}
      {!collapsed && badge && <span className="rounded-lg bg-success-soft px-2 py-0.5 text-xs font-semibold text-success-strong">{badge}</span>}
    </>
  )
  const label = collapsed ? { 'aria-label': badge ? `${item.label}, ${badge} unread` : item.label, title: item.label } : badge ? { 'aria-label': `${item.label}, ${badge} unread` } : {}

  if (item.external)
    return (
      <a href={item.to} target="_blank" rel="noreferrer" className={itemClass(false, collapsed)} onClick={onNavigate} {...label}>
        {content}
      </a>
    )
  // Hash links ("/admin#agents") scroll within a page: never shown as the current page.
  if (item.to.includes('#'))
    return (
      <Link to={item.to} className={itemClass(location.pathname + location.hash === item.to, collapsed)} onClick={onNavigate} {...label}>
        {content}
      </Link>
    )
  return (
    <NavLink to={item.to} end={false} className={({ isActive }) => itemClass(isActive && !location.hash, collapsed)} onClick={onNavigate} {...label}>
      {content}
    </NavLink>
  )
}

/** Left navigation for staff (admins and agents). Desktop: fixed column or icon rail. Mobile: inside a drawer. */
export const Sidebar = ({ collapsed, onToggleCollapsed, onClose, onSignOut }: SidebarProps) => {
  const user = useAuthStore((state) => state.user)!
  const unread = useInboxUnread()
  const sections = navigationFor(user.role)

  return (
    <nav aria-label="Main" className="flex h-full flex-col bg-surface">
      <div className={cn('flex h-[72px] shrink-0 items-center border-b border-line', collapsed ? 'justify-center px-2' : 'justify-between pr-3 pl-5')}>
        {!collapsed && <BrandMark />}
        {onClose ? (
          <IconButton label="Close menu" onClick={onClose}>
            <X size={20} />
          </IconButton>
        ) : (
          <IconButton label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed} onClick={onToggleCollapsed}>
            <PanelLeft size={20} strokeWidth={1.8} />
          </IconButton>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {sections.map((section, index) => (
          <div key={section.title ?? index} className={cn('flex flex-col gap-1 py-4', collapsed ? 'px-2' : 'px-3', index > 0 && 'border-t border-line')}>
            {section.title && !collapsed && <p className="px-3.5 pb-1 text-xs font-semibold tracking-wide text-muted uppercase">{section.title}</p>}
            {section.items.map((item) => (
              <NavEntry key={item.to} item={item} collapsed={collapsed} unread={unread} onNavigate={onClose} />
            ))}
          </div>
        ))}
      </div>

      <div className={cn('flex shrink-0 items-center gap-3 border-t border-line p-3', collapsed && 'flex-col')}>
        <Avatar name={user.name} seed={user.id} size="md" />
        {!collapsed && (
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold text-fg">{user.name}</p>
            <p className="truncate text-xs text-muted">{roleLabel[user.role]}</p>
          </div>
        )}
        <IconButton label="Sign out" onClick={onSignOut}>
          <LogOut size={18} />
        </IconButton>
      </div>
    </nav>
  )
}
