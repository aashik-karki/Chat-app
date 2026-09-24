const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 })
const whole = new Intl.NumberFormat()

/** 1,284 → "1,284"; 12,900 → "12.9K" (stat tiles auto-compact above 9,999). */
export const formatCount = (value: number) => (Math.abs(value) >= 10_000 ? compact.format(value) : whole.format(value))

export const formatMinute = (minute: string) =>
  new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(`${minute}:00Z`))
