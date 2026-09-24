import { create } from 'zustand'

export type ToastTone = 'info' | 'success' | 'error'

export interface Toast {
  id: number
  tone: ToastTone
  message: string
  action?: { label: string; run: () => void }
}

interface ToastState {
  toasts: Toast[]
  show: (toast: Omit<Toast, 'id'>, durationMs?: number) => void
  dismiss: (id: number) => void
}

let nextId = 1

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  show: (toast, durationMs = toast.tone === 'error' ? 7000 : 4000) => {
    // Same message already on screen? Don't stack duplicates.
    if (get().toasts.some((existing) => existing.message === toast.message)) return
    const id = nextId++
    set((state) => ({ toasts: [...state.toasts.slice(-3), { ...toast, id }] }))
    setTimeout(() => get().dismiss(id), durationMs)
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}))

/** Shortcuts usable anywhere (also outside React components). */
export const toast = {
  info: (message: string) => useToastStore.getState().show({ tone: 'info', message }),
  success: (message: string) => useToastStore.getState().show({ tone: 'success', message }),
  error: (message: string, action?: Toast['action']) => useToastStore.getState().show({ tone: 'error', message, action }),
}
