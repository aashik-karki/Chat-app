import { create } from 'zustand'

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline'

interface ConnectionState {
  status: ConnectionStatus
  attempt: number
  /** true after a reconnect where Socket.IO replayed everything we missed (no refetch needed) */
  recovered: boolean
  browserOnline: boolean
  set: (patch: Partial<Omit<ConnectionState, 'set'>>) => void
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  status: 'idle',
  attempt: 0,
  recovered: false,
  browserOnline: typeof navigator === 'undefined' ? true : navigator.onLine,
  set: (patch) => set(patch),
}))
