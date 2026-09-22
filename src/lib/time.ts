/** Renders an ISO timestamp as a local clock time, e.g. "10:42 AM". */
export const formatClockTime = (value: string) => new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
