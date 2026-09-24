import { SendHorizontal } from 'lucide-react'
import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '../../../lib/cn'

const MAX_LENGTH = 4000

interface ComposerProps {
  placeholder: string
  onSend: (text: string) => void
  onInput?: (text: string) => void
  onStopTyping?: () => void
  disabled?: boolean
  disabledReason?: string
}

/** Auto-growing textarea: Enter sends, Shift+Enter adds a line. */
export const Composer = ({ placeholder, onSend, onInput, onStopTyping, disabled, disabledReason }: ComposerProps) => {
  const [text, setText] = useState('')
  const area = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const element = area.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${Math.min(element.scrollHeight, 160)}px`
  }, [text])

  const send = () => {
    const value = text.trim()
    if (!value || disabled) return
    onSend(value)
    onStopTyping?.()
    setText('')
    area.current?.focus()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      send()
    }
  }

  const nearLimit = text.length > MAX_LENGTH * 0.9

  return (
    <div className="border-t border-line bg-surface px-3 py-3 sm:px-6">
      {disabled && disabledReason && <p className="mb-2 text-xs text-muted">{disabledReason}</p>}
      <div className="flex items-end gap-2 rounded-2xl border border-line bg-bg px-3 py-2 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
        <textarea
          ref={area}
          rows={1}
          value={text}
          maxLength={MAX_LENGTH}
          disabled={disabled}
          placeholder={placeholder}
          aria-label="Message"
          onChange={(event) => {
            setText(event.target.value)
            onInput?.(event.target.value)
          }}
          onBlur={onStopTyping}
          onKeyDown={onKeyDown}
          className="max-h-40 min-h-6 flex-1 resize-none bg-transparent py-1 text-[15px] text-fg outline-none placeholder:text-subtle disabled:opacity-60"
        />
        <button
          type="button"
          onClick={send}
          disabled={!text.trim() || disabled}
          aria-label="Send message"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-fg transition hover:bg-primary-hover disabled:opacity-40"
        >
          <SendHorizontal size={17} />
        </button>
      </div>
      <div className="mt-1.5 flex justify-between px-1 text-[11px] text-subtle">
        <span className="hidden sm:inline">Enter to send · Shift + Enter for a new line</span>
        <span className={cn('ml-auto', nearLimit && 'font-medium text-warning')}>
          {text.length > 0 ? `${text.length}/${MAX_LENGTH}` : ''}
        </span>
      </div>
    </div>
  )
}
