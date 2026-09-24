import { useEffect } from 'react'
import type { PresenceState } from '../../types/api'
import { presenceWatch, usePresenceStore } from './presence.store'

/** Live online/offline for users; subscribes while the component is mounted. */
export const useWatchPresence = (userIds: Array<string | null | undefined>) => {
  const key = userIds.filter(Boolean).sort().join(',')
  useEffect(() => {
    const ids = key ? key.split(',') : []
    presenceWatch.add(ids)
    return () => presenceWatch.remove(ids)
  }, [key])
}

export const usePresenceOf = (userId: string | null | undefined): PresenceState | undefined =>
  usePresenceStore((state) => (userId ? state.byUser[userId] : undefined))
