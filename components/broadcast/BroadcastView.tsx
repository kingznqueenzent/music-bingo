'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  publicBroadcastJoinCode,
  resolveActiveBroadcastGame,
  type BroadcastGame,
} from '@/lib/broadcast/resolve-active-game'
import { subscribeStageChannel, type WinnerCrownedPayload } from '@/lib/supabase-realtime'
import { normalizeWinPattern } from '@/lib/bingo-win-pattern'
import { resolveBlindSongParts } from '@/lib/media/blind-song-label'
import { fetchTopPlayerStats, formatStatsUsername, type PlayerStatsRow } from '@/lib/player-stats'
import type { PlaylistSong } from '@/lib/supabase/types'

const RESOLVE_INTERVAL_MS = 20_000
const WINNER_HOLD_MS = 16_000
const LEADERBOARD_LIMIT = 8

const WIN_PATTERN_LABELS: Record<string, string> = {
  line: 'Single Line',
  corners: 'Four Corners',
  x: 'X-Pattern',
  blackout: 'Full House',
}

function winPatternLabel(mode: string | null | undefined): string {
  const key = normalizeWinPattern(mode)
  return WIN_PATTERN_LABELS[key] ?? 'Single Line'
}

function statusLabel(
  status: BroadcastGame['status'] | null | undefined,
  trackNumber: number | null,
  trackTotal: number
): string {
  if (status === 'ended') return 'Ended'
  if (status === 'lobby') return 'Waiting'
  if (status === 'playing') {
    if (trackNumber && trackTotal > 0) return `Playing · Track ${trackNumber} of ${trackTotal}`
    return 'Playing'
  }
  return 'NOT AVAILABLE'
}

