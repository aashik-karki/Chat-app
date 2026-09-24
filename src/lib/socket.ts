import { io, type Socket } from 'socket.io-client'
import { useConnectionStore } from '../stores/connection.store'
import type { ServerEvents } from '../types/api'
import { API_URL } from './env'
import { AppError, friendlyMessage } from './errors'

type AckResponse<T> = { ok: true; data?: T } | { ok: false; error: { code: string; message: string } }
type AppSocket = Socket<ServerEvents, Record<string, (payload: unknown, ack?: (response: AckResponse<unknown>) => void) => void>>

const ACK_TIMEOUT_MS = 8_000

/**
 * The single Socket.IO connection for the app.
 * - authenticated by the HttpOnly session cookie (withCredentials)
 * - reconnects forever with jittered backoff (0.7s → 8s)
 * - connection state goes to useConnectionStore for the UI
 * - emitWithAck() turns the server's { ok, data | error } acks into data or an AppError
 */
class RealtimeClient {
  private socket: AppSocket | null = null
  private authFailureHandler: (() => void) | null = null
  private reconnectHandlers = new Set<(recovered: boolean) => void>()

  connect() {
    if (this.socket) return
    const connection = useConnectionStore.getState()
    connection.set({ status: 'connecting', attempt: 0 })

    const socket: AppSocket = io(API_URL || undefined, {
      withCredentials: true,
      transports: ['websocket', 'polling'], // websocket first; long-polling if a proxy blocks websockets
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 700,
      reconnectionDelayMax: 8_000,
      randomizationFactor: 0.5,
      timeout: 10_000,
    })
    this.socket = socket
    let everConnected = false

    socket.on('connect', () => {
      useConnectionStore.getState().set({ status: 'connected', attempt: 0, recovered: socket.recovered })
      // First connect loads data normally; a reconnect that could NOT replay missed
      // events tells the app to re-fetch what's on screen.
      if (everConnected) this.reconnectHandlers.forEach((handler) => handler(socket.recovered))
      everConnected = true
    })
    socket.on('disconnect', (reason) => {
      // "io server disconnect" = the server kicked us (e.g. logged out); don't show "reconnecting".
      useConnectionStore.getState().set({ status: reason === 'io server disconnect' ? 'offline' : 'reconnecting' })
      if (reason === 'io server disconnect') socket.connect()
    })
    socket.io.on('reconnect_attempt', (attempt) => useConnectionStore.getState().set({ status: 'reconnecting', attempt }))
    socket.on('connect_error', (error) => {
      if (error.message === 'AUTHENTICATION_REQUIRED') {
        socket.disconnect()
        useConnectionStore.getState().set({ status: 'offline' })
        this.authFailureHandler?.()
        return
      }
      useConnectionStore.getState().set({ status: everConnected ? 'reconnecting' : 'connecting' })
    })
  }

  disconnect() {
    this.socket?.removeAllListeners()
    this.socket?.disconnect()
    this.socket = null
    useConnectionStore.getState().set({ status: 'idle', attempt: 0 })
  }

  get connected() {
    return this.socket?.connected ?? false
  }

  /** Called when the server refuses the socket because the session is gone. */
  onAuthFailure(handler: () => void) {
    this.authFailureHandler = handler
  }

  /** Called after every RE-connect with whether missed events were replayed. */
  onReconnect(handler: (recovered: boolean) => void) {
    this.reconnectHandlers.add(handler)
    return () => this.reconnectHandlers.delete(handler)
  }

  /** Subscribe to a server event; returns an unsubscribe function (use in useEffect cleanups). */
  on<E extends keyof ServerEvents>(event: E, handler: ServerEvents[E]) {
    const socket = this.socket
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket?.on(event, handler as any)
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      socket?.off(event, handler as any)
    }
  }

  /** Emit and wait for the ack. Throws AppError(code) on failure, timeout or when offline. */
  async emitWithAck<T = void>(event: string, payload: unknown = {}, timeoutMs = ACK_TIMEOUT_MS): Promise<T> {
    const socket = this.socket
    if (!socket?.connected) throw new AppError('NOT_CONNECTED', friendlyMessage('NOT_CONNECTED'))
    let response: AckResponse<T>
    try {
      response = (await socket.timeout(timeoutMs).emitWithAck(event, payload)) as AckResponse<T>
    } catch {
      throw new AppError('ACK_TIMEOUT', friendlyMessage('ACK_TIMEOUT'))
    }
    if (!response.ok) throw new AppError(response.error.code, friendlyMessage(response.error.code, response.error.message))
    return response.data as T
  }

  /** Fire-and-forget for high-frequency, loss-tolerant events (typing). Dropped while offline. */
  emitVolatile(event: string, payload: unknown) {
    this.socket?.volatile.emit(event, payload)
  }
}

export const realtime = new RealtimeClient()
