import type { ReactNode } from 'react'

export const EmptyState = ({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) => (
  <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
    {icon && <div className="mb-1 rounded-2xl bg-surface-2 p-3 text-muted">{icon}</div>}
    <p className="font-semibold text-fg">{title}</p>
    {children && <div className="max-w-sm text-sm text-muted">{children}</div>}
  </div>
)
