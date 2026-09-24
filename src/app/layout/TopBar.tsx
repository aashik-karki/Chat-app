import { LogOut, Menu, Moon, Sun } from 'lucide-react'
import { ConnectionPill } from '../../components/ConnectionPill'
import { Avatar } from '../../components/ui/Avatar'
import { IconButton } from '../../components/ui/Button'
import { useAuthStore } from '../../features/auth/auth.store'
import { PushToggle } from '../../features/push/components/PushToggle'
import { useThemeStore } from '../../stores/theme.store'
import { BrandMark } from './BrandMark'

interface TopBarProps {
  /** Staff layout: opens the sidebar drawer on small screens. Customers have no sidebar. */
  onOpenMenu?: () => void
  onSignOut: () => void
}

/** Top bar: connection status on the left; notifications, theme and account on the right. */
export const TopBar = ({ onOpenMenu, onSignOut }: TopBarProps) => {
  const user = useAuthStore((state) => state.user)!
  const toggleTheme = useThemeStore((state) => state.toggle)
  const staff = Boolean(onOpenMenu)

  return (
    <header className="flex h-[72px] shrink-0 items-center gap-3 border-b border-line bg-surface px-4 sm:px-6 lg:px-8">
      {staff && (
        <IconButton label="Open menu" className="lg:hidden" onClick={onOpenMenu}>
          <Menu size={20} />
        </IconButton>
      )}
      <BrandMark className={staff ? 'lg:hidden' : ''} compact={staff} />
      <ConnectionPill />

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <PushToggle shape="round" />
        <IconButton shape="round" label="Toggle dark mode" onClick={toggleTheme}>
          <Sun size={19} className="hidden dark:block" />
          <Moon size={19} className="dark:hidden" />
        </IconButton>
        <span className="hidden sm:inline-flex" title={user.name}>
          <Avatar name={user.name} seed={user.id} size="md" />
        </span>
        {!staff && (
          <IconButton label="Sign out" onClick={onSignOut}>
            <LogOut size={18} />
          </IconButton>
        )}
      </div>
    </header>
  )
}
