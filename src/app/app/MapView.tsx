'use client'

import { useRef, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppUserButton } from './AppUserButton'

// Slug → CSS color name
const PATTERN_COLOR: Record<string, string> = {
  'arrays-hashing':  'arrays',
  'two-pointers':    'twopointers',
  'sliding-window':  'sliding',
  'stack':           'stack',
  'binary-search':   'binsearch',
  'linked-list':     'linked',
  'trees':           'trees',
  'heap':            'heap',
  'graphs':          'graphs',
}

type DisplayStatus = 'done' | 'current' | 'locked'

interface Problem {
  slug: string
  title: string
  difficulty: string
  xpReward: number
  displayStatus: DisplayStatus
}

interface Pattern {
  slug: string
  title: string
  icon: string
  isPublished: boolean
  problems: Problem[]
}

interface Props {
  patterns: Pattern[]
  xp: number
  streak: number
}

// ── Sine-wave arc offset ──────────────────────────────────────
function offsetFor(globalIdx: number): number {
  return Math.sin(globalIdx * 0.95 + 0.4) * 110
}

// ── SVG arc connectors ────────────────────────────────────────
interface Pt { x: number; y: number }
interface NodeMeta { state: string; color: string }

function PathConnectors({
  boardRef,
  nodeRefs,
  nodeMeta,
}: {
  boardRef: React.RefObject<HTMLDivElement | null>
  nodeRefs: React.MutableRefObject<(HTMLDivElement | null)[]>
  nodeMeta: NodeMeta[]
}) {
  const [dims, setDims] = useState<{ w: number; h: number; pts: (Pt | null)[] }>({
    w: 0, h: 0, pts: [],
  })

  useEffect(() => {
    function measure() {
      const board = boardRef.current
      if (!board) return
      const pr = board.getBoundingClientRect()
      const pts = nodeRefs.current.map((el) => {
        if (!el) return null
        const r = el.getBoundingClientRect()
        return { x: r.left + r.width / 2 - pr.left, y: r.top + r.height / 2 - pr.top }
      })
      setDims({ w: pr.width, h: pr.height, pts })
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (boardRef.current) ro.observe(boardRef.current)
    window.addEventListener('resize', measure)
    const t = setTimeout(measure, 80)
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); clearTimeout(t) }
  // boardRef and nodeRefs are stable refs — intentional omission
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pts = dims.pts
  const valid = pts.filter(Boolean) as Pt[]
  if (valid.length < 2 || !dims.w) return null

  const clamp = (i: number) => valid[Math.max(0, Math.min(valid.length - 1, i))]
  const tension = 0.5

  return (
    <svg
      className="board-svg"
      width={dims.w}
      height={dims.h}
      viewBox={`0 0 ${dims.w} ${dims.h}`}
      aria-hidden="true"
    >
      {valid.slice(1).map((p2, i) => {
        const p0 = clamp(i - 1)
        const p1 = clamp(i)
        const p3 = clamp(i + 2)
        const c1 = {
          x: p1.x + ((p2.x - p0.x) / 6) * tension * 2,
          y: p1.y + ((p2.y - p0.y) / 6) * tension * 2,
        }
        const c2 = {
          x: p2.x - ((p3.x - p1.x) / 6) * tension * 2,
          y: p2.y - ((p3.y - p1.y) / 6) * tension * 2,
        }
        const d = `M ${p1.x} ${p1.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`
        const dest = nodeMeta[i + 1]
        const reached = dest && (dest.state === 'completed' || dest.state === 'current')
        return (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={reached ? `var(--c-${dest.color})` : 'var(--stone-2)'}
            strokeOpacity={reached ? 0.65 : 0.7}
            strokeWidth={7}
            strokeLinecap="round"
            strokeDasharray="0 16"
          />
        )
      })}
    </svg>
  )
}

// ── Icons ─────────────────────────────────────────────────────
function FlameIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M12 2c1 3 3 4 3 7a3 3 0 1 1-6 0c0-1 .5-1.7 1-2.5C8.5 9 6 11 6 14.5 6 18.6 8.9 22 13 22s8-3.4 8-7.5C21 9 16 7 12 2z"
            fill="#FF9F2E" stroke="#E08A1A" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M13 13c.5 1.5 2 2 2 3.5A2.5 2.5 0 0 1 12.5 19c-1.5 0-2.5-1-2.5-2.3 0-1.3 1-1.7 1.5-3.7.6 1 1.3 1.2 1.5 0z"
            fill="#FFD24D" />
    </svg>
  )
}

function BoltIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"
            fill="currentColor" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="36" height="36" aria-hidden="true">
      <path d="M5 12.5 10 17 19 7" fill="none" stroke="currentColor"
            strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LockIcon({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" fill="currentColor" />
      <path d="M8 11V8a4 4 0 1 1 8 0v3" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <path d="M12 3l2.7 5.5 6.1.9-4.4 4.3 1 6L12 17l-5.4 2.8 1-6L3.2 9.4l6.1-.9L12 3z"
            fill="currentColor" />
    </svg>
  )
}

