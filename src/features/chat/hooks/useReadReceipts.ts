import { useEffect, useState } from 'react'
import type { Conversation, User } from '../../../types/api'
import { isMySide, type UiMessage } from '../chat.types'
import { markRead } from '../services/messaging'

const usePageVisible = () => {
  const [visible, setVisible] = useState(() => document.visibilityState === 'visible' && document.hasFocus())
  useEffect(() => {
    const update = () => setVisible(document.visibilityState === 'visible' && document.hasFocus())
    document.addEventListener('visibilitychange', update)
    window.addEventListener('focus', update)
    window.addEventListener('blur', update)
    return () => {
      document.removeEventListener('visibilitychange', update)
      window.removeEventListener('focus', update)
      window.removeEventListener('blur', update)
    }
  }, [])
  return visible
}

/**
 * Sends a read receipt for the newest message from the other side — but only
 * when the person can actually see it: tab visible + focused + scrolled to the bottom.
 */
export const useReadReceipts = ({
  conversation,
  messages,
  me,
  atBottom,
}: {
  conversation: Conversation | undefined
  messages: UiMessage[]
  me: User
  atBottom: boolean
}) => {
  const pageVisible = usePageVisible()

  useEffect(() => {
    if (!conversation || !pageVisible || !atBottom) return
    const newestFromOtherSide = [...messages].reverse().find((message) => !message.local && !isMySide(message, conversation, me))
    if (newestFromOtherSide && newestFromOtherSide.status !== 'read') markRead(conversation.id, newestFromOtherSide.id)
    else if (newestFromOtherSide && conversation.unreadCount > 0) markRead(conversation.id, newestFromOtherSide.id)
  }, [conversation, messages, me, pageVisible, atBottom])
}
