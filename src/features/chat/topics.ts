import type { ConversationTopic } from '../../types/api'

export const TOPICS: Array<{ value: ConversationTopic; label: string }> = [
  { value: 'general', label: 'General question' },
  { value: 'billing', label: 'Billing & payments' },
  { value: 'technical', label: 'Technical problem' },
  { value: 'sales', label: 'Plans & pricing' },
]
