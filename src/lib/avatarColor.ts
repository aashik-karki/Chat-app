// A fixed palette of static Tailwind classes. Tailwind's build-time scanner
// only picks up class names it can see literally in source, so this can't
// be assembled from a runtime hex value (e.g. `bg-[${color}]`) — instead we
// deterministically map each user id onto one of these known classes.
const AVATAR_PALETTE = [
  'bg-violet-500',
  'bg-orange-500',
  'bg-sky-500',
  'bg-pink-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-indigo-500',
  'bg-rose-500',
] as const

/** Stable, deterministic avatar background class for a given user id. */
export function avatarColorClass(id: string): string {
  let hash = 0
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]
}
