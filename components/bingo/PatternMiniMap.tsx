'use client'

import type { WinPattern } from '@/lib/bingo-win-pattern'
import { getPatternHighlightPositions, type PatternDisplayMode } from '@/lib/bingo/player-progress'

const PATTERN_LABELS: Record<PatternDisplayMode, string> = {
  line: 'Line',
  corners: 'Corners',
  x: 'X-Pattern',
  blackout: 'Blackout',
}

export type PatternMiniMapProps = {
  size?: number
  mode: WinPattern
  /** Positions (0..size²-1) the player has marked. */
  markedPositions: Set<number>
  className?: string
}

export function PatternMiniMap({
  size = 5,
  mode,
  markedPositions,
  className = '',
}: PatternMiniMapProps) {
  const highlight = new Set(getPatternHighlightPositions(mode as PatternDisplayMode, size))

  return (
    <div
      className={`rounded-xl border border-[#00FF66]/30 bg-[#1E1E1E]/90 p-3 ${className}`}
      aria-label={`Win pattern: ${PATTERN_LABELS[mode as PatternDisplayMode] ?? mode}`}
    >
      <p className="text-[10px] uppercase tracking-widest text-[#00FF66]/80 mb-2 font-semibold">
        Pattern · {PATTERN_LABELS[mode as PatternDisplayMode] ?? mode}
      </p>
      <div
        className="grid gap-0.5 w-[5.5rem]"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: size * size }, (_, pos) => {
          const inPattern = highlight.has(pos)
          const isMarked = markedPositions.has(pos)
          return (
            <div
              key={pos}
              className={`
                aspect-square rounded-[3px] border
                ${
                  isMarked && inPattern
                    ? 'bg-[#FFD700]/80 border-[#FFD700]'
                    : isMarked
                      ? 'bg-[#00FF66]/50 border-[#00FF66]/70'
                      : inPattern
                        ? 'bg-[#00FF66]/15 border-[#00FF66]/35'
                        : 'bg-[#121212] border-white/10'
                }
              `}
            />
          )
        })}
      </div>
    </div>
  )
}
