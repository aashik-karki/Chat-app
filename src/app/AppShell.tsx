import { BarChart3, Inbox, LogOut, MessagesSquare, Moon, Sun } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { ConnectionBanner, ConnectionPill } from '../components/ConnectionPill'
import { Avatar } from '../components/ui/Avatar'
import { IconButton } from '../components/ui/Button'
import { useAuthStore } from '../features/auth/auth.store'
import { AgentsRealtimeBridge } from '../features/agents/AgentsRealtimeBridge'
import { ChatRealtimeBridge } from '../features/chat/ChatRealtimeBridge'
import { cn } from '../lib/cn'
import { toast } from '../stores/toast.store'
import { useThemeStore } from '../stores/theme.store'

const roleLabel = { admin: 'Admin', agent: 'Support agent', user: 'Customer' } as const

/** Top bar + page area for every logged-in screen. */
export const AppShell = () => {
  const user = useAuthStore((state) => state.user)!
  const logout = useAuthStore((state) => state.logout)
  const toggleTheme = useThemeStore((state) => state.toggle)
  const navigate = useNavigate()

  const nav = [
    ...(user.role === 'user' ? [{ to: '/chat', label: 'Support chat', icon: MessagesSquare }] : []),
    ...(user.role !== 'user' ? [{ to: '/inbox', label: 'Inbox', icon: Inbox }] : []),
    ...(user.role === 'admin' ? [{ to: '/admin', label: 'Dashboard', icon: BarChart3 }] : []),
  ]

  const signOut = async () => {
    try {
      await logout()
    } catch {
      toast.info('Signed out on this device.')
    }
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-svh flex-col bg-bg">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-3 sm:px-5">
        <div className="flex items-center gap-2 text-fg">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-fg">
            <MessagesSquare size={16} />
          </span>
          <span className="hidden font-semibold tracking-tight sm:inline">HelpDesk</span>
        </div>

        <nav className="ml-2 flex items-center gap-1" aria-label="Main">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors',
                  isActive ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-surface-2 hover:text-fg',
                )
              }
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <ConnectionPill />
          <IconButton label="Toggle dark mode" onClick={toggleTheme}>
            <Sun size={18} className="hidden dark:block" />
            <Moon size={18} className="dark:hidden" />
          </IconButton>
          <div className="ml-1 hidden items-center gap-2.5 border-l border-line pl-3 md:flex">
            <Avatar name={user.name} seed={user.id} size="sm" />
            <div className="leading-tight">
              <p className="text-sm font-medium text-fg">{user.name}</p>
              <p className="text-xs text-muted">{roleLabel[user.role]}</p>
            </div>
          </div>
          <IconButton label="Sign out" onClick={() => void signOut()}>
            <LogOut size={18} />
          </IconButton>
        </div>
      </header>
      <ChatRealtimeBridge />
      {user.role !== 'user' && <AgentsRealtimeBridge />}
      <ConnectionBanner />
      <main className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  )
}
