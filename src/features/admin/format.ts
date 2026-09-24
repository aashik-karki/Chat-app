const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 })
const whole = new Intl.NumberFormat()
const percent = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 })

/** 1,284 → "1,284"; 12,900 → "12.9K" (auto-compacts above 9,999). */
export const formatCount = (value: number) => (Math.abs(value) >= 10_000 ? compact.format(value) : whole.format(value))

export const formatMinute = (minute: string) =>
  new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(`${minute}:00Z`))

/** "2026-09-24" (a calendar day) → "Sep 24" / with year "Sep 24, 2026". */
export const formatDay = (date: string, withYear = false) =>
  new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}), timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`))

/** Percent change from `previous` to `current`; null when there is nothing to compare with. */
export const percentChange = (current: number, previous: number): number | null => (previous === 0 ? (current === 0 ? 0 : null) : ((current - previous) / previous) * 100)

export const formatPercent = (value: number) => `${percent.format(Math.abs(value))}%`
