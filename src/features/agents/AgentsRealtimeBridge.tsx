import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { realtime } from '../../lib/socket'
import { useConnectionStore } from '../../stores/connection.store'
import { useToastStore } from '../../stores/toast.store'
import { useAuthStore } from '../auth/auth.store'
import { chatApi } from '../chat/chat.api'
import { useChatStore } from '../chat/chat.store'
import { agentsApi } from './agents.api'
import { useAgentsStore } from './agents.store'

/** Staff only: keeps agent statuses live and announces chats assigned to me. */
export const AgentsRealtimeBridge = () => {
  const connected = useConnectionStore((state) => state.status === 'connected')
  const navigate = useNavigate()

  // (Re)load the full list whenever the connection (re)starts: events we missed are covered.
  useEffect(() => {
    if (!connected) return
    agentsApi
      .list()
      .then((agents) => useAgentsStore.getState().setAll(agents))
      .catch(() => undefined)
  }, [connected])

  useEffect(() => {
    const offStatus = realtime.on('agent:status', (status) => useAgentsStore.getState().upsert(status))
    const offAssigned = realtime.on('conversation:assigned', ({ conversationId, agentId, reason }) => {
      const me = useAuthStore.getState().user
      if (!me || agentId !== me.id || reason === 'claim') return
      // A brand-new chat may not be loaded yet: get it first so the toast can name the customer.
      const known = useChatStore.getState().conversations[conversationId]
      const conversation = known
        ? Promise.resolve(known)
        : chatApi.get(conversationId).then((loaded) => {
            useChatStore.getState().upsertConversations([loaded])
            return loaded
          })
      void conversation
        .catch(() => null)
        .then((loaded) => {
          const customer = loaded?.customer.name ?? 'a customer'
          useToastStore.getState().show({
            tone: 'info',
            message: reason === 'manual' ? `An admin transferred the chat with ${customer} to you.` : `New chat assigned to you: ${customer}.`,
            action: { label: 'Open', run: () => navigate(`/inbox/${conversationId}`) },
          })
        })
    })
    return () => {
      offStatus()
      offAssigned()
    }
  }, [navigate])

  useEffect(
    () =>
      useAuthStore.subscribe((state, previous) => {
        if (previous.user && !state.user) useAgentsStore.getState().reset()
      }),
    [],
  )

  return null
}
