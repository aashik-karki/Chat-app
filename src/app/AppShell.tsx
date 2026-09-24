import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import { ConnectionBanner } from '../components/ConnectionPill'
import { useAuthStore } from '../features/auth/auth.store'
import { AgentsRealtimeBridge } from '../features/agents/AgentsRealtimeBridge'
import { ChatRealtimeBridge } from '../features/chat/ChatRealtimeBridge'
import { BackgroundNotifier } from '../features/push/BackgroundNotifier'
import { PushPrompt } from '../features/push/components/PushPrompt'
import { cn } from '../lib/cn'
import { toast } from '../stores/toast.store'
import { Sidebar } from './layout/Sidebar'
import { TopBar } from './layout/TopBar'

const COLLAPSED_KEY = 'sidebar-collapsed'

const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Frame for every logged-in screen.
 * Staff (admins, agents): sidebar + top bar. The sidebar collapses to an icon rail
 * on desktop and becomes a drawer below 1024px. Customers: top bar only.
 */
export const AppShell = () => {
  const user = useAuthStore((state) => state.user)!
  const logout = useAuthStore((state) => state.logout)
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const staff = user.role !== 'user'

  const signOut = async () => {
    try {
      await logout()
    } catch {
      toast.info('Signed out on this device.')
    }
    navigate('/login', { replace: true })
  }

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      try {
        localStorage.setItem(COLLAPSED_KEY, value ? '0' : '1')
      } catch {
        // private mode: the choice just isn't remembered
      }
      return !value
    })
  }

  // Scroll to "/admin#agents"-style targets once the page has rendered them.
  useEffect(() => {
    if (!location.hash) return
    const id = decodeURIComponent(location.hash.slice(1))
    const timer = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    return () => window.clearTimeout(timer)
  }, [location.hash, location.pathname])

  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setDrawerOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  const page = (
    <>
      <ChatRealtimeBridge />
      <BackgroundNotifier />
      {staff && <AgentsRealtimeBridge />}
      <ConnectionBanner />
      <PushPrompt />
      <main className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </main>
    </>
  )

  if (!staff)
    return (
      <div className="flex h-svh flex-col bg-bg">
        <TopBar onSignOut={() => void signOut()} />
        {page}
      </div>
    )

  return (
    <div className="flex h-svh bg-bg">
      <aside className={cn('hidden shrink-0 border-r border-line transition-[width] duration-200 lg:block', collapsed ? 'w-[84px]' : 'w-[264px]')}>
        <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} onSignOut={() => void signOut()} />
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-fg/30" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] border-r border-line shadow-xl">
            <Sidebar collapsed={false} onToggleCollapsed={toggleCollapsed} onClose={() => setDrawerOpen(false)} onSignOut={() => void signOut()} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onOpenMenu={() => setDrawerOpen(true)} onSignOut={() => void signOut()} />
        {page}
      </div>
    </div>
  )
}
