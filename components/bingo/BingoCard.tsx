'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getFreeCenterPosition } from '@/lib/bingo-win-pattern'

export type BingoCardCell = {
  id: string
  position: number
  playlistSongId: string
  label: string
  albumArtUrl?: string | null
}

export type BingoCardProps = {
  size?: number
  cells: BingoCardCell[]
  markedSongIds: Set<string>
  /** Playlist song IDs the host has already played — taps outside this set shake red. */
  playedSongIds: Set<string>
  onMarkChange: (playlistSongId: string, marked: boolean) => void
  className?: string
}

function cellFeedbackKey(position: number, kind: 'gold' | 'shake'): string {
  return `${kind}-${position}`
}

function vibrateTap(): void {
  if (typeof window !== 'undefined' && typeof window.navigator?.vibrate === 'function') {
    window.navigator.vibrate(25)
  }
}

export function BingoCard({
  size = 5,
  cells,
  markedSongIds,
  playedSongIds,
  onMarkChange,
  className = '',
}: BingoCardProps) {
  const freePosition = getFreeCenterPosition(size)
  const cellMap = new Map(cells.map((c) => [c.position, c]))
  const [feedback, setFeedback] = useState<string | null>(null)
  const feedbackTimerRef = useRef<number | null>(null)
  const skipClickRef = useRef(false)

  const triggerFeedback = useCallback((key: string) => {
    setFeedback(key)
    if (feedbackTimerRef.current != null) window.clearTimeout(feedbackTimerRef.current)
    feedbackTimerRef.current = window.setTimeout(() => {
      setFeedback(null)
      feedbackTimerRef.current = null
    }, 480)
  }, [])

  useEffect(
    () => () => {
      if (feedbackTimerRef.current != null) window.clearTimeout(feedbackTimerRef.current)
    },
    []
  )

  const handleCellTap = useCallback(
    (cell: BingoCardCell | null, row: number, col: number) => {
      vibrateTap()
      const position = row * size + col
      const isFree = freePosition !== null && position === freePosition

      if (isFree) return

      if (!cell) return

      const isPlayed = playedSongIds.has(cell.playlistSongId)
      const isMarked = markedSongIds.has(cell.playlistSongId)

      if (!isPlayed && !isMarked) {
        triggerFeedback(cellFeedbackKey(position, 'shake'))
        return
      }

      const nextMarked = !isMarked
      onMarkChange(cell.playlistSongId, nextMarked)
      if (nextMarked && isPlayed) {
        triggerFeedback(cellFeedbackKey(position, 'gold'))
      }
    },
    [freePosition, markedSongIds, onMarkChange, playedSongIds, size, triggerFeedback]
  )

  return (
    <div
      className={`bg-[#1E1E1E] rounded-2xl p-3 sm:p-5 border border-[#00FFFF]/25 shadow-[0_0_24px_rgba(0,255,255,0.08)] ${className}`}
    >
      <div
        className="grid gap-1.5 sm:gap-2.5"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: size }, (_, row) =>
          Array.from({ length: size }, (_, col) => {
            const position = row * size + col
            const isFree = freePosition !== null && position === freePosition
            const cell = cellMap.get(position) ?? null
            const isMarked = isFree || (cell != null && markedSongIds.has(cell.playlistSongId))
            const goldAnim = feedback === cellFeedbackKey(position, 'gold')
            const shakeAnim = feedback === cellFeedbackKey(position, 'shake')

            if (isFree) {
              return (
                <div
                  key={`free-${position}`}
                  className="aspect-square rounded-xl flex flex-col items-center justify-center p-1.5 sm:p-2 text-center border-2 border-[#FFD700]/70 bg-gradient-to-br from-[#FFD700]/20 to-[#1E1E1E] text-[#FFD700] min-h-[4.5rem] min-w-[3rem] shadow-[inset_0_0_20px_rgba(255,215,0,0.12)]"
                  aria-label="Free space"
                >
                  <span className="text-xl sm:text-2xl leading-none" aria-hidden>
                    ★
                  </span>
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest mt-1">
                    Free
                  </span>
                </div>
              )
            }

            if (!cell) {
              return (
                <div
                  key={`missing-${position}`}
                  className="aspect-square rounded-xl flex flex-col items-center justify-center p-1.5 border-2 border-dashed border-amber-600/40 text-amber-200/70 min-h-[4.5rem] min-w-[3rem] text-xs uppercase"
                >
                  Missing
                </div>
              )
            }

            const label = cell.label || '—'
            return (
              <button
                key={cell.id}
                type="button"
                aria-pressed={isMarked}
                onPointerDown={(e) => {
                  if (e.pointerType !== 'touch') return
                  e.preventDefault()
                  skipClickRef.current = true
                  handleCellTap(cell, row, col)
                  window.setTimeout(() => {
                    skipClickRef.current = false
                  }, 600)
                }}
                onClick={() => {
                  if (skipClickRef.current) {
                    skipClickRef.current = false
                    return
                  }
                  handleCellTap(cell, row, col)
                }}
                className={`
                  aspect-square rounded-xl flex flex-col items-center justify-center p-1.5 sm:p-2.5 text-center
                  text-xs sm:text-sm font-medium border-2 transition-colors duration-200 overflow-hidden cursor-pointer
                  touch-manipulation min-h-[4.5rem] min-w-[3rem] select-none active:scale-[0.98]
                  ${goldAnim ? 'animate-bingo-gold-flash' : ''}
                  ${shakeAnim ? 'animate-bingo-red-shake' : ''}
                  ${
                    isMarked
                      ? 'bg-[#00FFFF]/10 border-[#00FFFF]/60 text-cyan-100 shadow-[inset_0_0_16px_rgba(0,255,255,0.12)]'
                      : 'bg-[#1E1E1E] border-white/20 text-slate-300 hover:border-[#00FFFF]/40 hover:text-white'
                  }
                `}
                style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
              >
                {cell.albumArtUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cell.albumArtUrl}
                    alt=""
                    className="w-5 h-5 sm:w-6 sm:h-6 rounded object-cover shrink-0 mb-0.5 pointer-events-none"
                  />
                ) : null}
                <span className="line-clamp-4 leading-snug break-words pointer-events-none">{label}</span>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
