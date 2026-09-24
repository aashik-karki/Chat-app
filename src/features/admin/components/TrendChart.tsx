import { type KeyboardEvent, type PointerEvent, useId, useRef, useState } from 'react'
import { cn } from '../../../lib/cn'
import { formatCount } from '../format'

export interface TrendPoint {
  /** Short x-axis label ("Sep 24", "14:05"). */
  label: string
  /** Longer label for the tooltip ("Sep 24, 2026"). */
  title: string
  value: number
  /** Same point one period earlier (drawn dashed). */
  previous?: number
}

interface TrendChartProps {
  points: TrendPoint[]
  seriesLabel: string
  previousLabel?: string
  height?: number
  /** Accessible name for the chart. */
  ariaLabel: string
}

/** Axis maximum = 4 × a tidy step (1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8 × 10ⁿ), so every gridline is a whole, round number. */
const niceMax = (value: number) => {
  if (value <= 4) return 4
  const rawStep = value / 4
  const power = 10 ** Math.floor(Math.log10(rawStep))
  const step = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((k) => k * power).find((candidate) => candidate >= rawStep && Number.isInteger(candidate)) ?? Math.ceil(rawStep)
  return step * 4
}

const toPath = (values: number[], max: number) =>
  values.map((value, i) => `${i ? 'L' : 'M'}${((i / Math.max(1, values.length - 1)) * 100).toFixed(3)},${(100 - (value / max) * 100).toFixed(3)}`).join(' ')

/**
 * Line chart for one series (+ an optional dashed comparison line).
 * Scales with its container: the SVG stretches, strokes don't (non-scaling-stroke),
 * and the dot, crosshair and tooltip are HTML placed by percentage.
 * Hover or arrow keys move the crosshair; a hidden table carries the same numbers for screen readers.
 */