// ── MapView ───────────────────────────────────────────────────
type RowKind =
  | { kind: 'banner'; pattern: Pattern; status: string; doneCount: number; color: string }
  | { kind: 'node'; problem: Problem; state: string; color: string; globalIdx: number; isCurrent: boolean }

export function MapView({ patterns, xp, streak }: Props) {
  const router = useRouter()
  const boardRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([])

  const rows: RowKind[] = []
  const nodeMeta: NodeMeta[] = []
  let globalIdx = 0

  for (const pattern of patterns) {
    const color = PATTERN_COLOR[pattern.slug] ?? 'arrays'
    const doneCount = pattern.problems.filter(p => p.displayStatus === 'done').length
    const allDone = doneCount === pattern.problems.length && pattern.problems.length > 0
    const hasCurrent = pattern.problems.some(p => p.displayStatus === 'current')
    const status = !pattern.isPublished ? 'locked'
      : allDone ? 'completed'
      : hasCurrent ? 'current'
      : 'locked'

    rows.push({ kind: 'banner', pattern, status, doneCount, color })

    for (const problem of pattern.problems) {
      const state: string = !pattern.isPublished ? 'locked'
        : problem.displayStatus === 'done' ? 'completed'
        : problem.displayStatus
      const isCurrent = state === 'current'
      rows.push({ kind: 'node', problem, state, color, globalIdx, isCurrent })
      nodeMeta.push({ state, color })
      globalIdx++
    }
  }

  // Reset refs array each render; individual refs are assigned via callback below
  nodeRefs.current = new Array(globalIdx).fill(null)

  return (
    <>
      {/* Brand + stats bar */}
      <div className="gmap-bar">
        <div className="brand">
          <span className="brand-dot" />
          <span>grind.lc</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="stat-group">
            <div className="stat stat-streak">
              <span className="stat-icon"><FlameIcon /></span>
              <span className="num">{streak}</span>
            </div>
            <div className="stat stat-xp">
              <span className="stat-icon"><BoltIcon /></span>
              <span className="num">{xp.toLocaleString()}</span>
            </div>
          </div>
          <AppUserButton />
        </div>
      </div>

      <div className="section-title">Your path</div>
      <div className="section-sub">9 patterns · build the habit of how strong engineers think.</div>

      {/* Board */}
      <div className="board" ref={boardRef}>
        <PathConnectors boardRef={boardRef} nodeRefs={nodeRefs} nodeMeta={nodeMeta} />

        <div className="start-banner"><i />Start of journey</div>

        {rows.map((row) => {
          if (row.kind === 'banner') {
            const locked = row.status === 'locked'
            const pct = row.pattern.problems.length > 0
              ? Math.round(row.doneCount / row.pattern.problems.length * 100)
              : 0
            const colorStyle = !locked
              ? ({
                  '--pcolor': `var(--c-${row.color})`,
                  '--pshadow': `var(--c-${row.color}-shadow)`,
                } as React.CSSProperties)
              : undefined
            return (
              <div
                key={`b-${row.pattern.slug}`}
                className={`region ${row.status}`}
                style={colorStyle}
              >
                <div className="meta">
                  <div className="eyebrow">
                    Pattern ·{' '}
                    {locked ? 'locked' : row.status === 'completed' ? 'complete' : 'in progress'}
                  </div>
                  <h2>{row.pattern.title}</h2>
                </div>
                {!locked ? (
                  <div className="rprogress">
                    <span>{row.doneCount}/{row.pattern.problems.length}</span>
                    <div className="rprogress-bar">
                      <i style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                ) : (
                  <div className="rprogress">
                    <LockIcon size={14} />
                    <span>Locked</span>
                  </div>
                )}
              </div>
            )
          }

          // Node row
          const tx = offsetFor(row.globalIdx)
          return (
            <div
              key={`n-${row.problem.slug}`}
              className="brow brow-node"
              id={row.isCurrent ? 'current-node' : undefined}
            >
              <div
                ref={(el) => { nodeRefs.current[row.globalIdx] = el }}
                className="node"
                data-state={row.state}
                style={{
                  transform: `translateX(${tx}px)`,
                  '--pcolor': `var(--c-${row.color})`,
                  '--pshadow': `var(--c-${row.color}-shadow)`,
                } as React.CSSProperties}
              >
                <button
                  className="node-btn"
                  aria-label={row.problem.title}
                  title={row.problem.title}
                  disabled={row.state === 'locked'}
                  onClick={() => {
                    if (row.state !== 'locked') {
                      router.push(`/app/lesson/${row.problem.slug}`)
                    }
                  }}
                >
                  <span className="node-icon">
                    {row.state === 'locked'    && <LockIcon />}
                    {row.state === 'completed' && <CheckIcon />}
                    {row.state === 'current'   && <StarIcon />}
                  </span>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="path-end">End of curriculum · more patterns coming soon</div>
    </>
  )
}
