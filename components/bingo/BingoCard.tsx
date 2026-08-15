'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getFreeCenterPosition } from '@/lib/bingo-win-pattern'
import { splitSongDisplayParts } from '@/lib/media-display'
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
  /** Blind Bingo — obfuscate titles (legacy alias; pairs with evilMode behavior). */
  hideSongTitles?: boolean
  /** Evil mode — hide uncalled titles/artists as ? until the host plays the song. */
  evilMode?: boolean
  onMarkChange: (playlistSongId: string, marked: boolean) => void
  className?: string
}

type FeedbackKind = 'mark' | 'wrong'

function cellFeedbackKey(position: number, kind: FeedbackKind): string {
  return `${kind}-${position}`
}

function resolveCellDisplayParts(
  cell: BingoCardCell,
  options: {
    position: number
    isPlayed: boolean
    hideSongTitles: boolean
    evilMode: boolean
  }
): { title: string; artist: string | null; full: string } {
  const base =
    cell.title || cell.artist
      ? {
          title: (cell.title || cell.label || 'Track').trim() || 'Track',
          artist: cell.artist?.trim() || null,
          full: cell.label || cell.title || 'Track',
        }
      : splitSongDisplayParts(cell.label)

  // Blind Mode — always hide titles so players identify tracks by ear.
  if (options.hideSongTitles) {
    return { title: '???', artist: null, full: '???' }
  }

  // Evil mode — obfuscate uncalled tiles only.
  if (options.evilMode && !options.isPlayed) {
    return { title: '?', artist: '?', full: '? — ?' }
  }

  return base
}

export function BingoCard({
  size = 5,
  cells,
  markedSongIds,
  playedSongIds,
  activeSongId = null,
  hideSongTitles = false,
  evilMode = false,
  onMarkChange,
  className = '',
}: BingoCardProps) {
  const boardSize = size
  const freePosition = getFreeCenterPosition(boardSize)
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
      const position = row * boardSize + col
      const isFree = freePosition !== null && position === freePosition

      if (isFree) return
      if (!cell) return

      const isPlayed = playedSongIds.has(cell.playlistSongId)
      const isMarked = markedSongIds.has(cell.playlistSongId)

      if (!isPlayed && !isMarked) {
        triggerHaptic('error')
        triggerFeedback(cellFeedbackKey(position, 'wrong'))
        return
      }

      const nextMarked = !isMarked
      onMarkChange(cell.playlistSongId, nextMarked)
      if (nextMarked && isPlayed) {
        triggerHaptic('success')
        triggerFeedback(cellFeedbackKey(position, 'mark'))
      } else {
        triggerHaptic('tap')
      }
    },
    [boardSize, freePosition, markedSongIds, onMarkChange, playedSongIds, triggerFeedback]
  )

  return (
    <div
      className={`bingo-card-shell mx-auto w-full max-w-md bg-brand-surface rounded-2xl p-2 sm:p-4 border border-brand-neon/25 shadow-[0_0_24px_rgba(0,255,102,0.08)] transform-gpu contain-paint ${className}`}
    >
      <div
        className="bingo-grid grid gap-1"
        style={{ gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: boardSize }, (_, row) =>
          Array.from({ length: boardSize }, (_, col) => {
            const position = row * boardSize + col
            const isFree = freePosition !== null && position === freePosition
            const cell = cellMap.get(position) ?? null
            const isPlayed = cell != null && playedSongIds.has(cell.playlistSongId)
            const isMarked = isFree || (cell != null && markedSongIds.has(cell.playlistSongId))
            const isEarlyMark = isMarked && !isFree && !isPlayed
            const isCalledMarked = isMarked && (isFree || isPlayed)
            const markAnim = feedback === cellFeedbackKey(position, 'mark')
            const wrongAnim = feedback === cellFeedbackKey(position, 'wrong')
            const isActive =
              !!cell && !!activeSongId && cell.playlistSongId === activeSongId && !isFree

            if (isFree) {
              return (
                <div
                  key={`free-${position}`}
                  className="bingo-cell relative aspect-square rounded-xl flex flex-col items-center justify-center p-1 sm:p-2 text-center border bg-brand-neon/10 border-brand-neon/40 min-h-11 sm:min-h-[4.5rem] shadow-[inset_0_0_20px_rgba(0,255,102,0.12)] animate-pulse-glow"
                  aria-label="Free space"
                >
                  <span
                    className="text-lg sm:text-2xl leading-none text-brand-neon drop-shadow-[0_0_8px_rgba(0,255,102,0.75)]"
                    aria-hidden
                  >
                    ⭐
                  </span>
                </div>
              )
            }

            if (!cell) {
              return (
                <div
                  key={`empty-${position}`}
                  className="bingo-cell aspect-square rounded-xl flex flex-col items-center justify-center p-1 border border-white/5 bg-white/[0.02] text-white/20 min-h-11 sm:min-h-[4.5rem]"
                  aria-hidden
                >
                  <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider">—</span>
                </div>
              )
            }

            const showAlbumArt =
              !!cell.albumArtUrl && !hideSongTitles && (!evilMode || isPlayed)

            const parts = resolveCellDisplayParts(cell, {
              position,
              isPlayed,
              hideSongTitles,
              evilMode,
            })

            const stateClasses = isEarlyMark
              ? 'bg-white/5 border-white/20 text-white/70'
              : isCalledMarked
                ? 'bg-brand-neon/15 border-brand-neon/60 text-brand-neon animate-pulse-glow'
                : 'bg-[#1E1E1E] border-white/5 text-white hover:border-brand-neon/30 hover:bg-white/5'

            return (
              <button
                key={cell.id}
                type="button"
                aria-pressed={isMarked}
                aria-label={parts.full}
                title={parts.full}
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
                  bingo-cell relative aspect-square rounded-xl flex flex-col items-center justify-center
                  p-1.5 sm:p-2 text-center border transition-colors duration-200
                  overflow-hidden cursor-pointer touch-manipulation min-h-11 sm:min-h-[4.5rem]
                  select-none active:scale-[0.98] transform-gpu gap-0.5
                  ${markAnim ? 'animate-bingo-mark animate-bingo-gold' : ''}
                  ${wrongAnim ? 'animate-bingo-wrong' : ''}
                  ${isActive ? 'bingo-cell-called-glow' : ''}
                  ${stateClasses}
                `}
                style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
              >
                {isCalledMarked && !isFree ? (
                  <span
                    className="absolute top-0.5 right-0.5 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-brand-neon text-brand-dark text-[9px] sm:text-[10px] font-black leading-none shadow-[0_0_8px_rgba(0,255,102,0.65)] pointer-events-none"
                    aria-hidden
                  >
                    ✓
                  </span>
                ) : null}
                {showAlbumArt ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cell.albumArtUrl!}
                    alt=""
                    className="hidden sm:block w-5 h-5 rounded object-cover shrink-0 mb-0.5 pointer-events-none opacity-90"
                  />
                ) : null}
                <span
                  className={`pointer-events-none w-full min-w-0 px-0.5 text-[9px] sm:text-[11px] font-semibold leading-tight sm:leading-snug line-clamp-2 sm:line-clamp-3 ${
                    isCalledMarked && !isFree ? 'text-brand-neon' : ''
                  }`}
                >
                  {parts.title}
                </span>
                {parts.artist ? (
                  <span className="pointer-events-none w-full min-w-0 px-0.5 text-[8px] sm:text-[10px] text-white/40 leading-tight line-clamp-1">
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
