import type { ChatMessage, Conversation } from '../types/chat'

export const CURRENT_USER_ID = 'me'

export const demoConversations: Conversation[] = [
  {
    id: 'design-team',
    user: { id: 'maya', name: 'Maya Chen', initials: 'MC', color: '#8b5cf6', presence: 'online' },
    unreadCount: 0,
    lastMessagePreview: 'Sounds good — I’ll share it before standup.',
    lastMessageAt: '10:42 AM',
  },
  {
    id: 'sam-lee',
    user: { id: 'sam', name: 'Sam Lee', initials: 'SL', color: '#f97316', presence: 'online' },
    unreadCount: 2,
    lastMessagePreview: 'Can you review the new flow?',
    lastMessageAt: '9:18 AM',
  },
  {
    id: 'harper-jones',
    user: { id: 'harper', name: 'Harper Jones', initials: 'HJ', color: '#0ea5e9', presence: 'away' },
    unreadCount: 0,
    lastMessagePreview: 'The numbers look great this week.',
    lastMessageAt: 'Yesterday',
  },
  {
    id: 'project-alpha',
    user: { id: 'alex', name: 'Alex Morgan', initials: 'AM', color: '#ec4899', presence: 'offline', lastSeen: 'last seen yesterday' },
    unreadCount: 0,
    lastMessagePreview: 'I added notes to the brief.',
    lastMessageAt: 'Mon',
  },
]

export const demoMessages: Record<string, ChatMessage[]> = {
  'design-team': [
    {
      id: 'm-1', conversationId: 'design-team', senderId: 'maya', text: 'Hey! I pulled together the first pass of the workspace flow.', createdAt: '2026-09-22T04:20:00.000Z', status: 'read', readAt: '2026-09-22T04:22:00.000Z',
    },
    {
      id: 'm-2', conversationId: 'design-team', senderId: CURRENT_USER_ID, text: 'Nice — the hierarchy feels much clearer now. Could we give the activity card a little more breathing room?', createdAt: '2026-09-22T04:24:00.000Z', status: 'read', readAt: '2026-09-22T04:25:00.000Z',
    },
    {
      id: 'm-3', conversationId: 'design-team', senderId: 'maya', text: 'Absolutely. I also made the message states more explicit so delivery and read receipts are easier to scan.', createdAt: '2026-09-22T04:27:00.000Z', status: 'read', readAt: '2026-09-22T04:28:00.000Z',
    },
    {
      id: 'm-4', conversationId: 'design-team', senderId: CURRENT_USER_ID, text: 'Perfect. Let’s use that direction for the review.', createdAt: '2026-09-22T04:34:00.000Z', status: 'read', readAt: '2026-09-22T04:35:00.000Z',
    },
    {
      id: 'm-5', conversationId: 'design-team', senderId: 'maya', text: 'Sounds good — I’ll share it before standup.', createdAt: '2026-09-22T04:42:00.000Z', status: 'delivered', deliveredAt: '2026-09-22T04:42:20.000Z',
    },
  ],
  'sam-lee': [
    {
      id: 'm-6', conversationId: 'sam-lee', senderId: 'sam', text: 'Can you review the new flow?', createdAt: '2026-09-22T03:18:00.000Z', status: 'delivered', deliveredAt: '2026-09-22T03:18:20.000Z',
    },
  ],
  'harper-jones': [],
  'project-alpha': [],
}
