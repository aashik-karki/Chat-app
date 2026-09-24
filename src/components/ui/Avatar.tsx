import { cn } from '../../lib/cn'
import { initials } from '../../lib/initials'

const PALETTE = ['#6366f1', '#0ea5e9', '#14b8a6', '#f59e0b', '#ec4899', '#8b5cf6', '#22c55e', '#ef4444']

const colorFor = (seed: string) => {
  let hash = 0
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

type Presence = 'online' | 'busy' | 'offline' | undefined

interface AvatarProps {
  name: string
  seed?: string
  size?: 'sm' | 'md' | 'lg'
  presence?: Presence
}

const sizes = { sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-14 text-lg' }
const dots = { online: 'bg-success', busy: 'bg-warning', offline: 'bg-subtle' }

export const Avatar = ({ name, seed, size = 'md', presence }: AvatarProps) => (
  <span className="relative inline-flex shrink-0">
    <span
      className={cn('inline-flex items-center justify-center rounded-full font-semibold text-white', sizes[size])}
      style={{ backgroundColor: colorFor(seed ?? name) }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
    {presence && (
      <span
        className={cn('absolute -right-0.5 -bottom-0.5 size-3 rounded-full ring-2 ring-surface', dots[presence])}
        role="img"
        aria-label={presence}
      />
    )}
  </span>
)
