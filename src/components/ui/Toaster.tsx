import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useToastStore } from '../../stores/toast.store'

const icons = { info: Info, success: CircleCheck, error: CircleAlert }
const tones = { info: 'text-primary', success: 'text-success', error: 'text-danger' }

export const Toaster = () => {
  const toasts = useToastStore((state) => state.toasts)
  const dismiss = useToastStore((state) => state.dismiss)

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:right-4 sm:left-auto sm:items-end" aria-live="polite">
      {toasts.map((item) => {
        const Icon = icons[item.tone]
        return (
          <div
            key={item.id}
            role={item.tone === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-line bg-surface p-3.5 shadow-lg animate-[toast-in_160ms_ease-out]"
          >
            <Icon size={18} className={cn('mt-0.5 shrink-0', tones[item.tone])} />
            <p className="flex-1 text-sm text-fg">{item.message}</p>
            {item.action && (
              <button
                type="button"
                className="text-sm font-semibold text-primary hover:underline"
                onClick={() => {
                  item.action!.run()
                  dismiss(item.id)
                }}
              >
                {item.action.label}
              </button>
            )}
            <button type="button" aria-label="Dismiss" className="text-subtle hover:text-fg" onClick={() => dismiss(item.id)}>
              <X size={16} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
