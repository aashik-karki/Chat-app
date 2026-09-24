import { ArrowDown } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Spinner } from '../../../components/ui/Spinner'
import { formatDay } from '../../../lib/time'
import type { UiMessage } from '../chat.types'
import { MessageBubble } from './MessageBubble'

interface MessageListProps {
  messages: UiMessage[]
  isMine: (message: UiMessage) => boolean
  nameOf: (senderId: string) => string
  showNames: boolean
  hasOlder: boolean
  loadingOlder: boolean
  onLoadOlder: () => void
  onAtBottomChange: (atBottom: boolean) => void
  empty?: React.ReactNode
}

const BOTTOM_THRESHOLD_PX = 80
const GROUP_GAP_MS = 5 * 60_000

export const MessageList = ({ messages, isMine, nameOf, showNames, hasOlder, loadingOlder, onLoadOlder, onAtBottomChange, empty }: MessageListProps) => {
  const scroller = useRef<HTMLDivElement>(null)
  const topSentinel = useRef<HTMLDivElement>(null)
  const atBottomRef = useRef(true)
  const [atBottom, setAtBottom] = useState(true)
  // How many messages existed when the reader was last at the bottom → the rest are "new".
  const [seenCount, setSeenCount] = useState(0)
  const countRef = useRef(messages.length)
  const firstId = messages[0]?.id
  const lastId = messages[messages.length - 1]?.id
  const prev = useRef({ firstId, lastId, height: 0, count: 0 })

  const scrollToBottom = useCallback((smooth = false) => {
    const element = scroller.current
    if (element) element.scrollTo({ top: element.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  }, [])

  const updateAtBottom = useCallback(() => {
    const element = scroller.current
    if (!element) return
    const bottom = element.scrollHeight - element.scrollTop - element.clientHeight < BOTTOM_THRESHOLD_PX
    if (bottom !== atBottomRef.current) {
      atBottomRef.current = bottom
      setAtBottom(bottom)
      onAtBottomChange(bottom)
    }
    if (bottom) setSeenCount(countRef.current)
  }, [onAtBottomChange])

  // Keep the view steady when older messages are added on top, and follow new ones at the bottom.
  useLayoutEffect(() => {
    const element = scroller.current
    if (!element) return
    const before = prev.current
    const prepended = before.firstId !== firstId && before.lastId === lastId && before.count > 0
    const appended = before.lastId !== lastId

    if (before.count === 0 && messages.length > 0) {
      scrollToBottom()
    } else if (prepended) {
      element.scrollTop += element.scrollHeight - before.height
    } else if (appended) {
      const last = messages[messages.length - 1]
      if (atBottomRef.current || (last && isMine(last) && last.local === 'sending')) scrollToBottom(true)
    }
    countRef.current = messages.length
    prev.current = { firstId, lastId, height: element.scrollHeight, count: messages.length }
  }, [firstId, lastId, messages, isMine, scrollToBottom])

  // Load older messages when the top comes into view.
  useEffect(() => {
    const sentinel = topSentinel.current
    if (!sentinel || !hasOlder) return
    const observer = new IntersectionObserver(([entry]) => entry?.isIntersecting && onLoadOlder(), { root: scroller.current, rootMargin: '200px 0px 0px 0px' })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasOlder, onLoadOlder])

  useEffect(() => onAtBottomChange(true), [onAtBottomChange])

  const unseen = atBottom ? 0 : messages.slice(seenCount).filter((message) => !isMine(message)).length

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={scroller} onScroll={updateAtBottom} className="h-full overflow-y-auto overscroll-contain px-3 pb-2 sm:px-6" role="log" aria-label="Messages" aria-live="polite">
        <div ref={topSentinel} className="h-px" />
        {loadingOlder && (
          <div className="flex justify-center py-3 text-muted">
            <Spinner size={18} label="Loading older messages" />
          </div>
        )}
        {!hasOlder && messages.length > 0 && <p className="py-4 text-center text-xs text-subtle">Start of the conversation</p>}
        {messages.length === 0 && empty}
        {messages.map((message, index) => {
          const previous = messages[index - 1]
          const newDay = !previous || formatDay(previous.createdAt) !== formatDay(message.createdAt)
          const firstInGroup =
            newDay || !previous || previous.senderId !== message.senderId || new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() > GROUP_GAP_MS
          const mine = isMine(message)
          return (
            <div key={message.clientMessageId || message.id}>
              {newDay && (
                <div className="my-4 flex items-center gap-3 text-xs font-medium text-subtle">
                  <span className="h-px flex-1 bg-line" />
                  {formatDay(message.createdAt)}
                  <span className="h-px flex-1 bg-line" />
                </div>
              )}
              <MessageBubble
                message={message}
                mine={mine}
                firstInGroup={firstInGroup}
                senderName={showNames || !mine ? nameOf(message.senderId) : undefined}
                showStatus={mine}
              />
            </div>
          )
        })}
      </div>
      {!atBottom && (
        <button
          type="button"
          onClick={() => scrollToBottom(true)}
          className="absolute right-4 bottom-3 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-fg shadow-md hover:bg-surface-2"
        >
          <ArrowDown size={14} />
          {unseen > 0 ? `${unseen} new message${unseen > 1 ? 's' : ''}` : 'Latest'}
        </button>
      )}
    </div>
  )
}
