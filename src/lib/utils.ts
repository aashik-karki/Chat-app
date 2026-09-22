import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merges Tailwind class lists, letting a later class override an earlier conflicting one (shadcn/ui's standard helper). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
