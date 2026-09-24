import { useState } from 'react'
import { cn } from '../../../lib/cn'
import { toAppError } from '../../../lib/errors'
import { toast } from '../../../stores/toast.store'
import type { ConversationTopic } from '../../../types/api'
import { chatApi } from '../chat.api'
import { useChatStore } from '../chat.store'
import { TOPICS } from '../topics'


/** Lets the customer say what they need; the backend routes to an agent with that skill. */
export const TopicPicker = ({ current }: { current: ConversationTopic }) => {
  const [saving, setSaving] = useState<ConversationTopic | null>(null)

  const choose = async (topic: ConversationTopic) => {
    if (topic === current) return
    setSaving(topic)
    try {
      const conversation = await chatApi.setTopic(topic)
      useChatStore.getState().upsertConversations([conversation])
    } catch (error) {
      toast.error(toAppError(error).message)
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="flex flex-wrap justify-center gap-2" role="radiogroup" aria-label="What do you need help with?">
      {TOPICS.map((topic) => (
        <button
          key={topic.value}
          type="button"
          role="radio"
          aria-checked={topic.value === current}
          disabled={saving !== null}
          onClick={() => void choose(topic.value)}
          className={cn(
            'rounded-full border px-3.5 py-1.5 text-sm transition',
            topic.value === current ? 'border-primary bg-primary/10 font-medium text-primary' : 'border-line bg-surface text-muted hover:text-fg',
            saving === topic.value && 'animate-pulse',
          )}
        >
          {topic.label}
        </button>
      ))}
    </div>
  )
}