export const TrendChart = ({ points, seriesLabel, previousLabel, height = 240, ariaLabel }: TrendChartProps) => {
  const [active, setActive] = useState<number | null>(null)
  const plot = useRef<HTMLDivElement>(null)
  const tableId = useId()
  const hasPrevious = points.some((point) => point.previous !== undefined)
  const max = niceMax(Math.max(1, ...points.map((point) => Math.max(point.value, point.previous ?? 0))))
  const ticks = [max, (max * 3) / 4, max / 2, max / 4, 0]
  const count = points.length
  const xOf = (i: number) => (i / Math.max(1, count - 1)) * 100
  const shown = active ?? count - 1
  const point = points[shown]
  // ~6 evenly spaced x labels, always including the first and the last point.
  // Prefer a label count that divides the points evenly (7 days → 4 labels, 2 days apart).
  const labelCount = count <= 6 ? count : ([6, 5, 4].find((n) => (count - 1) % (n - 1) === 0) ?? 6)
  const labelled = new Set(Array.from({ length: labelCount }, (_, k) => Math.round((k * (count - 1)) / Math.max(1, labelCount - 1))))

  const onPointer = (event: PointerEvent<HTMLDivElement>) => {
    const box = plot.current?.getBoundingClientRect()
    if (!box || count === 0) return
    const ratio = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width))
    setActive(Math.round(ratio * (count - 1)))
  }

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') setActive(Math.max(0, shown - 1))
    else if (event.key === 'ArrowRight') setActive(Math.min(count - 1, shown + 1))
    else if (event.key === 'Home') setActive(0)
    else if (event.key === 'End') setActive(count - 1)
    else return
    event.preventDefault()
  }

  if (count === 0) return null
  const tipOnLeft = xOf(shown) > 60

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap justify-end gap-x-5 gap-y-1 text-[13px] text-muted">
        <span className="inline-flex items-center gap-2">
          <svg width="18" height="4" aria-hidden="true">
            <line x1="1" y1="2" x2="17" y2="2" stroke="var(--chart-series)" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          {seriesLabel}
        </span>
        {hasPrevious && previousLabel && (
          <span className="inline-flex items-center gap-2">
            <svg width="18" height="4" aria-hidden="true">
              <line x1="1" y1="2" x2="17" y2="2" stroke="var(--chart-muted)" strokeWidth="2" strokeDasharray="4 3" strokeLinecap="round" />
            </svg>
            {previousLabel}
          </span>
        )}
      </div>

      <div className="flex gap-3" style={{ height }}>
        <div className="flex w-9 shrink-0 flex-col justify-between pb-7 text-right text-xs text-muted tabular-nums" aria-hidden="true">
          {ticks.map((tick) => (
            <span key={tick} className="-my-2">
              {formatCount(Math.round(tick))}
            </span>
          ))}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div
            ref={plot}
            className="relative min-h-0 flex-1 cursor-crosshair touch-pan-y rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            role="img"
            aria-label={`${ariaLabel}. Use the left and right arrow keys to read each point.`}
            aria-describedby={tableId}
            tabIndex={0}
            onPointerMove={onPointer}
            onPointerDown={onPointer}
            onPointerLeave={() => setActive(null)}
            onKeyDown={onKey}
            onBlur={() => setActive(null)}
          >
            <svg className="absolute inset-0 size-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {[0, 25, 50, 75].map((y) => (
                <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="var(--chart-grid)" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
              ))}
              <line x1="0" x2="100" y1="100" y2="100" stroke="var(--line)" vectorEffect="non-scaling-stroke" />
              <path d={`${toPath(points.map((p) => p.value), max)} L100,100 L0,100 Z`} fill="var(--chart-series)" fillOpacity="0.08" />
              {hasPrevious && (
                <path d={toPath(points.map((p) => p.previous ?? 0), max)} fill="none" stroke="var(--chart-muted)" strokeWidth="2" strokeDasharray="5 4" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              )}
              <path d={toPath(points.map((p) => p.value), max)} fill="none" stroke="var(--chart-series)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </svg>

            {point && active !== null && (
              <>
                <span className="pointer-events-none absolute inset-y-0 border-l border-dashed border-subtle" style={{ left: `${xOf(shown)}%` }} aria-hidden="true" />
                <span
                  className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-chart-series ring-2 ring-surface"
                  style={{ left: `${xOf(shown)}%`, top: `${100 - (point.value / max) * 100}%` }}
                  aria-hidden="true"
                />
                <div
                  className={cn(
                    'pointer-events-none absolute top-1 z-10 flex w-max max-w-[220px] flex-col gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-3 shadow-lg transition-opacity',
                    active === null && 'opacity-0',
                  )}
                  style={tipOnLeft ? { right: `calc(${100 - xOf(shown)}% + 12px)` } : { left: `calc(${xOf(shown)}% + 12px)` }}
                  aria-hidden="true"
                >
                  <span className="text-[13px] font-semibold text-fg">{point.title}</span>
                  <span className="flex items-center gap-2 text-[13px] text-muted">
                    <span className="h-0.5 w-3.5 rounded-full bg-chart-series" />
                    <strong className="text-fg tabular-nums">{formatCount(point.value)}</strong> {seriesLabel.toLowerCase()}
                  </span>
                  {point.previous !== undefined && previousLabel && (
                    <span className="flex items-center gap-2 text-[13px] text-muted">
                      <span className="w-3.5 border-t-2 border-dashed border-chart-muted" />
                      <strong className="text-fg tabular-nums">{formatCount(point.previous)}</strong> {previousLabel.toLowerCase()}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="relative h-5 text-xs text-muted" aria-hidden="true">
            {points.map((p, i) =>
              labelled.has(i) ? (
                <span
                  key={i}
                  className={cn('absolute whitespace-nowrap', i === 0 ? '' : i === count - 1 ? '-translate-x-full' : '-translate-x-1/2')}
                  style={{ left: `${xOf(i)}%` }}
                >
                  {p.label}
                </span>
              ) : null,
            )}
          </div>
        </div>
      </div>

      <table id={tableId} className="sr-only">
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Time</th>
            <th scope="col">{seriesLabel}</th>
            {hasPrevious && previousLabel && <th scope="col">{previousLabel}</th>}
          </tr>
        </thead>
        <tbody>
          {points.map((p, i) => (
            <tr key={i}>
              <th scope="row">{p.title}</th>
              <td>{p.value}</td>
              {hasPrevious && previousLabel && <td>{p.previous ?? 0}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
