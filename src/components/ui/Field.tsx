import { useId, type InputHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
}

export const Field = ({ label, error, hint, className, ...input }: FieldProps) => {
  const id = useId()
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy}
        className={cn(
          'h-11 rounded-xl border bg-surface px-3.5 text-sm text-fg outline-none transition placeholder:text-subtle',
          'focus:border-primary focus:ring-4 focus:ring-primary/15',
          error ? 'border-danger' : 'border-line',
        )}
        {...input}
      />
      {error ? (
        <p id={`${id}-error`} className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
