const names = (list: string[]) =>
  list.length === 1 ? `${list[0]} is typing` : list.length === 2 ? `${list[0]} and ${list[1]} are typing` : 'Several people are typing'

export const TypingIndicator = ({ typers }: { typers: string[] }) => (
  <div className="h-6 px-4 text-xs text-muted" aria-live="polite">
    {typers.length > 0 && (
      <span className="inline-flex items-center gap-2">
        <span className="inline-flex gap-0.5" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-1.5 rounded-full bg-subtle" style={{ animation: `typing-dot 1.2s ${i * 0.15}s infinite` }} />
          ))}
        </span>
        {names(typers)}…
      </span>
    )}
  </div>
)
