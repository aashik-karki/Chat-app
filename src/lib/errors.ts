/** Turns backend error codes into text a person can act on. */
const MESSAGES: Record<string, string> = {
  NETWORK_ERROR: "Can't reach the server. Check your connection and try again.",
  TIMEOUT: 'The server took too long to answer. Please try again.',
  AUTHENTICATION_REQUIRED: 'Your session has ended. Please sign in again.',
  INVALID_CREDENTIALS: 'That email and password combination is not right.',
  ACCOUNT_PENDING: 'Your account is waiting for an admin to approve it.',
  ACCOUNT_REJECTED: 'Your registration was not approved. Contact support if you think this is a mistake.',
  EMAIL_IN_USE: 'An account with this email already exists. Try signing in.',
  CSRF_TOKEN_INVALID: 'Your security token expired. Please try again.',
  TOO_MANY_REQUESTS: 'Too many attempts. Please wait a few minutes and try again.',
  RATE_LIMITED: "You're sending too fast. Wait a moment and try again.",
  VALIDATION_ERROR: 'Some fields are not valid. Please check and try again.',
  INVALID_PAYLOAD: 'That request was not valid.',
  FORBIDDEN: "You don't have permission to do that.",
  CONVERSATION_NOT_FOUND: 'This conversation no longer exists or you lost access to it.',
  CONVERSATION_CLOSED: 'This conversation is closed.',
  ALREADY_ASSIGNED: 'Another agent already took this conversation.',
  ASSIGNMENT_CHANGED: 'The assignment changed meanwhile. Refresh and try again.',
  NOT_IN_CONVERSATION: 'Open the conversation first.',
  TOO_MANY_CONVERSATIONS: 'You have too many chats open. Close one first.',
  PUSH_DISABLED: 'Push notifications are not set up on the server.',
  INTERNAL_ERROR: 'Something went wrong on our side. Please try again.',
  ACK_TIMEOUT: "The server didn't confirm in time. We'll retry.",
  NOT_CONNECTED: "You're offline. We'll send it when you're back.",
}

export const friendlyMessage = (code: string, fallback?: string) => MESSAGES[code] ?? fallback ?? 'Something went wrong. Please try again.'

/** Error thrown by REST calls and socket acks alike. */
export class AppError extends Error {
  readonly code: string
  readonly status: number | null
  readonly details: unknown

  constructor(code: string, message: string, status: number | null = null, details?: unknown) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.status = status
    this.details = details
  }
}

export const toAppError = (error: unknown): AppError =>
  error instanceof AppError ? error : new AppError('INTERNAL_ERROR', friendlyMessage('INTERNAL_ERROR'))
