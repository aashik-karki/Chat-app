import { MessageCircle, RotateCw } from 'lucide-react'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { Button } from '../../../components/ui/Button'
import { EmptyState } from '../../../components/ui/EmptyState'
import { PageSpinner } from '../../../components/ui/Spinner'
import type { Conversation, User } from '../../../types/api'
import { EMPTY_TYPING, useChatStore } from '../chat.store'
import { isMySide, type UiMessage } from '../chat.types'
import { useConversationThread } from '../hooks/useConversationThread'
import { useReadReceipts } from '../hooks/useReadReceipts'
import { useTypingEmitter } from '../hooks/useTypingEmitter'
import { sendMessage } from '../services/messaging'
import { loadFirstPage, loadOlder } from '../services/threads'
import { Composer } from './Composer'
import { MessageList } from './MessageList'
import { TypingIndicator } from './TypingIndicator'

interface ChatViewProps {
  conversation: Conversation
  me: User
  /** Staff must join the room; customers are joined automatically. */
  join: boolean
  header: ReactNode
  nameOf: (senderId: string) => string
  /** Staff see who on the team wrote each message. */
  showNames?: boolean
  composerDisabledReason?: string
  emptyHint?: ReactNode
}

/** The conversation screen shared by customers and agents. */
export const ChatView = ({ conversation, me, join, header, nameOf, showNames = false, composerDisabledReason, emptyHint }: ChatViewProps) => {
  const { messages, status, error, hasOlder, loadingOlder } = useConversationThread(conversation.id, { join })
  const typing = useChatStore((state) => state.typing[conversation.id] ?? EMPTY_TYPING)
  const [atBottom, setAtBottom] = useState(true)
  const { onInput, stop } = useTypingEmitter(conversation.id)

  const isMine = useCallback((message: UiMessage) => isMySide(message, conversation, me), [conversation, me])
  const typers = useMemo(() => Object.values(typing), [typing])

  useReadReceipts({ conversation, messages, me, atBottom })

  const onLoadOlder = useCallback(() => void loadOlder(conversation.id), [conversation.id])

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-bg" aria-label="Conversation">
      {header}
      {status === 'loading' && messages.length === 0 ? (
        <PageSpinner label="Loading messages" />
      ) : status === 'error' && messages.length === 0 ? (
        <EmptyState title="Couldn't load messages">
          <p className="mb-3">{error}</p>
          <Button variant="secondary" size="sm" icon={<RotateCw size={14} />} onClick={() => void loadFirstPage(conversation.id)}>
            Try again
          </Button>
        </EmptyState>
      ) : (
        <MessageList
          messages={messages}
          isMine={isMine}
          nameOf={nameOf}
          showNames={showNames}
          hasOlder={hasOlder}
          loadingOlder={loadingOlder}
          onLoadOlder={onLoadOlder}
          onAtBottomChange={setAtBottom}
          empty={
            <EmptyState icon={<MessageCircle size={22} />} title="No messages yet">
              {emptyHint}
            </EmptyState>
          }
        />
      )}
      <TypingIndicator typers={typers} />
      <Composer
        placeholder="Write a message…"
        onSend={(text) => sendMessage(conversation.id, text, me)}
        onInput={onInput}
        onStopTyping={stop}
        disabled={Boolean(composerDisabledReason)}
        disabledReason={composerDisabledReason}
      />
    </section>
  )
}