export function BroadcastView({ slug }: { slug: string }) {
  const supabase = useMemo(() => createClient(), [])
  const [game, setGame] = useState<BroadcastGame | null>(null)
  const [songs, setSongs] = useState<PlaylistSong[]>([])
  const [currentSong, setCurrentSong] = useState<PlaylistSong | null>(null)
  const [winner, setWinner] = useState<WinnerCrownedPayload | null>(null)
  const [ranks, setRanks] = useState<PlayerStatsRow[]>([])
  const songsRef = useRef(songs)
  songsRef.current = songs

  const resolveGame = useCallback(async () => {
    const next = await resolveActiveBroadcastGame(supabase, slug)
    setGame((prev) => {
      if (!next) return null
      if (prev?.id === next.id && prev.status === next.status && prev.current_song_id === next.current_song_id) {
        return { ...prev, ...next }
      }
      return next
    })
  }, [slug, supabase])

  const loadRanks = useCallback(async () => {
    const { rows } = await fetchTopPlayerStats(supabase, LEADERBOARD_LIMIT)
    setRanks(rows)
  }, [supabase])

  useEffect(() => {
    void resolveGame()
    void loadRanks()
    const timer = window.setInterval(() => {
      void resolveGame()
    }, RESOLVE_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [resolveGame, loadRanks])

  useEffect(() => {
    const channel = supabase
      .channel('broadcast-active-games')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, () => {
        void resolveGame()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, resolveGame])

  useEffect(() => {
    const channel = supabase
      .channel('broadcast-player-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'player_stats' }, () => {
        void loadRanks()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, loadRanks])

  useEffect(() => {
    const playlistId = game?.playlist_id
    if (!playlistId) {
      setSongs([])
      return
    }
    let cancelled = false
    void supabase
      .from('playlist_songs')
      .select('id, playlist_id, title, position, created_at, youtube_id, file_url')
      .eq('playlist_id', playlistId)
      .order('position')
      .then(({ data }) => {
        if (!cancelled) setSongs((data ?? []) as PlaylistSong[])
      })
    return () => {
      cancelled = true
    }
  }, [game?.playlist_id, supabase])

  useEffect(() => {
    if (!game?.current_song_id || !songs.length) {
      setCurrentSong(null)
      return
    }
    setCurrentSong(songs.find((s) => s.id === game.current_song_id) ?? null)
  }, [game?.current_song_id, songs])

  useEffect(() => {
    const gameId = game?.id
    if (!gameId) return

    const channel = subscribeStageChannel(supabase, gameId, {
      onGameUpdate: (row) => {
        const status = row.status as BroadcastGame['status'] | undefined
        if (status === 'ended') {
          void resolveGame()
          return
        }
        setGame((prev) =>
          prev && prev.id === gameId
            ? {
                ...prev,
                status: (status ?? prev.status) as BroadcastGame['status'],
                current_song_id: (row.current_song_id as string | null | undefined) ?? prev.current_song_id,
                mode: (row.mode as string | undefined) ?? prev.mode,
                hide_song_titles: (row.hide_song_titles as boolean | undefined) ?? prev.hide_song_titles,
                venue_display_name:
                  (row.venue_display_name as string | null | undefined) ?? prev.venue_display_name,
                round: (row.round as number | undefined) ?? prev.round,
                code: (row.code as string | undefined) ?? prev.code,
                room_code: (row.room_code as string | null | undefined) ?? prev.room_code,
              }
            : prev
        )
      },
      onSongChanged: (songId) => {
        if (!songId) {
          setCurrentSong(null)
          return
        }
        setCurrentSong(songsRef.current.find((s) => s.id === songId) ?? null)
      },
      onWinnerCrowned: (payload) => {
        setWinner(payload)
        window.setTimeout(() => setWinner(null), WINNER_HOLD_MS)
      },
      onBingoWinner: ({ playerName }) => {
        if (!playerName) return
        setWinner((prev) => prev ?? { playerName })
        window.setTimeout(() => setWinner(null), WINNER_HOLD_MS)
      },
    })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [game?.id, supabase, resolveGame])

  if (!game) {
    return (
      <main className="broadcast-scene broadcast-standby" aria-live="polite">
        <p className="broadcast-kicker">LyricGrid</p>
        <h1 className="broadcast-identity">KINGZ &amp; QUEENZ MUSIC BINGO</h1>
        <p className="broadcast-soon">GAME STARTING SOON</p>
      </main>
    )
  }

  const joinCode = publicBroadcastJoinCode(game)
  const hideTitles = !!game.hide_song_titles
  const trackNumber =
    currentSong != null ? songs.findIndex((s) => s.id === currentSong.id) + 1 || null : null
  const nowPlaying = currentSong
    ? resolveBlindSongParts({
        hideTitles,
        trackNumber,
        label: currentSong.title,
        title: currentSong.title,
      })
    : null
  const identity = game.venue_display_name?.trim() || 'KINGZ & QUEENZ MUSIC BINGO'
  const pattern = winPatternLabel(game.mode)
  const status = statusLabel(game.status, trackNumber, songs.length)
  const waiting = !nowPlaying && game.status !== 'ended'

  return (
    <main className="broadcast-scene broadcast-live" aria-live="polite">
      {winner ? (
        <div className="broadcast-winner" role="status">
          <p className="broadcast-kicker">Winner</p>
          <p className="broadcast-winner-name">{winner.playerName}</p>
          {winner.pattern ? (
            <p className="broadcast-winner-pattern">{winPatternLabel(winner.pattern)}</p>
          ) : null}
        </div>
      ) : null}

      <header className="broadcast-header">
        <div className="broadcast-header-identity">
          <p className="broadcast-kicker">Kingz &amp; Queenz</p>
          <h1 className="broadcast-identity">{identity}</h1>
        </div>
        {joinCode ? (
          <div className="broadcast-join">
            <p className="broadcast-kicker">Join Code</p>
            <p className="broadcast-join-code">{joinCode}</p>
          </div>
        ) : null}
      </header>

      <section className="broadcast-status-row">
        <div>
          <p className="broadcast-kicker">Status</p>
          <p className="broadcast-status">{status}</p>
        </div>
        <div>
          <p className="broadcast-kicker">Win Pattern</p>
          <p className="broadcast-pattern">{pattern}</p>
        </div>
        {game.round != null ? (
          <div>
            <p className="broadcast-kicker">Round</p>
            <p className="broadcast-status">{game.round}</p>
          </div>
        ) : null}
      </section>

      <section className="broadcast-body">
        <div className="broadcast-now">
          {nowPlaying ? (
            <>
              <p className="broadcast-kicker">Now Playing</p>
              <p className="broadcast-track-title">{nowPlaying.title}</p>
              {nowPlaying.artist ? <p className="broadcast-track-artist">{nowPlaying.artist}</p> : null}
            </>
          ) : waiting ? (
            <>
              <p className="broadcast-kicker">Now Playing</p>
              <p className="broadcast-waiting">Waiting for next track</p>
            </>
          ) : (
            <>
              <p className="broadcast-kicker">Now Playing</p>
              <p className="broadcast-waiting">Waiting</p>
            </>
          )}
        </div>

        <div className="broadcast-board">
          <p className="broadcast-kicker">Leaderboard</p>
          {ranks.length === 0 ? (
            <p className="broadcast-waiting">No scores yet</p>
          ) : (
            <ol className="broadcast-ranks">
              {ranks.map((row, index) => (
                <li key={row.username} className="broadcast-rank">
                  <span className="broadcast-rank-n">#{index + 1}</span>
                  <span className="broadcast-rank-name">{formatStatsUsername(row.username)}</span>
                  <span className="broadcast-rank-wins">{row.wins} W</span>
                  <span className="broadcast-rank-pts">{row.score.toLocaleString()} pts</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </main>
  )
}
