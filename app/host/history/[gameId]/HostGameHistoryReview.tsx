'use client'

import type { ReactNode } from 'react'
import { formatDuration } from '@/lib/game-history'
import { playlistSongLabel } from '@/lib/media-display'
import { roomCodeFromGame } from '@/types/database-extras'
import type { Game, PlaylistSong, PlayedSong } from '@/lib/supabase/types'
import { Archive, Music, Trophy, Users } from 'lucide-react'

export type HostGameHistoryReviewProps = {
  game: Game
  songs: PlaylistSong[]
  played: PlayedSong[]
  playerCount: number
  history: {
    winner_names: string[]
    total_players: number
    duration_seconds: number | null
    ended_at: string
    started_at: string | null
  } | null
  players: Array<{
    id: string
    playerName: string
    playerIdentifier: string | null
    won: boolean
  }>
}

/** Read-only archive view — no play / autopilot / call controls. */
export function HostGameHistoryReview({
  game,
  songs,
  played,
  playerCount,
  history,
  players,
}: HostGameHistoryReviewProps) {
  const code = roomCodeFromGame(game)
  const songById = new Map(songs.map((s) => [s.id, s]))
  const winners =
    history?.winner_names?.length
      ? history.winner_names
      : players.filter((p) => p.won).map((p) => p.playerName)
  const totalPlayers = history?.total_players || playerCount
  const duration = history?.duration_seconds ?? null

  return (
    <div className="w-full max-w-3xl space-y-6">
      <header className="lg-surface-card rounded-2xl p-6 md:p-8">
        <div className="flex items-start gap-3 mb-3">
          <div className="shrink-0 w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50">
            <Archive className="w-5 h-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-white/40 font-semibold mb-1">
              Historical review · read-only
            </p>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white truncate">
              Room {code}
            </h1>
            <p className="text-white/45 text-sm mt-1">
              Ended session for score / winner verification. Live calling controls are disabled.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <Stat label="Players" value={String(totalPlayers)} icon={<Users className="w-3.5 h-3.5" />} />
          <Stat label="Tracks called" value={String(played.length)} icon={<Music className="w-3.5 h-3.5" />} />
          <Stat
            label="Duration"
            value={formatDuration(duration)}
            icon={<Archive className="w-3.5 h-3.5" />}
          />
          <Stat
            label="Status"
            value={String(game.status)}
            icon={<Trophy className="w-3.5 h-3.5" />}
          />
        </div>

        {history?.ended_at ? (
          <p className="text-xs text-white/35 mt-4">
            Ended {new Date(history.ended_at).toLocaleString()}
            {history.started_at
              ? ` · started ${new Date(history.started_at).toLocaleString()}`
              : ''}
          </p>
        ) : game.created_at ? (
          <p className="text-xs text-white/35 mt-4">
            Created {new Date(game.created_at).toLocaleString()}
          </p>
        ) : null}
      </header>

      <section className="lg-surface-card rounded-2xl p-6" aria-label="Winners">
        <h2 className="text-lg font-bold text-[#FFD700] mb-3 flex items-center gap-2">
          <Trophy className="w-4 h-4" />
          Winners
        </h2>
        {winners.length === 0 ? (
          <p className="text-white/40 text-sm">No verified winners recorded for this session.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {winners.map((name) => (
              <li
                key={name}
                className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-sm text-amber-200"
              >
                {name}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="lg-surface-card rounded-2xl p-6" aria-label="Players">
        <h2 className="text-lg font-bold text-white mb-3">Seated players</h2>
        {players.length === 0 ? (
          <p className="text-white/40 text-sm">No player cards found.</p>
        ) : (
          <ul className="divide-y divide-white/10 rounded-xl border border-white/10 overflow-hidden">
            {players.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5 bg-black/20 text-sm"
              >
                <span className="text-white/85 truncate">{p.playerName}</span>
                {p.won ? (
                  <span className="text-[10px] font-bold uppercase tracking-wide text-amber-300 border border-amber-500/40 rounded-full px-2 py-0.5">
                    Winner
                  </span>
                ) : (
                  <span className="text-white/25 text-xs font-mono truncate max-w-[8rem]">
                    {p.id.slice(0, 8)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="lg-surface-card rounded-2xl p-6" aria-label="Called tracks">
        <h2 className="text-lg font-bold text-white mb-3">Called tracks ({played.length})</h2>
        {played.length === 0 ? (
          <p className="text-white/40 text-sm">No tracks were called in this session.</p>
        ) : (
          <ol className="space-y-1.5 max-h-[28rem] overflow-y-auto pr-1">
            {played.map((row, index) => {
              const song = songById.get(row.playlist_song_id)
              return (
                <li
                  key={row.id}
                  className="flex items-baseline gap-3 rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-sm"
                >
                  <span className="tabular-nums text-white/35 w-6 shrink-0">{index + 1}</span>
                  <span className="text-white/85 min-w-0 truncate">
                    {song ? playlistSongLabel(song) : row.playlist_song_id}
                  </span>
                  <span className="ml-auto text-xs text-white/30 whitespace-nowrap shrink-0">
                    {new Date(row.played_at).toLocaleTimeString()}
                  </span>
                </li>
              )
            })}
          </ol>
        )}
      </section>
    </div>
  )
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: ReactNode
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-white/40 text-[10px] uppercase tracking-wider mb-0.5">
        {icon}
        {label}
      </div>
      <p className="text-lg font-bold text-white tabular-nums truncate">{value}</p>
    </div>
  )
}
