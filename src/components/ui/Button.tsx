import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
}

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-primary-fg hover:bg-primary-hover shadow-sm',
  secondary: 'bg-surface text-fg border border-line hover:bg-surface-2',
  ghost: 'text-muted hover:text-fg hover:bg-surface-2',
  danger: 'bg-danger text-white hover:opacity-90',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
}

export const Button = ({ variant = 'primary', size = 'md', loading, icon, className, children, disabled, ...rest }: ButtonProps) => (
  <button
    type="button"
    className={cn(
      'inline-flex items-center justify-center font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
      variants[variant],
      sizes[size],
      className,
    )}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    {...rest}
  >
    {loading ? <Spinner size={16} /> : icon}
    {children}
  </button>
)

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  /** 'round': bordered circle used in the top bar. */
  shape?: 'plain' | 'round'
}

export const IconButton = ({ label, shape = 'plain', className, children, ...rest }: IconButtonProps) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    className={cn(
      'inline-flex items-center justify-center text-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-40',
      shape === 'round' ? 'size-11 rounded-full border border-line bg-surface text-fg' : 'size-9 rounded-lg',
      className,
    )}
    {...rest}
  >
    {children}
  </button>
)
