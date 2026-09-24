import { cn } from '../../lib/cn'

/** HelpDesk logo: blue chat bubble (+ name unless compact). */
export const BrandMark = ({ compact = false, className }: { compact?: boolean; className?: string }) => (
  <span className={cn('flex items-center gap-2.5 text-fg', className)}>
    <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true" className="shrink-0">
      <path d="M6 4h18a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H13l-7 5v-5H6a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4z" fill="#2563eb" />
      <path d="M9 13h.01M15 13h.01M21 13h.01" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
    </svg>
    {!compact && <span className="text-xl font-bold tracking-tight">HelpDesk</span>}
  </span>
)
