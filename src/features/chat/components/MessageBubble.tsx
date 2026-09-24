import { memo } from 'react'
import { cn } from '../../../lib/cn'
import { formatTime } from '../../../lib/time'
import { displayStatus, type UiMessage } from '../chat.types'
import { discardMessage, retryMessage } from '../services/messaging'
import { MessageStatusIcon } from './MessageStatusIcon'

interface MessageBubbleProps {
  message: UiMessage
  mine: boolean
  /** Name above the first bubble of a group (other people only). */
  senderName?: string
  firstInGroup: boolean
  /** Show ✓/✓✓ ticks (on my side's messages). */
  showStatus: boolean
}

/** memo: a new message or a status change re-renders only the affected bubble. */
export const MessageBubble = memo(({ message, mine, senderName, firstInGroup, showStatus }: MessageBubbleProps) => {
  const status = displayStatus(message)
  const failed = status === 'failed'

  return (
    <div className={cn('flex flex-col', mine ? 'items-end' : 'items-start', firstInGroup ? 'mt-3' : 'mt-0.5')}>
      {firstInGroup && senderName && <span className="mb-1 px-1 text-xs font-medium text-muted">{senderName}</span>}
      <div
        className={cn(
          'relative max-w-[78%] rounded-2xl px-3.5 py-2 text-[15px] leading-relaxed shadow-xs sm:max-w-[65%]',
          mine ? 'rounded-br-md bg-bubble-own text-bubble-own-fg' : 'rounded-bl-md border border-line bg-bubble-other text-fg',
          status === 'sending' && 'opacity-75',
          failed && 'ring-2 ring-danger/60',
        )}
      >
        <p className="break-words whitespace-pre-wrap">{message.text}</p>
        <span className={cn('mt-0.5 flex items-center justify-end gap-1 text-[11px]', mine ? 'text-bubble-own-fg/75' : 'text-subtle')}>
          <time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time>
          {showStatus && <MessageStatusIcon status={status} />}
        </span>
      </div>
      {failed && (
        <div className="mt-1 flex items-center gap-2 text-xs" role="alert">
          <span className="text-danger">{message.errorMessage ?? 'Not sent.'}</span>
          <button type="button" className="font-semibold text-primary hover:underline" onClick={() => retryMessage(message.conversationId, message.clientMessageId, message.text)}>
            Retry
          </button>
          <button type="button" className="text-muted hover:text-fg hover:underline" onClick={() => discardMessage(message.conversationId, message.clientMessageId)}>
            Delete
          </button>
        </div>
      )}
    </div>
  )
})
MessageBubble.displayName = 'MessageBubble'
