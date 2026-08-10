'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getFreeCenterPosition } from '@/lib/bingo-win-pattern'
import { resolveBlindSongParts } from '@/lib/media/blind-song-label'
import { triggerHaptic } from '@/lib/haptic-feedback'

export type BingoCardCell = {
  id: string
  position: number
  playlistSongId: string
  label: string
  title?: string | null
  artist?: string | null
  albumArtUrl?: string | null
}

export type BingoCardProps = {
  size?: number
  cells: BingoCardCell[]
  markedSongIds: Set<string>
  /** Playlist song IDs the host has already played — taps outside this set shake red. */
  playedSongIds: Set<string>
  /** Currently called song — glows on matching tile */
  activeSongId?: string | null
  /** Blind Bingo — obfuscate titles */
  hideSongTitles?: boolean
  onMarkChange: (playlistSongId: string, marked: boolean) => void
  className?: string
}

function cellFeedbackKey(position: number, kind: 'gold' | 'shake'): string {
  return `${kind}-${position}`
}

export function BingoCard({
  size = 5,
  cells,
  markedSongIds,
  playedSongIds,
  activeSongId = null,
  hideSongTitles = false,
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
      const position = row * size + col
      const isFree = freePosition !== null && position === freePosition

      if (isFree) return

      if (!cell) return

      const isPlayed = playedSongIds.has(cell.playlistSongId)
      const isMarked = markedSongIds.has(cell.playlistSongId)

      if (!isPlayed && !isMarked) {
        triggerHaptic('error')
        triggerFeedback(cellFeedbackKey(position, 'shake'))
        return
      }

      const nextMarked = !isMarked
      onMarkChange(cell.playlistSongId, nextMarked)
      if (nextMarked && isPlayed) {
        triggerHaptic('success')
        triggerFeedback(cellFeedbackKey(position, 'gold'))
      } else {
        triggerHaptic('tap')
      }
    },
    [freePosition, markedSongIds, onMarkChange, playedSongIds, size, triggerFeedback]
  )

  return (
    <div
      className={`bingo-card-shell bg-[#1E1E1E] rounded-2xl p-2 sm:p-4 md:p-5 border border-[#00FF66]/25 shadow-[0_0_24px_rgba(0,255,102,0.08)] transform-gpu contain-paint ${className}`}
    >
      <div
        className="bingo-grid grid gap-1 sm:gap-2 md:gap-2.5"
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
            const isActive =
              !!cell && !!activeSongId && cell.playlistSongId === activeSongId && !isFree

            if (isFree) {
              return (
                <div
                  key={`free-${position}`}
                  className="bingo-cell aspect-square rounded-xl flex flex-col items-center justify-center p-1 sm:p-2 text-center border-2 border-[#FFD700]/70 bg-gradient-to-br from-[#FFD700]/20 to-[#1E1E1E] text-[#FFD700] min-h-11 sm:min-h-[4.5rem] shadow-[inset_0_0_20px_rgba(255,215,0,0.12)]"
                  aria-label="Free space"
                >
                  <span className="text-lg sm:text-2xl leading-none" aria-hidden>
                    ★
                  </span>
                  <span className="bingo-cell-artist mt-0.5 font-black uppercase tracking-wider text-[#FFD700]">
                    Free
                  </span>
                </div>
              )
            }

            if (!cell) {
              return (
                <div
                  key={`missing-${position}`}
                  className="bingo-cell aspect-square rounded-xl flex flex-col items-center justify-center p-1 border-2 border-dashed border-amber-600/40 text-amber-200/70 min-h-11 sm:min-h-[4.5rem] uppercase"
                >
                  <span className="bingo-cell-title">Missing</span>
                </div>
              )
            }

            const parts = resolveBlindSongParts({
              hideTitles: hideSongTitles,
              trackNumber: position + 1,
              label: cell.label,
              title: cell.title,
              artist: cell.artist,
            })

            return (
              <button
                key={cell.id}
                type="button"
                aria-pressed={isMarked}
                aria-label={parts.full}
                title={hideSongTitles ? parts.full : parts.full}
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
                  bingo-cell aspect-square rounded-xl flex flex-col items-center justify-center
                  p-1 sm:p-1.5 md:p-2 text-center border-2 transition-colors duration-200
                  overflow-hidden cursor-pointer touch-manipulation min-h-11 sm:min-h-[4.5rem]
                  select-none active:scale-[0.98] transform-gpu
                  ${goldAnim ? 'animate-bingo-gold-flash' : ''}
                  ${shakeAnim ? 'animate-bingo-red-shake' : ''}
                  ${isActive ? 'bingo-cell-called-glow' : ''}
                  ${
                    isMarked
                      ? 'bg-[#00FF66]/10 border-[#00FF66]/60 text-green-100 shadow-[inset_0_0_16px_rgba(0,255,102,0.12)]'
                      : 'bg-[#1E1E1E] border-white/20 text-slate-300 hover:border-[#00FF66]/40 hover:text-white'
                  }
                `}
                style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
              >
                {cell.albumArtUrl && !hideSongTitles ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cell.albumArtUrl}
                    alt=""
                    className="hidden sm:block w-5 h-5 md:w-6 md:h-6 rounded object-cover shrink-0 mb-0.5 pointer-events-none"
                  />
                ) : null}
                <span className="bingo-cell-title pointer-events-none w-full px-0.5">{parts.title}</span>
                {parts.artist ? (
                  <span className="bingo-cell-artist pointer-events-none w-full px-0.5 mt-0.5 opacity-80">
                    {parts.artist}
                  </span>
                ) : null}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
