import { toAppError } from '../../../lib/errors'
import { toast } from '../../../stores/toast.store'
import { chatApi } from '../chat.api'
import { useChatStore } from '../chat.store'

const PAGE_SIZE = 30

/** Loads (or refreshes) the newest page of a conversation. */
export const loadFirstPage = async (conversationId: string) => {
  const store = useChatStore.getState()
  store.setThreadLoading(conversationId)
  try {
    const page = await chatApi.history(conversationId, null, PAGE_SIZE)
    useChatStore.getState().setFirstPage(conversationId, page.data, page.nextCursor)
  } catch (error) {
    useChatStore.getState().setThreadError(conversationId, toAppError(error).message)
  }
}

/** Loads the next older page (infinite scroll upwards). */
export const loadOlder = async (conversationId: string) => {
  const thread = useChatStore.getState().threads[conversationId]
  if (!thread?.nextCursor || thread.loadingOlder) return
  useChatStore.getState().setLoadingOlder(conversationId, true)
  try {
    const page = await chatApi.history(conversationId, thread.nextCursor, PAGE_SIZE)
    useChatStore.getState().prependOlder(conversationId, page.data, page.nextCursor)
  } catch (error) {
    useChatStore.getState().setLoadingOlder(conversationId, false)
    toast.error(toAppError(error).message)
  }
}
