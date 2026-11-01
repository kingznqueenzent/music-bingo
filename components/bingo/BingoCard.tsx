'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getFreeCenterPosition } from '@/lib/bingo-win-pattern'
import { splitSongDisplayParts } from '@/lib/media-display'
import { triggerHaptic } from '@/lib/haptic-feedback'
import { BingoCardZoom } from '@/components/bingo/BingoCardZoom'

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
  /** Fired when the player dabs a called track (scoring +1). */
  onCorrectTap?: (playlistSongId: string) => void
  /** Fired when the player taps an uncalled track (scoring −1, shake). */
  onWrongTap?: (playlistSongId: string) => void
  /** Wrap card in pinch/trackpad zoom with floating controls (player default). */
  enableZoom?: boolean
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

function isPinching(): boolean {
  if (typeof document === 'undefined') return false
  return document.documentElement.dataset.bingoPinching === '1'
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
  onCorrectTap,
  onWrongTap,
  enableZoom = true,
  className = '',
}: BingoCardProps) {
  const boardSize = size === 4 ? 4 : 5
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
      if (isPinching()) return

      const position = row * boardSize + col
      const isFree = freePosition !== null && position === freePosition

      if (isFree) return
      if (!cell) return

      const isPlayed = playedSongIds.has(cell.playlistSongId)
      const isMarked = markedSongIds.has(cell.playlistSongId)

      if (!isPlayed && !isMarked) {
        triggerHaptic('error')
        triggerFeedback(cellFeedbackKey(position, 'wrong'))
        onWrongTap?.(cell.playlistSongId)
        return
      }

      const nextMarked = !isMarked
      onMarkChange(cell.playlistSongId, nextMarked)
      if (nextMarked && isPlayed) {
        triggerHaptic('success')
        triggerFeedback(cellFeedbackKey(position, 'mark'))
        onCorrectTap?.(cell.playlistSongId)
      } else {
        triggerHaptic('tap')
      }
    },
    [
      boardSize,
      freePosition,
      markedSongIds,
      onCorrectTap,
      onMarkChange,
      onWrongTap,
      playedSongIds,
      triggerFeedback,
    ]
  )

  const card = (
    <div
      className={`bingo-card-shell mx-auto w-full bg-brand-surface rounded-2xl border border-brand-neon/25 shadow-[0_0_24px_rgba(0,255,102,0.08)] transform-gpu ${className}`}
      data-grid-size={boardSize}
    >
      <div
        className="bingo-grid grid gap-[clamp(0.2rem,0.8cqi,0.45rem)]"
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
                  className="bingo-cell relative rounded-xl flex flex-col items-center justify-center text-center border bg-brand-neon/10 border-brand-neon/40 shadow-[inset_0_0_20px_rgba(0,255,102,0.12)] animate-pulse-glow"
                  aria-label="Free space"
                >
                  <span
                    className="bingo-free-star leading-none text-brand-neon drop-shadow-[0_0_8px_rgba(0,255,102,0.75)]"
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
                  className="bingo-cell rounded-xl flex flex-col items-center justify-center border border-white/5 bg-white/[0.02] text-white/20"
                  aria-hidden
                >
                  <span className="text-[clamp(0.6rem,2.5cqi,0.85rem)] font-medium uppercase tracking-wider">
                    —
                  </span>
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
              ? 'bingo-cell--early bg-white/5 border-white/20 text-white/70'
              : isCalledMarked
                ? 'bingo-cell--dabbed bg-brand-neon/15 border-brand-neon/60 text-brand-neon animate-pulse-glow'
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
                  if (isPinching()) return
                  // Defer to pointerup-equivalent via short delay so two-finger pinch can start.
                  skipClickRef.current = true
                  const pointerId = e.pointerId
                  const startX = e.clientX
                  const startY = e.clientY
                  const target = e.currentTarget
                  const onUp = (ev: PointerEvent) => {
                    if (ev.pointerId !== pointerId) return
                    target.removeEventListener('pointerup', onUp)
                    target.removeEventListener('pointercancel', onUp)
                    window.setTimeout(() => {
                      skipClickRef.current = false
                    }, 400)
                    if (isPinching()) return
                    const moved = Math.hypot(ev.clientX - startX, ev.clientY - startY)
                    if (moved > 14) return
                    handleCellTap(cell, row, col)
                  }
                  target.addEventListener('pointerup', onUp)
                  target.addEventListener('pointercancel', onUp)
                }}
                onClick={() => {
                  if (skipClickRef.current) {
                    skipClickRef.current = false
                    return
                  }
                  if (isPinching()) return
                  handleCellTap(cell, row, col)
                }}
                className={`
                  bingo-cell relative rounded-xl flex flex-col items-stretch justify-center
                  text-center border transition-[transform,colors,box-shadow] duration-150
                  cursor-pointer touch-manipulation
                  select-none active:scale-[0.96] transform-gpu will-change-transform
                  ${markAnim ? 'animate-bingo-mark animate-bingo-gold bingo-cell--just-dabbed' : ''}
                  ${wrongAnim ? 'animate-bingo-wrong' : ''}
                  ${isActive ? 'bingo-cell-called-glow' : ''}
                  ${stateClasses}
                `}
                style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
              >
                {isCalledMarked && !isFree ? (
                  <span
                    className="bingo-dab-stamp absolute top-0.5 right-0.5 flex items-center justify-center rounded-full bg-brand-neon text-brand-dark font-black leading-none shadow-[0_0_8px_rgba(0,255,102,0.65)] pointer-events-none"
                    aria-hidden
                  >
                    ✓
                  </span>
                ) : null}
                {isCalledMarked && !isFree ? (
                  <span
                    className="bingo-dab-ring pointer-events-none absolute inset-1 rounded-lg border border-brand-neon/35"
                    aria-hidden
                  />
                ) : null}
                <div className="bingo-cell-content flex flex-col items-center justify-center flex-1 min-h-0 w-full overflow-hidden">
                  {showAlbumArt ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cell.albumArtUrl!}
                      alt=""
                      className="bingo-cell-art hidden sm:block rounded object-cover shrink-0 pointer-events-none opacity-90"
                    />
                  ) : null}
                  <span
                    className={`bingo-cell-title pointer-events-none w-full min-w-0 ${
                      isCalledMarked && !isFree ? 'text-brand-neon' : ''
                    }`}
                  >
                    {parts.title}
                  </span>
                  {parts.artist ? (
                    <span className="bingo-cell-artist pointer-events-none w-full min-w-0 text-white/45">
                      {parts.artist}
                    </span>
                  ) : null}
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )

  if (!enableZoom) return card
  return <BingoCardZoom className="mx-auto w-full max-w-[min(100%,42rem)]">{card}</BingoCardZoom>
}
