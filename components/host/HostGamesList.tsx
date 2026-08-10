'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Loader2, Music } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { fetchHostGamesList, type HostGameListRow } from '@/lib/host-games-list'
import type { GameStatus } from '@/lib/supabase/types'

export type HostGamesListProps = {
  hostId?: string | null
  className?: string
}

function statusLabel(status: GameStatus): string {
  if (status === 'playing') return 'Live'
  if (status === 'ended') return 'Ended'
  return 'Lobby'
}

function StatusBadge({ status }: { status: GameStatus }) {
  const live = status === 'playing'
  const lobby = status === 'lobby'
  const ended = status === 'ended'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
        live
          ? 'border-[#00FF66]/50 bg-[#00FF66]/10 text-[#00FF66]'
          : lobby
            ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
            : 'border-white/15 bg-white/5 text-white/50'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          live
            ? 'bg-[#00FF66] shadow-[0_0_6px_#00FF66] animate-pulse'
            : lobby
              ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]'
              : 'bg-white/30'
        }`}
        aria-hidden
      />
      {statusLabel(status)}
    </span>
  )
}

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diffMs = Date.now() - then
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function GameListItem({ game }: { game: HostGameListRow }) {
  const href = `/host/${game.id}?code=${encodeURIComponent(game.code)}`

  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-3 min-h-[4.25rem] hover:border-[#00FF66]/35 hover:bg-[#00FF66]/5 transition-colors touch-manipulation"
    >
      <div className="shrink-0 w-11 h-11 rounded-xl bg-[#00FF66]/10 border border-[#00FF66]/20 flex items-center justify-center text-[#00FF66]">
        <Music className="w-5 h-5" aria-hidden />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          <p className="font-bold text-white truncate">{game.title}</p>
          <StatusBadge status={game.status} />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-white/45">
          <span className="font-mono text-[#00FF66]/80">{game.code}</span>
          <span>{game.callCount} call{game.callCount === 1 ? '' : 's'}</span>
          <span>{formatRelativeTime(game.createdAt)}</span>
        </div>
      </div>

      <ChevronRight
        className="w-5 h-5 shrink-0 text-white/25 group-hover:text-[#00FF66] transition-colors"
        aria-hidden
      />
    </Link>
  )
}

export function HostGamesList({ hostId, className = '' }: HostGamesListProps) {
  const supabase = useMemo(() => createClient(), [])
  const [rows, setRows] = useState<HostGameListRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    void fetchHostGamesList(supabase, { hostId, limit: 25 }).then(({ rows: next, error: err }) => {
      if (cancelled) return
      if (err) setError(err)
      setRows(next)
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [supabase, hostId])

  const activeRows = useMemo(
    () => rows.filter((r) => r.status !== 'ended'),
    [rows]
  )

  return (
    <section
      className={`lg-surface-card rounded-2xl p-6 md:p-8 max-w-2xl w-full mb-8 ${className}`}
      aria-label="Your games"
    >
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-bold text-white">Your games</h2>
          <p className="text-white/45 text-sm mt-1">Open a room dashboard or resume a live session.</p>
        </div>
        {!loading && activeRows.length > 0 ? (
          <span className="text-xs font-semibold tabular-nums text-[#00FF66]/80 bg-[#00FF66]/10 border border-[#00FF66]/25 rounded-full px-2.5 py-1">
            {activeRows.length} active
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="text-amber-300 text-sm rounded-xl border border-amber-500/30 bg-amber-950/30 px-3 py-2 mb-4">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-white/40">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading games…
        </div>
      ) : rows.length === 0 ? (
        <p className="text-white/40 text-sm py-8 text-center">
          No games yet — create one below to get a room code and dashboard link.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((game) => (
            <li key={game.id}>
              <GameListItem game={game} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
