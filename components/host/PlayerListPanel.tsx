'use client'

import { useMemo } from 'react'

export type PlayerBoardStatus = {
  cardId: string
  playerName: string
  playerIdentifier: string | null
  markedCount: number
  target: number
  status: 'playing' | 'near_win' | 'bingo'
}

export type PlayerListPanelProps = {
  players: PlayerBoardStatus[]
  className?: string
  /** Max rows rendered at once (scroll for the rest). */
  maxVisible?: number
}

const DEFAULT_MAX_VISIBLE = 50

export function playerStatusFromProgress(
  markedCount: number,
  target: number
): PlayerBoardStatus['status'] {
  if (markedCount >= target) return 'near_win'
  if (markedCount >= target - 1 && target > 1) return 'near_win'
  return 'playing'
}

export function PlayerListPanel({
  players,
  className = '',
  maxVisible = DEFAULT_MAX_VISIBLE,
}: PlayerListPanelProps) {
  const sorted = useMemo(
    () =>
      [...players].sort((a, b) => {
        const progressA = a.target > 0 ? a.markedCount / a.target : 0
        const progressB = b.target > 0 ? b.markedCount / b.target : 0
        if (progressB !== progressA) return progressB - progressA
        return a.playerName.localeCompare(b.playerName)
      }),
    [players]
  )

  const visible = sorted.slice(0, maxVisible)
  const hiddenCount = Math.max(0, sorted.length - visible.length)

  return (
    <div className={`rounded-2xl border border-slate-800 bg-slate-900/70 p-4 ${className}`}>
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
          Players ({players.length})
        </h3>
        {players.length > maxVisible ? (
          <span className="text-[10px] text-slate-500 uppercase tracking-wide">
            Top {maxVisible} by progress
          </span>
        ) : null}
      </div>
      {players.length === 0 ? (
        <p className="text-slate-500 text-sm">Waiting for players to join…</p>
      ) : (
        <>
          <ul className="space-y-2 max-h-72 overflow-y-auto overscroll-contain">
            {visible.map((p) => (
              <li
                key={p.cardId}
                className="flex items-center gap-3 rounded-xl bg-slate-800/60 border border-slate-700/50 px-3 py-2.5"
              >
                <div className="w-9 h-9 rounded-full bg-[#00FF66]/15 border border-[#00FF66]/30 flex items-center justify-center text-sm font-bold text-[#00FF66] shrink-0">
                  {p.playerName.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-100 font-medium truncate text-sm">{p.playerName}</p>
                  <p className="text-slate-500 text-xs truncate font-mono">{p.cardId.slice(0, 8)}…</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[#00FF66] font-bold text-sm tabular-nums">
                    {p.markedCount}/{p.target}
                  </p>
                  <p
                    className={`text-[10px] uppercase tracking-wide font-semibold ${
                      p.status === 'bingo'
                        ? 'text-[#FFD700]'
                        : p.status === 'near_win'
                          ? 'text-amber-400'
                          : 'text-slate-500'
                    }`}
                  >
                    {p.status === 'bingo' ? 'BINGO!' : p.status === 'near_win' ? 'Close' : 'Playing'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          {hiddenCount > 0 ? (
            <p className="text-slate-500 text-xs mt-2">
              +{hiddenCount} more player{hiddenCount === 1 ? '' : 's'} not shown · scroll list for top progress
            </p>
          ) : null}
        </>
      )}
    </div>
  )
}
