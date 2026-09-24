import { create } from 'zustand'
import { currentPermission, detectPushSupport, type PushSupport } from './push.support'

interface PushState {
  support: PushSupport
  permission: NotificationPermission
  /** This browser has a push subscription saved on the server for the current user. */
  subscribed: boolean
  busy: boolean
  /** e.g. PUSH_DISABLED: the server has no VAPID keys configured. */
  serverError: string | null
  set: (patch: Partial<Omit<PushState, 'set'>>) => void
}

export const usePushStore = create<PushState>((set) => ({
  support: typeof window === 'undefined' ? 'unsupported' : detectPushSupport(),
  permission: typeof window === 'undefined' ? 'default' : currentPermission(),
  subscribed: false,
  busy: false,
  serverError: null,
  set: (patch) => set(patch),
}))
