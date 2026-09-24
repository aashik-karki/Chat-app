import { Download, FileJson, FileSpreadsheet } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { IconButton } from '../../../components/ui/Button'
import { Spinner } from '../../../components/ui/Spinner'
import { toAppError } from '../../../lib/errors'
import { toast } from '../../../stores/toast.store'
import { chatApi } from '../chat.api'

/** Downloads the FULL history from the server (not just what's loaded on screen). */
export const ExportMenu = ({ conversationId }: { conversationId: string }) => {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<'json' | 'csv' | null>(null)
  const menu = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => !menu.current?.contains(event.target as Node) && setOpen(false)
    const escape = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  const run = async (format: 'json' | 'csv') => {
    setBusy(format)
    try {
      await chatApi.exportHistory(conversationId, format)
      toast.success(`Chat history downloaded (${format.toUpperCase()}).`)
      setOpen(false)
    } catch (error) {
      toast.error(toAppError(error).message)
    } finally {
      setBusy(null)
    }
  }

  const item = (format: 'json' | 'csv', Icon: typeof FileJson, label: string, hint: string) => (
    <button
      type="button"
      role="menuitem"
      disabled={busy !== null}
      onClick={() => void run(format)}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-surface-2 disabled:opacity-60"
    >
      {busy === format ? <Spinner size={16} /> : <Icon size={16} className="text-muted" />}
      <span>
        <span className="block text-sm font-medium text-fg">{label}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
    </button>
  )

  return (
    <div className="relative" ref={menu}>
      <IconButton label="Export chat history" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <Download size={18} />
      </IconButton>
      {open && (
        <div role="menu" className="absolute right-0 z-20 mt-1 w-56 rounded-xl border border-line bg-surface p-1.5 shadow-lg">
          <p className="px-3 pt-1 pb-1.5 text-xs font-semibold text-subtle uppercase">Export history</p>
          {item('json', FileJson, 'JSON', 'All fields, for developers')}
          {item('csv', FileSpreadsheet, 'CSV', 'Opens in Excel / Sheets')}
        </div>
      )}
    </div>
  )
}
