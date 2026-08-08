'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  fetchRecentGameHistory,
  formatDuration,
  type GameHistoryRow,
} from '@/lib/game-history'
import { Loader2, Trophy, Users } from 'lucide-react'

export type PastGamesPanelProps = {
  hostId?: string | null
  className?: string
}

export function PastGamesPanel({ hostId, className = '' }: PastGamesPanelProps) {
  const supabase = useMemo(() => createClient(), [])
  const [rows, setRows] = useState<GameHistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [scope, setScope] = useState<'host' | 'all'>('host')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    void fetchRecentGameHistory(supabase, {
      hostId: scope === 'host' ? hostId ?? undefined : undefined,
      limit: 50,
    }).then(({ rows: next, error: err }) => {
      if (cancelled) return
      if (err) setError(err)
      setRows(next)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [supabase, hostId, scope])

  const totals = useMemo(() => {
    const games = rows.length
    const players = rows.reduce((n, r) => n + (r.total_players || 0), 0)
    const winCounts = new Map<string, number>()
    for (const r of rows) {
      for (const w of r.winner_names ?? []) {
        winCounts.set(w, (winCounts.get(w) ?? 0) + 1)
      }
    }
    const topWinners = [...winCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
    return { games, players, topWinners }
  }, [rows])

  return (
    <section
      className={`lg-surface-card rounded-2xl p-4 sm:p-6 space-y-5 ${className}`}
      aria-label="Past games and leaderboard"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-white">Past Games & Leaderboard</h3>
          <p className="text-white/45 text-sm mt-1">
            Historical winners, participation, and session duration for community engagement.
          </p>
        </div>
        <div className="flex rounded-xl border border-white/10 p-1 gap-1 bg-black/20">
          <button
            type="button"
            onClick={() => setScope('host')}
            className={`px-3 py-2 min-h-11 rounded-lg text-sm font-medium touch-manipulation ${
              scope === 'host' ? 'bg-[var(--lg-neon)]/15 text-[var(--lg-neon)]' : 'text-white/45'
            }`}
          >
            My games
          </button>
          <button
            type="button"
            onClick={() => setScope('all')}
            className={`px-3 py-2 min-h-11 rounded-lg text-sm font-medium touch-manipulation ${
              scope === 'all' ? 'bg-[var(--lg-neon)]/15 text-[var(--lg-neon)]' : 'text-white/45'
            }`}
          >
            Community
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Archived games" value={String(totals.games)} icon={<Trophy className="w-4 h-4" />} />
        <StatCard
          label="Total players seated"
          value={totals.players.toLocaleString()}
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard
          label="Unique winners"
          value={String(totals.topWinners.length)}
          icon={<Trophy className="w-4 h-4 text-amber-400" />}
        />
      </div>

      {totals.topWinners.length > 0 ? (
        <div>
          <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-2">Top winners</h4>
          <ul className="flex flex-wrap gap-2">
            {totals.topWinners.map(([name, wins]) => (
              <li
                key={name}
                className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-sm text-amber-200"
              >
                {name} · {wins}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? (
        <p className="text-amber-300 text-sm rounded-xl border border-amber-500/30 bg-amber-950/30 px-3 py-2">
          {error.includes('schema') || error.includes('does not exist')
            ? 'Apply migration 20260808120000_game_history.sql to enable history.'
            : error}
        </p>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading history…
        </div>
      ) : rows.length === 0 ? (
        <p className="text-slate-500 text-sm py-8 text-center">
          No archived games yet. Verify a bingo win to start building history.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm text-left min-w-[36rem]">
            <thead className="bg-black/30 text-white/40 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-3 py-3 font-semibold">Code</th>
                <th className="px-3 py-3 font-semibold">Winners</th>
                <th className="px-3 py-3 font-semibold">Players</th>
                <th className="px-3 py-3 font-semibold">Duration</th>
                <th className="px-3 py-3 font-semibold">Ended</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-white/[0.03]">
                  <td className="px-3 py-3 font-mono text-[var(--lg-neon)]">{r.game_code}</td>
                  <td className="px-3 py-3 text-white/80">
                    {(r.winner_names ?? []).join(', ') || '—'}
                  </td>
                  <td className="px-3 py-3 text-slate-300 tabular-nums">{r.total_players}</td>
                  <td className="px-3 py-3 text-slate-400">{formatDuration(r.duration_seconds)}</td>
                  <td className="px-3 py-3 text-slate-500 whitespace-nowrap">
                    {new Date(r.ended_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: ReactNode
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
      <div className="flex items-center gap-2 text-white/40 text-xs uppercase tracking-wider mb-1">
        {icon}
        {label}
      </div>
      <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
    </div>
  )
}
