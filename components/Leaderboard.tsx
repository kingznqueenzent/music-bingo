'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fetchTopPlayerStats, formatStatsUsername, type PlayerStatsRow } from '@/lib/player-stats'
import { Trophy, Loader2 } from 'lucide-react'

export type LeaderboardProps = {
  /** Max rows to fetch */
  limit?: number
  /** Page layout vs translucent stream overlay */
  variant?: 'page' | 'overlay'
  className?: string
  title?: string
  subtitle?: string
  /** Subscribe to Supabase Realtime for live rank updates */
  live?: boolean
}

function rankStyles(rank: number, overlay: boolean): string {
  if (rank === 1) return overlay ? 'gold-accent' : 'text-amber-300'
  if (rank === 2) return overlay ? 'text-[var(--chrome)]' : 'text-slate-300'
  if (rank === 3) return overlay ? 'text-[var(--magenta)]' : 'text-orange-400/90'
  return overlay ? 'text-[var(--cyan)]/80' : 'text-amber-400/80'
}

export function Leaderboard({
  limit = 25,
  variant = 'page',
  className = '',
  title = 'Leaderboard',
  subtitle,
  live = false,
}: LeaderboardProps) {
  const supabase = useMemo(() => createClient(), [])
  const [rows, setRows] = useState<PlayerStatsRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  const load = useCallback(async () => {
    setError('')
    const { rows: data, error: fetchError } = await fetchTopPlayerStats(supabase, limit)
    if (fetchError) {
      setError(fetchError)
      setRows([])
    } else {
      setRows(data)
      setUpdatedAt(new Date())
    }
    setLoading(false)
  }, [supabase, limit])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!live) return
    const channel = supabase
      .channel('player-stats-leaderboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'player_stats' }, () => {
        void load()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [live, supabase, load])

  const overlay = variant === 'overlay'
  const defaultSubtitle =
    subtitle ?? (overlay ? 'Top players · live' : `Top ${limit} by wins, then score`)

  const shellClass = overlay
    ? 'rounded-xl border-2 border-[var(--cyan)]/35 bg-[var(--bg-deep)]/45 backdrop-blur-xl shadow-2xl'
    : 'rounded-2xl border-2 border-amber-500/40 bg-slate-900/90 shadow-2xl'

  return (
    <div className={className}>
      <div className={`flex items-center gap-2 mb-3 ${overlay ? 'justify-center' : ''}`}>
        <Trophy
          className={`shrink-0 ${overlay ? 'w-6 h-6 gold-accent' : 'w-7 h-7 text-amber-400'}`}
          aria-hidden
        />
        <div className={overlay ? 'text-center' : ''}>
          <h2
            className={`font-black tracking-tight ${
              overlay ? 'disco-text text-2xl md:text-4xl' : 'text-2xl md:text-3xl text-white'
            }`}
          >
            {title}
          </h2>
          <p className={`text-sm mt-0.5 ${overlay ? 'text-[var(--cyan)]/70' : 'text-slate-400'}`}>{defaultSubtitle}</p>
        </div>
      </div>

      <div className={`${shellClass} overflow-hidden`}>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading ranks…</span>
          </div>
        ) : error ? (
          <div className="py-12 px-6 text-center text-red-300 text-sm">{error}</div>
        ) : rows.length === 0 ? (
          <div
            className={`py-16 px-6 text-center text-lg ${
              overlay ? 'text-[var(--cyan)]/60' : 'text-slate-500'
            }`}
          >
            No scores yet. Win a round to claim your spot!
          </div>
        ) : (
          <ul
            className={`divide-y ${
              overlay ? 'divide-[var(--magenta)]/20 max-h-[min(60vh,480px)]' : 'divide-slate-700/80 max-h-[70dvh]'
            } overflow-y-auto overscroll-contain`}
          >
            {rows.map((p, i) => {
              const rank = i + 1
              return (
                <li
                  key={p.id}
                  className={`flex items-center gap-3 px-4 py-3 md:px-6 md:py-4 ${
                    overlay
                      ? i % 2 === 0
                        ? 'bg-[var(--cyan)]/[0.04]'
                        : 'bg-transparent'
                      : 'bg-slate-800/30 hover:bg-slate-800/50 transition-colors'
                  }`}
                >
                  <span
                    className={`text-xl md:text-2xl font-black tabular-nums w-10 md:w-12 shrink-0 ${rankStyles(rank, overlay)}`}
                  >
                    #{rank}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-bold truncate ${
                        overlay ? 'text-lg md:text-xl text-[var(--cyan)]' : 'text-base md:text-xl text-white'
                      }`}
                    >
                      {formatStatsUsername(p.username)}
                    </p>
                    <p className={`text-xs ${overlay ? 'text-[var(--chrome)]/50' : 'text-slate-500'}`}>
                      {p.games_played} game{p.games_played !== 1 ? 's' : ''} played
                    </p>
                  </div>
                  <div className="text-right shrink-0 tabular-nums">
                    <p
                      className={`font-bold text-sm md:text-base ${
                        overlay ? 'gold-accent' : 'text-amber-300'
                      }`}
                    >
                      {p.wins} W
                    </p>
                    <p className={`text-xs ${overlay ? 'text-[var(--magenta)]/80' : 'text-slate-400'}`}>
                      {p.score.toLocaleString()} pts
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {updatedAt && !loading && !error ? (
        <p
          className={`text-xs mt-3 text-center ${overlay ? 'text-[var(--chrome)]/50' : 'text-slate-500'}`}
        >
          Updated {updatedAt.toLocaleTimeString()}
          {live ? ' · live' : ''}
        </p>
      ) : null}
    </div>
  )
}
