import { http } from '../../lib/http'
import type { AgentStatus, Availability, ConversationTopic } from '../../types/api'

export interface QueueItem {
  conversationId: string
  customerId: string
  topic: ConversationTopic
  lastMessagePreview: string | null
  waitingSince: string | null
}

export const agentsApi = {
  list: () => http.get<{ agents: AgentStatus[] }>('/api/v1/agents').then((result) => result.agents),
  queue: () => http.get<{ queue: QueueItem[] }>('/api/v1/agents/queue').then((result) => result.queue),
  setMyStatus: (availability: Availability) =>
    http.patch<{ agent: AgentStatus }>('/api/v1/agents/me/status', { availability }).then((result) => result.agent),
  updateSettings: (agentId: string, settings: { skills?: string[]; maxConcurrentChats?: number }) =>
    http.patch<{ agent: AgentStatus }>(`/api/v1/agents/${agentId}/settings`, settings).then((result) => result.agent),
  claim: (conversationId: string) => http.post<{ conversationId: string; assignedAgentId: string }>(`/api/v1/agents/conversations/${conversationId}/claim`),
  close: (conversationId: string) => http.post<null>(`/api/v1/agents/conversations/${conversationId}/close`),
  transfer: (conversationId: string, agentId: string | null) =>
    http.post<{ conversationId: string; assignedAgentId: string | null }>(`/api/v1/agents/conversations/${conversationId}/transfer`, { agentId }),
}
