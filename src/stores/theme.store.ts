import { create } from 'zustand'

type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'chat-theme'

const readStored = (): Theme => {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system'
  }
}

const apply = (theme: Theme) => {
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

interface ThemeState {
  theme: Theme
  toggle: () => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: readStored(),
  toggle: () => {
    const isDark = document.documentElement.classList.contains('dark')
    const theme: Theme = isDark ? 'light' : 'dark'
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* private mode: just don't remember */
    }
    apply(theme)
    set({ theme })
  },
}))

export const initTheme = () => {
  apply(useThemeStore.getState().theme)
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (useThemeStore.getState().theme === 'system') apply('system')
  })
}
