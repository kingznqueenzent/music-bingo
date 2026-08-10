'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { WheelSegment } from '@/lib/supabase/types'
import { wheelRotationForIndex } from '@/lib/stage-prize-wheel'

export type PrizeWheelOverlayProps = {
  open: boolean
  segments: WheelSegment[]
  targetIndex: number
  winnerName?: string
  spinDurationMs?: number
  onSpinComplete?: (label: string, index: number) => void
  onDismiss?: () => void
}

const DEFAULT_COLORS = ['#00FF66', '#FFD700', '#a78bfa', '#f472b6', '#34d399', '#fb923c', '#38bdf8', '#facc15']

export function PrizeWheelOverlay({
  open,
  segments,
  targetIndex,
  winnerName,
  spinDurationMs = 4200,
  onSpinComplete,
  onDismiss,
}: PrizeWheelOverlayProps) {
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const prevOpen = useRef(false)

  const sliceAngle = segments.length > 0 ? 360 / segments.length : 360
  const conicGradient = useMemo(() => {
    if (segments.length === 0) return '#1E1E1E'
    let cursor = 0
    const stops = segments.map((seg, i) => {
      const color = seg.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]
      const start = cursor
      cursor += sliceAngle
      return `${color} ${start}deg ${cursor}deg`
    })
    return `conic-gradient(from -90deg, ${stops.join(', ')})`
  }, [segments, sliceAngle])

  useEffect(() => {
    if (open && !prevOpen.current && segments.length > 0) {
      setRevealed(false)
      setSpinning(true)
      const target = wheelRotationForIndex(
        Math.min(Math.max(targetIndex, 0), segments.length - 1),
        segments.length,
        5
      )
      requestAnimationFrame(() => setRotation(target))
      const timer = window.setTimeout(() => {
        setSpinning(false)
        setRevealed(true)
        const idx = Math.min(Math.max(targetIndex, 0), segments.length - 1)
        onSpinComplete?.(segments[idx]?.label ?? 'Prize', idx)
      }, spinDurationMs)
      return () => window.clearTimeout(timer)
    }
    prevOpen.current = open
    if (!open) {
      setRotation(0)
      setSpinning(false)
      setRevealed(false)
    }
  }, [open, segments, targetIndex, spinDurationMs, onSpinComplete])

  if (!open || segments.length === 0) return null

  const landed = segments[Math.min(Math.max(targetIndex, 0), segments.length - 1)]

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="relative w-full max-w-2xl flex flex-col items-center">
        <p className="text-[#00FF66] uppercase tracking-[0.3em] text-sm font-bold mb-4">Prize Wheel</p>
        {winnerName ? (
          <p className="text-2xl md:text-3xl font-bold text-white mb-6">Spinning for {winnerName}</p>
        ) : null}

        <div className="relative w-[min(85vw,420px)] h-[min(85vw,420px)]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-20 text-4xl drop-shadow-lg">
            ▼
          </div>
          <div
            className="w-full h-full rounded-full border-4 border-[#FFD700]/60 shadow-[0_0_48px_rgba(255,215,0,0.35)]"
            style={{
              background: conicGradient,
              transform: `rotate(${rotation}deg)`,
              transition: spinning
                ? `transform ${spinDurationMs}ms cubic-bezier(0.17, 0.67, 0.12, 0.99)`
                : 'none',
            }}
          >
            {segments.map((seg, i) => {
              const angle = i * sliceAngle + sliceAngle / 2 - 90
              return (
                <div
                  key={`${seg.label}-${i}`}
                  className="absolute left-1/2 top-1/2 w-1/2 origin-left pl-4 pr-2"
                  style={{
                    transform: `rotate(${angle}deg)`,
                  }}
                >
                  <span
                    className="block text-[#121212] font-bold text-xs md:text-sm truncate drop-shadow-sm"
                    style={{ transform: `rotate(${90 - angle}deg)`, transformOrigin: 'left center' }}
                  >
                    {seg.label}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="absolute inset-[28%] rounded-full bg-[#121212] border-2 border-[#00FF66]/40 flex items-center justify-center">
            <span className="text-3xl">🎡</span>
          </div>
        </div>

        {revealed && landed && (
          <div className="mt-8 w-full max-w-md rounded-2xl border-2 border-[#FFD700]/60 bg-gradient-to-b from-[#1E1E1E] to-[#121212] p-6 text-center animate-stage-celebrate shadow-[0_0_32px_rgba(255,215,0,0.25)]">
            <p className="text-xs uppercase tracking-widest text-[#FFD700]/80 mb-2">You won</p>
            <p className="text-3xl md:text-4xl font-black text-[#FFD700] mb-3">{landed.label}</p>
            <p className="text-slate-400 text-sm mb-4">
              Show this screen to the host to claim your prize. Visit the leaderboard to complete redemption.
            </p>
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="rounded-full bg-[#00FF66] hover:bg-green-300 text-[#121212] font-bold px-8 py-2.5"
              >
                Done
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
