import { useCallback, useEffect, useRef } from 'react'
import { realtime } from '../../../lib/socket'

const THROTTLE_MS = 2_000 // at most one "typing: true" every 2s while typing
const IDLE_MS = 3_000 //     no keystroke for 3s → "typing: false"

/**
 * Throttle + debounce for the typing indicator:
 * one event when typing starts, a keep-alive every 2s, one event when it stops.
 * Uses volatile emits: if the connection is down they're dropped, which is fine for typing.
 */
export const useTypingEmitter = (conversationId: string | null) => {
  const lastSent = useRef(0)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const typing = useRef(false)

  const stop = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current)
    idleTimer.current = null
    if (typing.current && conversationId) realtime.emitVolatile('typing:set', { conversationId, isTyping: false })
    typing.current = false
    lastSent.current = 0
  }, [conversationId])

  const onInput = useCallback(
    (text: string) => {
      if (!conversationId) return
      if (!text.trim()) return stop()
      const now = Date.now()
      if (!typing.current || now - lastSent.current >= THROTTLE_MS) {
        realtime.emitVolatile('typing:set', { conversationId, isTyping: true })
        typing.current = true
        lastSent.current = now
      }
      if (idleTimer.current) clearTimeout(idleTimer.current)
      idleTimer.current = setTimeout(stop, IDLE_MS)
    },
    [conversationId, stop],
  )

  useEffect(() => stop, [stop]) // switching conversation / unmount

  return { onInput, stop }
}
