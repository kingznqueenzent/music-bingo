'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Minus, Plus, RotateCcw } from 'lucide-react'

const MIN_SCALE = 1
const MAX_SCALE = 2.6
const STEP = 0.2

function clampScale(n: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(n * 100) / 100))
}

export type BingoCardZoomProps = {
  children: ReactNode
  className?: string
  /** Show floating +/- / reset controls (default true). */
  showControls?: boolean
}

/**
 * Pinch / trackpad zoom + pan wrapper for the player bingo card.
 * Single-finger taps still reach the card; two-finger pinch scales the board.
 */
export function BingoCardZoom({ children, className = '', showControls = true }: BingoCardZoomProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const scaleRef = useRef(1)
  const offsetRef = useRef({ x: 0, y: 0 })
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pinchStartRef = useRef<{ distance: number; scale: number; midX: number; midY: number } | null>(
    null
  )
  const panStartRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  useEffect(() => {
    scaleRef.current = scale
  }, [scale])
  useEffect(() => {
    offsetRef.current = offset
  }, [offset])

  const resetZoom = useCallback(() => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }, [])

  const zoomBy = useCallback((delta: number) => {
    setScale((prev) => {
      const next = clampScale(prev + delta)
      if (next <= MIN_SCALE) setOffset({ x: 0, y: 0 })
      return next
    })
  }, [])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      // Trackpad pinch often comes as ctrl+wheel; also allow alt+wheel.
      if (!e.ctrlKey && !e.metaKey && !e.altKey) return
      e.preventDefault()
      const direction = e.deltaY > 0 ? -STEP / 2 : STEP / 2
      setScale((prev) => {
        const next = clampScale(prev + direction)
        if (next <= MIN_SCALE) setOffset({ x: 0, y: 0 })
        return next
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const map = pointersRef.current
    map.set(e.pointerId, { x: e.clientX, y: e.clientY })
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)

    if (map.size === 2) {
      const pts = [...map.values()]
      const dx = pts[0].x - pts[1].x
      const dy = pts[0].y - pts[1].y
      const distance = Math.hypot(dx, dy) || 1
      pinchStartRef.current = {
        distance,
        scale: scaleRef.current,
        midX: (pts[0].x + pts[1].x) / 2,
        midY: (pts[0].y + pts[1].y) / 2,
      }
      panStartRef.current = null
      // Mark document so BingoCard can ignore competing single-finger tap logic.
      document.documentElement.dataset.bingoPinching = '1'
      return
    }

    if (map.size === 1 && scaleRef.current > 1.01) {
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        ox: offsetRef.current.x,
        oy: offsetRef.current.y,
      }
    }
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const map = pointersRef.current
    if (!map.has(e.pointerId)) return
    map.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (map.size >= 2 && pinchStartRef.current) {
      const pts = [...map.values()]
      const dx = pts[0].x - pts[1].x
      const dy = pts[0].y - pts[1].y
      const distance = Math.hypot(dx, dy) || 1
      const ratio = distance / pinchStartRef.current.distance
      const next = clampScale(pinchStartRef.current.scale * ratio)
      setScale(next)
      if (next <= MIN_SCALE) setOffset({ x: 0, y: 0 })
      return
    }

    if (map.size === 1 && panStartRef.current && scaleRef.current > 1.01) {
      const dx = e.clientX - panStartRef.current.x
      const dy = e.clientY - panStartRef.current.y
      setOffset({
        x: panStartRef.current.ox + dx,
        y: panStartRef.current.oy + dy,
      })
    }
  }, [])

  const endPointer = useCallback((e: React.PointerEvent) => {
    const map = pointersRef.current
    map.delete(e.pointerId)
    if (map.size < 2) {
      pinchStartRef.current = null
      delete document.documentElement.dataset.bingoPinching
    }
    if (map.size === 0) {
      panStartRef.current = null
      if (scaleRef.current <= MIN_SCALE) setOffset({ x: 0, y: 0 })
    }
  }, [])

  return (
    <div className={`bingo-card-zoom relative w-full ${className}`}>
      <div
        ref={viewportRef}
        className="bingo-card-zoom-viewport relative w-full overflow-hidden rounded-2xl touch-pan-y"
        style={{ touchAction: 'manipulation' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
      >
        <div
          className="bingo-card-zoom-stage origin-center will-change-transform transition-transform duration-75 ease-out"
          style={{
            transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
          }}
        >
          {children}
        </div>
      </div>

      {showControls ? (
        <div
          className="pointer-events-none absolute bottom-3 right-3 z-20 flex flex-col gap-2"
          aria-label="Bingo card zoom controls"
        >
          <div className="pointer-events-auto flex flex-col overflow-hidden rounded-xl border border-[#00FF66]/35 bg-[#0a1210]/92 shadow-[0_0_20px_rgba(0,255,102,0.18)] backdrop-blur-md">
            <button
              type="button"
              onClick={() => zoomBy(STEP)}
              className="inline-flex h-11 w-11 items-center justify-center text-[#00FF66] hover:bg-[#00FF66]/15 touch-manipulation"
              aria-label="Zoom in"
            >
              <Plus className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => zoomBy(-STEP)}
              className="inline-flex h-11 w-11 items-center justify-center border-t border-white/10 text-[#00FF66] hover:bg-[#00FF66]/15 touch-manipulation"
              aria-label="Zoom out"
            >
              <Minus className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={resetZoom}
              disabled={scale <= MIN_SCALE && offset.x === 0 && offset.y === 0}
              className="inline-flex h-11 w-11 items-center justify-center border-t border-white/10 text-white/70 hover:bg-white/10 disabled:opacity-35 touch-manipulation"
              aria-label="Reset zoom"
              title="Reset zoom"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
          <span className="pointer-events-none text-center text-[10px] font-semibold tabular-nums text-white/45">
            {Math.round(scale * 100)}%
          </span>
        </div>
      ) : null}
    </div>
  )
}
