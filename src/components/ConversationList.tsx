import { Search } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { avatarColorClass } from '../lib/avatarColor'
import { cn } from '@/lib/utils'
import type { Conversation, PresenceState } from '../types/chat'

const presenceDotClass = (presence: PresenceState) =>
  cn(
    'absolute -right-0.5 bottom-0 size-2.5 rounded-full border-2 border-[#fafafc]',
    presence === 'online' ? 'bg-emerald-500' : presence === 'away' ? 'bg-amber-500' : 'bg-slate-300',
  )

interface ConversationListProps {
  conversations: Conversation[]
  activeConversationId: string | null
  query: string
  onQueryChange: (query: string) => void
  onSelect: (conversationId: string) => void
}

/**
 * The conversation list familiar from WhatsApp/Instagram DMs: a search box
 * over a scrollable list of rows, each an avatar (with a presence dot),
 * name + last-message preview, and a timestamp + unread badge on the right.
 * Built from shadcn/ui primitives (src/components/ui) so it composes the
 * same way the rest of a shadcn-based app would.
 */
export function ConversationList({ conversations, activeConversationId, query, onQueryChange, onSelect }: ConversationListProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col px-3 pb-[10px] pt-[18px]">
      <div className="relative mb-3 px-1">
        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search messages"
          aria-label="Search messages"
          className="h-10 rounded-full border-transparent bg-muted pl-9 text-[13px] shadow-none focus-visible:border-ring focus-visible:bg-white focus-visible:ring-[3px]"
        />
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col px-1 pb-2">
          {conversations.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">No conversations match your search.</p>
          )}
          {conversations.map((conversation) => {
            const isActive = conversation.id === activeConversationId
            return (
              <button
                key={conversation.id}
                type="button"
                onClick={() => onSelect(conversation.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-accent',
                  isActive && 'bg-orbit-soft hover:bg-orbit-soft',
                )}
              >
                <span className="relative shrink-0">
                  <Avatar className="size-12">
                    <AvatarFallback className={cn('text-[13px] text-white', avatarColorClass(conversation.user.id))}>
                      {conversation.user.initials}
                    </AvatarFallback>
                  </Avatar>
                  <i className={presenceDotClass(conversation.user.presence)} />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[14px] font-semibold text-foreground">{conversation.user.name}</span>
                    {conversation.lastMessageAt && (
                      <span className="shrink-0 text-[11px] text-muted-foreground">{conversation.lastMessageAt}</span>
                    )}
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <span className={cn('truncate text-[13px]', conversation.unreadCount > 0 ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                      {conversation.lastMessagePreview || 'No messages yet'}
                    </span>
                    {conversation.unreadCount > 0 && (
                      <Badge className="h-[18px] min-w-[18px] shrink-0 justify-center bg-orbit px-1.5 text-[10px] text-white">
                        {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                      </Badge>
                    )}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
