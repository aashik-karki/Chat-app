import { downloadFile, http } from '../../lib/http'
import type { Conversation, ConversationTopic, HistoryPage } from '../../types/api'

export const chatApi = {
  mine: () => http.get<{ conversation: Conversation }>('/api/v1/conversations/mine').then((result) => result.conversation),
  list: () => http.get<{ conversations: Conversation[] }>('/api/v1/conversations').then((result) => result.conversations),
  get: (id: string) => http.get<{ conversation: Conversation }>(`/api/v1/conversations/${id}`).then((result) => result.conversation),

  history: (conversationId: string, cursor?: string | null, limit = 30) => {
    const params = new URLSearchParams({ limit: String(limit) })
    if (cursor) params.set('cursor', cursor)
    return http.get<HistoryPage>(`/api/v1/conversations/${conversationId}/messages?${params}`)
  },

  setTopic: (topic: ConversationTopic) =>
    http.patch<{ conversation: Conversation }>('/api/v1/conversations/mine/topic', { topic }).then((result) => result.conversation),

  /** Server streams the full history as a file. */
  exportHistory: (conversationId: string, format: 'json' | 'csv') =>
    downloadFile(`/api/v1/conversations/${conversationId}/messages/export?format=${format}`, `chat-${conversationId}.${format}`),
}
