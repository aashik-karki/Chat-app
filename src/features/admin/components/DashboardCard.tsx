import type { ReactNode } from 'react'
import { cn } from '../../../lib/cn'

interface DashboardCardProps {
  title: ReactNode
  description?: ReactNode
  /** Right side of the header: a link, a toggle, a count. */
  action?: ReactNode
  id?: string
  className?: string
  children: ReactNode
}

/** The white rounded card every dashboard block sits in (title + optional description/action). */
export const DashboardCard = ({ title, description, action, id, className, children }: DashboardCardProps) => (
  <section id={id} aria-labelledby={id ? `${id}-title` : undefined} className={cn('flex min-w-0 scroll-mt-6 flex-col gap-5 rounded-[20px] border border-line bg-surface p-5 sm:p-6', className)}>
    <header className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <h2 id={id ? `${id}-title` : undefined} className="text-lg font-semibold tracking-tight text-fg">
          {title}
        </h2>
        {description && <p className="text-[13px] text-muted">{description}</p>}
      </div>
      {action}
    </header>
    {children}
  </section>
)
