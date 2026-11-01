'use client'

import { Flame, Target, Trophy, Zap } from 'lucide-react'
import type { ArcadeScoreboardEntry } from '@/lib/game-scoring'

export type ArcadeScoreboardProps = {
  entries: ArcadeScoreboardEntry[]
  loading?: boolean
  error?: string
  /** Highlight the local player's card */
  highlightCardId?: string | null
  variant?: 'host' | 'player' | 'overlay'
  title?: string
  className?: string
  maxRows?: number
}

function rankMedal(rank: number): string {
  if (rank === 1) return 'text-[#FFD700]'
  if (rank === 2) return 'text-[#C0C0C0]'
  if (rank === 3) return 'text-[#CD7F32]'
  return 'text-[#00FF66]/70'
}

function formatBingoSpeed(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return '—'
  }
}

export function ArcadeScoreboard({
  entries,
  loading = false,
  error = '',
  highlightCardId = null,
  variant = 'host',
  title = 'LIVE SCOREBOARD',
  className = '',
  maxRows = 40,
}: ArcadeScoreboardProps) {
  const overlay = variant === 'overlay'
  const player = variant === 'player'
  const visible = entries.slice(0, maxRows)

  const shell = overlay
    ? 'rounded-xl border-2 border-[#00FF66]/40 bg-black/55 backdrop-blur-xl shadow-[0_0_40px_rgba(0,255,102,0.15)]'
    : player
      ? 'rounded-2xl border border-[#00FF66]/25 bg-[#0d1612]/95 shadow-[0_0_28px_rgba(0,255,102,0.08)]'
      : 'rounded-2xl border-2 border-[#00FF66]/30 bg-gradient-to-b from-[#0a1410] to-[#050806] shadow-[0_0_48px_rgba(0,255,102,0.12)]'

  return (
    <div className={className}>
      <div className={`flex items-center gap-2 mb-3 ${overlay || player ? 'justify-center' : ''}`}>
        <Trophy className={`shrink-0 ${overlay ? 'h-7 w-7 text-[#FFD700]' : 'h-6 w-6 text-[#FFD700]'}`} />
        <div className={overlay || player ? 'text-center' : ''}>
          <h2
            className={`font-black tracking-[0.12em] uppercase ${
              overlay ? 'text-2xl md:text-4xl text-[#00FF66]' : 'text-lg sm:text-xl text-[#00FF66]'
            }`}
          >
            {title}
          </h2>
          <p className={`text-xs mt-0.5 ${overlay ? 'text-[#00FF66]/65' : 'text-white/45'}`}>
            Ranked by score · then bingo speed
          </p>
        </div>
      </div>

      <div className={`${shell} overflow-hidden`}>
        <div
          className={`grid grid-cols-[2.5rem_minmax(0,1fr)_4.5rem_4rem_3.5rem] gap-2 px-3 py-2 text-[10px] uppercase tracking-widest font-bold border-b border-[#00FF66]/20 ${
            overlay ? 'text-[#00FF66]/70' : 'text-white/40'
          }`}
        >
          <span>#</span>
          <span>Player</span>
          <span className="text-right">Score</span>
          <span className="text-right">Acc</span>
          <span className="text-right">Streak</span>
        </div>

        {loading ? (
          <p className="py-10 text-center text-sm text-white/40 animate-pulse">Syncing scores…</p>
        ) : error ? (
          <p className="py-8 px-4 text-center text-sm text-amber-300/90">{error}</p>
        ) : visible.length === 0 ? (
          <p className="py-10 text-center text-sm text-white/40">
            No scores yet — correct taps earn points.
          </p>
        ) : (
          <ul className={`divide-y divide-white/5 ${overlay ? 'max-h-[70vh]' : 'max-h-80'} overflow-y-auto overscroll-contain`}>
            {visible.map((entry) => {
              const isSelf = highlightCardId && entry.card_id === highlightCardId
              return (
                <li
                  key={entry.card_id}
                  className={`grid grid-cols-[2.5rem_minmax(0,1fr)_4.5rem_4rem_3.5rem] gap-2 items-center px-3 py-2.5 transition-colors ${
                    isSelf
                      ? 'bg-[#00FF66]/12 ring-1 ring-inset ring-[#00FF66]/35'
                      : entry.rank <= 3
                        ? 'bg-white/[0.03]'
                        : ''
                  }`}
                >
                  <span className={`font-black tabular-nums text-sm ${rankMedal(entry.rank)}`}>
                    {entry.rank}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-white truncate flex items-center gap-1.5">
                      {entry.player_name}
                      {entry.bingo_bonus_awarded ? (
                        <Zap className="h-3.5 w-3.5 text-[#FFD700] shrink-0" aria-label="Bingo bonus" />
                      ) : null}
                    </p>
                    <p className="text-[10px] text-white/35 truncate flex items-center gap-1">
                      <Target className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                      {entry.bingo_bonus_awarded
                        ? `Bingo ${formatBingoSpeed(entry.bingo_completed_at)}`
                        : `${entry.correct_taps}✓ / ${entry.wrong_taps}✗`}
                    </p>
                  </div>
                  <span className="text-right font-black tabular-nums text-[#00FF66] text-base">
                    {entry.score}
                  </span>
                  <span className="text-right tabular-nums text-sm text-white/70">
                    {entry.accuracy.toFixed(entry.accuracy % 1 === 0 ? 0 : 1)}%
                  </span>
                  <span
                    className={`text-right tabular-nums text-sm font-bold inline-flex items-center justify-end gap-0.5 ${
                      entry.streak_current > 0 ? 'text-orange-400' : 'text-white/30'
                    }`}
                  >
                    {entry.streak_current > 0 ? (
                      <Flame className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    ) : null}
                    {entry.streak_current}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
