import { useEffect } from 'react'

const BASE_TITLE = 'HelpDesk Chat'

/** "(3) HelpDesk Chat" in the browser tab while there are unread messages. */
export const useUnreadTitle = (count: number) => {
  useEffect(() => {
    document.title = count > 0 ? `(${count > 99 ? '99+' : count}) ${BASE_TITLE}` : BASE_TITLE
    return () => {
      document.title = BASE_TITLE
    }
  }, [count])
}
