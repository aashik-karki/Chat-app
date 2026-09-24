import { create } from 'zustand'
import { realtime } from '../../lib/socket'
import type { PresenceState } from '../../types/api'

interface PresenceStore {
  byUser: Record<string, PresenceState>
  set: (userId: string, state: PresenceState) => void
  setMany: (states: Record<string, PresenceState>) => void
}

export const usePresenceStore = create<PresenceStore>((set) => ({
  byUser: {},
  set: (userId, state) => set((store) => ({ byUser: { ...store.byUser, [userId]: state } })),
  setMany: (states) => set((store) => ({ byUser: { ...store.byUser, ...states } })),
}))

/**
 * The server keeps ONE presence watch-list per socket, so every component's
 * interest is merged here (ref-counted) and sent as a single list.
 */
const watchers = new Map<string, number>()
let syncTimer: ReturnType<typeof setTimeout> | null = null

const sync = () => {
  if (syncTimer) clearTimeout(syncTimer)
  // Batch many watch/unwatch calls from one render into one request.
  syncTimer = setTimeout(async () => {
    syncTimer = null
    if (!realtime.connected) return
    try {
      const userIds = [...watchers.keys()].slice(0, 200)
      const snapshot = await realtime.emitWithAck<Record<string, PresenceState>>('presence:subscribe', { userIds })
      usePresenceStore.getState().setMany(snapshot ?? {})
    } catch {
      /* presence is best-effort; the next change or reconnect retries */
    }
  }, 50)
}

export const presenceWatch = {
  add: (userIds: string[]) => {
    let changed = false
    for (const id of userIds) {
      if (!id) continue
      if (!watchers.has(id)) changed = true
      watchers.set(id, (watchers.get(id) ?? 0) + 1)
    }
    if (changed) sync()
  },
  remove: (userIds: string[]) => {
    let changed = false
    for (const id of userIds) {
      const count = (watchers.get(id) ?? 0) - 1
      if (count <= 0) {
        watchers.delete(id)
        changed = true
      } else watchers.set(id, count)
    }
    if (changed) sync()
  },
  /** After (re)connecting the server has forgotten our list: send it again. */
  resync: sync,
  clear: () => watchers.clear(),
}
