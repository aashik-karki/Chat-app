import type { Conversation, Message, User } from '../../types/api'

/** A message as the UI holds it: server fields + local send state for optimistic messages. */
export interface UiMessage extends Message {
  /** 'sending' until the server acks; 'failed' if it refused (can be retried). */
  local?: 'sending' | 'failed'
  errorMessage?: string
}

export type DisplayStatus = 'sending' | 'failed' | 'sent' | 'delivered' | 'read'

export const displayStatus = (message: UiMessage): DisplayStatus => message.local ?? message.status

/** Status only moves forward, so a late "delivered" never overwrites "read". */
export const STATUS_RANK = { sent: 1, delivered: 2, read: 3 } as const

/**
 * A support thread has two sides: the customer, and the support team.
 * "Mine" = written by my side (customer: my own messages; staff: any staff member's).
 */
export const isMySide = (message: Pick<Message, 'senderId'>, conversation: Pick<Conversation, 'customer'>, me: Pick<User, 'id'>) =>
  conversation.customer.id === me.id ? message.senderId === me.id : message.senderId !== conversation.customer.id
