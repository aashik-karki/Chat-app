import { MessagesSquare } from 'lucide-react'
import type { ReactNode } from 'react'

export const AuthLayout = ({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer?: ReactNode }) => (
  <main className="flex min-h-svh items-center justify-center bg-bg px-4 py-10">
    <div className="w-full max-w-md">
      <div className="mb-8 flex items-center justify-center gap-2.5 text-fg">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-fg shadow-sm">
          <MessagesSquare size={20} />
        </span>
        <span className="text-lg font-semibold tracking-tight">HelpDesk Chat</span>
      </div>
      <div className="rounded-3xl border border-line bg-surface p-7 shadow-sm sm:p-8">
        <h1 className="text-xl font-semibold text-fg">{title}</h1>
        <p className="mt-1 mb-6 text-sm text-muted">{subtitle}</p>
        {children}
      </div>
      {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
    </div>
  </main>
)
