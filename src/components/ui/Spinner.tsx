export const Spinner = ({ size = 20, label = 'Loading' }: { size?: number; label?: string }) => (
  <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none" role="status" aria-label={label}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
)

export const PageSpinner = ({ label = 'Loading' }: { label?: string }) => (
  <div className="flex h-full min-h-40 flex-1 items-center justify-center gap-3 text-muted">
    <Spinner /> <span className="text-sm">{label}…</span>
  </div>
)
