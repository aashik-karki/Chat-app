import { useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/shadcn/table'
import { formatCount, formatMinute } from '../format'

interface Point {
  minute: string
  messages: number
}

const HEIGHT = 220
const PAD = { top: 18, right: 44, bottom: 26, left: 34 }

/** 0 → [0,1]; 7 → [0,2,4,6,8]; 130 → [0,50,100,150]: 1-2-5 steps, 3-5 ticks. */
const niceTicks = (max: number) => {
  if (max <= 0) return [0, 1]
  const rough = max / 4
  const power = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 5, 10].map((m) => m * power).find((candidate) => candidate >= rough) ?? power * 10
  const ticks = []
  for (let value = 0; value <= max + step * 0.001; value += step) ticks.push(value)
  if (ticks[ticks.length - 1]! < max) ticks.push(ticks[ticks.length - 1]! + step)
  return ticks
}

/**
 * Messages per minute, last 60 minutes. One series → no legend (the title names it).
 * Crosshair + tooltip on hover AND keyboard (← →); a table view carries every value too.
 */
export function MessagesChart({ points }: { points: Point[] }) {
  const wrap = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(640)
  const [active, setActive] = useState<number | null>(null)
  const [asTable, setAsTable] = useState(false)

  useLayoutEffect(() => {
    const element = wrap.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => entry && setWidth(Math.max(280, Math.round(entry.contentRect.width))))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const { ticks, x, y, line, area, total, peak } = useMemo(() => {
    const max = Math.max(0, ...points.map((point) => point.messages))
    const ticks = niceTicks(max)
    const top = ticks[ticks.length - 1]!
    const innerW = width - PAD.left - PAD.right
    const innerH = HEIGHT - PAD.top - PAD.bottom
    const x = (index: number) => PAD.left + (points.length <= 1 ? 0 : (index / (points.length - 1)) * innerW)
    const y = (value: number) => PAD.top + innerH - (value / top) * innerH
    const coords = points.map((point, index) => `${x(index).toFixed(1)},${y(point.messages).toFixed(1)}`)
    const line = coords.length ? `M${coords.join('L')}` : ''
    const area = coords.length ? `${line}L${x(points.length - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z` : ''
    const total = points.reduce((sum, point) => sum + point.messages, 0)
    const peak = points.reduce<Point | null>((best, point) => (!best || point.messages > best.messages ? point : best), null)
    return { ticks, x, y, line, area, total, peak }
  }, [points, width])

  const last = points.length - 1
  const shown = active ?? null
  const summary = `Messages per minute over the last ${points.length} minutes: ${total} in total${peak && peak.messages > 0 ? `, peak ${peak.messages} at ${formatMinute(peak.minute)}` : ''}.`

  const pick = (event: PointerEvent<SVGRectElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    const ratio = (event.clientX - box.left) / box.width
    setActive(Math.max(0, Math.min(last, Math.round(ratio * last))))
  }

  const onKey = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key === 'ArrowLeft') setActive((index) => Math.max(0, (index ?? last) - 1))
    else if (event.key === 'ArrowRight') setActive((index) => Math.min(last, (index ?? last) + 1))
    else if (event.key === 'Escape') setActive(null)
    else return
    event.preventDefault()
  }

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => setAsTable((value) => !value)} aria-pressed={asTable}>
          {asTable ? 'Show chart' : 'Show as table'}
        </button>
      </div>

      {asTable ? (
        <div className="max-h-[220px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Minute</TableHead>
                <TableHead className="text-right">Messages</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...points].reverse().map((point) => (
                <TableRow key={point.minute}>
                  <TableCell className="py-1.5 text-muted-foreground">{formatMinute(point.minute)}</TableCell>
                  <TableCell className="py-1.5 text-right tabular-nums">{point.messages}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div ref={wrap} className="relative w-full select-none">
          <svg
            width={width}
            height={HEIGHT}
            viewBox={`0 0 ${width} ${HEIGHT}`}
            role="img"
            aria-label={summary}
            tabIndex={0}
            onKeyDown={onKey}
            onBlur={() => setActive(null)}
            className="block overflow-visible outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            {/* recessive hairline grid + y ticks */}
            {ticks.map((tick) => (
              <g key={tick}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(tick)} y2={y(tick)} stroke="var(--chart-grid)" strokeWidth={1} shapeRendering="crispEdges" />
                <text x={PAD.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-subtle text-[11px] tabular-nums">
                  {formatCount(tick)}
                </text>
              </g>
            ))}
            {/* x ticks every 15 minutes */}
            {points.map((point, index) =>
              index % 15 === 0 || index === last ? (
                <text key={point.minute} x={x(index)} y={HEIGHT - 6} textAnchor={index === 0 ? 'start' : index === last ? 'end' : 'middle'} className="fill-subtle text-[11px]">
                  {index === last ? 'now' : formatMinute(point.minute)}
                </text>
              ) : null,
            )}

            <path d={area} fill="var(--chart-series)" fillOpacity={0.1} />
            <path d={line} fill="none" stroke="var(--chart-series)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

            {/* end marker + direct label (the one value worth labelling: "now") */}
            {last >= 0 && (
              <>
                <circle cx={x(last)} cy={y(points[last]!.messages)} r={4} fill="var(--chart-series)" stroke="var(--surface)" strokeWidth={2} />
                <text x={x(last) + 8} y={y(points[last]!.messages)} dy="0.32em" className="fill-fg text-[12px] font-semibold tabular-nums">
                  {points[last]!.messages}
                </text>
              </>
            )}

            {/* crosshair */}
            {shown !== null && points[shown] && (
              <g pointerEvents="none">
                <line x1={x(shown)} x2={x(shown)} y1={PAD.top} y2={HEIGHT - PAD.bottom} stroke="var(--subtle)" strokeWidth={1} shapeRendering="crispEdges" />
                <circle cx={x(shown)} cy={y(points[shown]!.messages)} r={4} fill="var(--chart-series)" stroke="var(--surface)" strokeWidth={2} />
              </g>
            )}

            {/* hit area: the whole plot, so the reader aims at a time, not at a 2px line */}
            <rect
              x={PAD.left}
              y={PAD.top}
              width={Math.max(0, width - PAD.left - PAD.right)}
              height={HEIGHT - PAD.top - PAD.bottom}
              fill="transparent"
              onPointerMove={pick}
              onPointerLeave={() => setActive(null)}
            />
          </svg>

          {shown !== null && points[shown] && (
            <div
              role="status"
              className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs shadow-md"
              style={{ left: Math.min(Math.max(x(shown), 60), width - 60) }}
            >
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-3 rounded-full bg-chart-series" aria-hidden="true" />
                <strong className="text-sm text-foreground tabular-nums">{points[shown]!.messages}</strong>
                <span className="text-muted-foreground">messages</span>
              </span>
              <span className="block text-subtle">{formatMinute(points[shown]!.minute)}</span>
            </div>
          )}
          {total === 0 && <p className="pointer-events-none absolute inset-x-0 top-1/3 text-center text-sm text-muted-foreground">No messages in the last hour</p>}
        </div>
      )}
      <p className="sr-only">{summary}</p>
    </div>
  )
}
