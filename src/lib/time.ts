const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })
const dayFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

export const formatTime = (iso: string) => timeFormat.format(new Date(iso))

export const formatDay = (iso: string) => {
  const date = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today.getTime() - 86_400_000)
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return dayFormat.format(date)
}

/** Compact time for lists: 9:41 AM today, otherwise Mon, Sep 22. */
export const formatListTime = (iso: string | null) => {
  if (!iso) return ''
  const date = new Date(iso)
  return date.toDateString() === new Date().toDateString() ? timeFormat.format(date) : dayFormat.format(date)
}

/** "last seen 5 minutes ago" */
/** "just now", "5 minutes ago", "2 days ago". */
export const formatAgo = (iso: string) => {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000)
  const abs = Math.abs(seconds)
  if (abs < 60) return 'just now'
  if (abs < 3600) return relative.format(Math.round(seconds / 60), 'minute')
  if (abs < 86_400) return relative.format(Math.round(seconds / 3600), 'hour')
  return relative.format(Math.round(seconds / 86_400), 'day')
}

export const formatLastSeen = (iso: string | null) => (iso ? `last seen ${formatAgo(iso)}` : 'offline')
