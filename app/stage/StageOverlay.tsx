'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { VinylSpinner } from '@/components/stage/VinylSpinner'
import { subscribeStageChannel } from '@/lib/supabase-realtime'
import type { Game, PlaylistSong } from '@/lib/supabase/types'
import { normalizeWinPattern } from '@/lib/bingo-win-pattern'
import { decadeLabelFromYear } from '@/lib/decade-theme-catalog'
import { parseEraFromThemeName, parseGenreFromThemeName } from '@/lib/browse-themes'
import { playlistSongLabel, splitSongDisplayParts } from '@/lib/media-display'
import { resolveBlindSongParts } from '@/lib/media/blind-song-label'

const WINNER_HOLD_MS = 16_000

const WIN_PATTERN_LABELS: Record<string, string> = {
  line: 'Single Line',
  corners: 'Four Corners',
  x: 'X-Pattern',
  blackout: 'Full House',
}

export type OverlayTrack = {
  id: string
  title: string
  artist: string | null
  genre: string | null
  year: number | null
  decade: string | null
  albumArtUrl: string | null
}

export type OverlayWinner = {
  playerName: string
  cardId?: string
  pattern?: string
}

type GameRow = Game & {
  current_track_index?: number | null
  current_song?: OverlayTrack | Record<string, unknown> | null
  winners?: OverlayWinner[] | Record<string, unknown> | null
}

type CatalogRow = {
  title: string
  artist: string | null
  year: number | null
  genre: string | null
}

type StageOverlayProps = {
  gameId: string
  transparent: boolean
}

function winPatternLabel(mode: string | null | undefined): string {
  const key = normalizeWinPattern(mode)
  return WIN_PATTERN_LABELS[key] ?? 'Single Line'
}

function shortCardId(cardId: string | undefined): string | null {
  if (!cardId) return null
  const trimmed = cardId.trim()
  if (!trimmed) return null
  if (trimmed.length <= 10) return trimmed
  return `${trimmed.slice(0, 8)}…`
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function winnerFromUnknown(value: unknown, fallbackPattern?: string): OverlayWinner | null {
  const row = asRecord(value)
  if (!row) return null
  const playerName =
    (typeof row.playerName === 'string' && row.playerName.trim()) ||
    (typeof row.player_name === 'string' && row.player_name.trim()) ||
    (typeof row.winnerName === 'string' && row.winnerName.trim()) ||
    (typeof row.name === 'string' && row.name.trim()) ||
    ''
  if (!playerName) return null
  const cardId =
    (typeof row.cardId === 'string' && row.cardId) ||
    (typeof row.card_id === 'string' && row.card_id) ||
    undefined
  const pattern =
    (typeof row.pattern === 'string' && row.pattern) ||
    (typeof row.mode === 'string' && row.mode) ||
    fallbackPattern
  return { playerName, cardId, pattern }
}

function trackFromPayload(payload: unknown): OverlayTrack | null {
  const row = asRecord(payload)
  if (!row) return null
  const title =
    (typeof row.title === 'string' && row.title.trim()) ||
    (typeof row.songTitle === 'string' && row.songTitle.trim()) ||
    ''
  if (!title && typeof row.songId !== 'string' && typeof row.id !== 'string') return null
  const yearRaw = row.year
  const year =
    typeof yearRaw === 'number'
      ? yearRaw
      : typeof yearRaw === 'string' && yearRaw.trim()
        ? Number(yearRaw)
        : null
  const safeYear = year != null && Number.isFinite(year) ? year : null
  return {
    id:
      (typeof row.id === 'string' && row.id) ||
      (typeof row.songId === 'string' && row.songId) ||
      (typeof row.current_song_id === 'string' && row.current_song_id) ||
      `payload-${title}`,
    title: title || 'Now Playing',
    artist:
      (typeof row.artist === 'string' && row.artist.trim()) ||
      (typeof row.songArtist === 'string' && row.songArtist.trim()) ||
      null,
    genre: (typeof row.genre === 'string' && row.genre.trim()) || null,
    year: safeYear,
    decade:
      (typeof row.decade === 'string' && row.decade.trim()) ||
      (safeYear != null ? decadeLabelFromYear(safeYear) : null),
    albumArtUrl:
      (typeof row.album_art_url === 'string' && row.album_art_url) ||
      (typeof row.albumArtUrl === 'string' && row.albumArtUrl) ||
      null,
  }
}

function resolvePlaylistSong(
  songs: PlaylistSong[],
  songId: string | null | undefined,
  trackIndex: number | null | undefined
): PlaylistSong | null {
  if (songId) {
    const byId = songs.find((s) => s.id === songId)
    if (byId) return byId
  }
  if (trackIndex == null || !Number.isFinite(trackIndex)) return null
  const byPosition = songs.find((s) => s.position === trackIndex)
  if (byPosition) return byPosition
  if (trackIndex >= 0 && trackIndex < songs.length) return songs[trackIndex] ?? null
  if (trackIndex >= 1 && trackIndex <= songs.length) return songs[trackIndex - 1] ?? null
  return null
}

async function fireOverlayConfetti(): Promise<void> {
  try {
    const { default: confetti } = await import('canvas-confetti')
    const colors = ['#00FF66', '#FFD700', '#ffffff', '#a78bfa', '#f472b6']
    confetti({
      particleCount: 180,
      spread: 120,
      startVelocity: 48,
      origin: { y: 0.45 },
      colors,
    })
    confetti({
      particleCount: 90,
      angle: 60,
      spread: 70,
      origin: { x: 0, y: 0.65 },
      colors,
    })
    confetti({
      particleCount: 90,
      angle: 120,
      spread: 70,
      origin: { x: 1, y: 0.65 },
      colors,
    })
  } catch {
    /* Overlay stays usable if canvas-confetti fails to load. */
  }
}

export function StageOverlay({ gameId, transparent }: StageOverlayProps) {
  const supabase = useMemo(() => createClient(), [])
  const [game, setGame] = useState<GameRow | null>(null)
  const [songs, setSongs] = useState<PlaylistSong[]>([])
  const [catalogByTitle, setCatalogByTitle] = useState<Record<string, CatalogRow>>({})
  const [themeMeta, setThemeMeta] = useState<{ genre: string | null; decade: string | null }>({
    genre: null,
    decade: null,
  })
  const [track, setTrack] = useState<OverlayTrack | null>(null)
  const [displayTrack, setDisplayTrack] = useState<OverlayTrack | null>(null)
  const [trackLeaving, setTrackLeaving] = useState(false)
  const [winner, setWinner] = useState<OverlayWinner | null>(null)
  const [gameMissing, setGameMissing] = useState(false)
  const songsRef = useRef(songs)
  songsRef.current = songs
  const catalogRef = useRef(catalogByTitle)
  catalogRef.current = catalogByTitle
  const themeRef = useRef(themeMeta)
  themeRef.current = themeMeta
  const hideTitlesRef = useRef(false)
  const winnerTimerRef = useRef<number | null>(null)

  const clearWinnerTimer = useCallback(() => {
    if (winnerTimerRef.current != null) {
      window.clearTimeout(winnerTimerRef.current)
      winnerTimerRef.current = null
    }
  }, [])

  const resetOverlay = useCallback(() => {
    clearWinnerTimer()
    setWinner(null)
    setTrack(null)
  }, [clearWinnerTimer])

  const announceWinner = useCallback(
    (next: OverlayWinner | null) => {
      if (!next?.playerName) return
      clearWinnerTimer()
      setWinner(next)
      void fireOverlayConfetti()
      winnerTimerRef.current = window.setTimeout(() => {
        setWinner(null)
        winnerTimerRef.current = null
      }, WINNER_HOLD_MS)
    },
    [clearWinnerTimer]
  )

  const overlayTrackFromSong = useCallback((song: PlaylistSong | null): OverlayTrack | null => {
    if (!song) return null
    const label = playlistSongLabel(song)
    const parts = splitSongDisplayParts(label)
    const catalog = catalogRef.current[parts.title.toLowerCase()]
    const year = catalog?.year ?? null
    const genre = catalog?.genre || themeRef.current.genre
    const decade =
      (year != null ? decadeLabelFromYear(year) : null) || themeRef.current.decade
    const display = resolveBlindSongParts({
      hideTitles: hideTitlesRef.current,
      trackNumber: songsRef.current.findIndex((s) => s.id === song.id) + 1 || null,
      label,
      title: parts.title,
      artist: catalog?.artist || parts.artist,
    })
    return {
      id: song.id,
      title: display.title,
      artist: display.artist,
      genre,
      year,
      decade,
      albumArtUrl: hideTitlesRef.current ? null : (song.album_art_url ?? null),
    }
  }, [])

  const applySongId = useCallback(
    (songId: string | null | undefined, trackIndex?: number | null) => {
      if (!songId && (trackIndex == null || Number.isNaN(trackIndex))) {
        setTrack(null)
        return
      }
      const song = resolvePlaylistSong(songsRef.current, songId ?? null, trackIndex ?? null)
      setTrack(overlayTrackFromSong(song))
    },
    [overlayTrackFromSong]
  )

  const applyGameRow = useCallback(
    (row: Record<string, unknown>) => {
      const next = row as unknown as GameRow
      setGame((prev) => (prev ? { ...prev, ...next } : next))
      hideTitlesRef.current = !!next.hide_song_titles

      const status = typeof next.status === 'string' ? next.status : null
      if (status === 'lobby') {
        resetOverlay()
        return
      }

      const embedded = trackFromPayload(next.current_song)
      if (embedded) {
        setTrack(embedded)
        return
      }
      applySongId(next.current_song_id, next.current_track_index)
    },
    [applySongId, resetOverlay]
  )

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data: g, error } = await supabase.from('games').select('*').eq('id', gameId).maybeSingle()
      if (cancelled) return
      if (error || !g) {
        setGameMissing(true)
        return
      }
      const row = g as GameRow
      setGame(row)
      hideTitlesRef.current = !!row.hide_song_titles

      if (row.theme_id) {
        const { data: theme } = await supabase
          .from('themes')
          .select('name')
          .eq('id', row.theme_id)
          .maybeSingle()
        if (!cancelled && theme?.name) {
          const nextTheme = {
            genre: parseGenreFromThemeName(theme.name),
            decade: parseEraFromThemeName(theme.name),
          }
          setThemeMeta(nextTheme)
          themeRef.current = nextTheme
        }
      }

      if (row.playlist_id) {
        const { data: playlistSongs } = await supabase
          .from('playlist_songs')
          .select('*')
          .eq('playlist_id', row.playlist_id)
          .order('position')
        const list = (playlistSongs ?? []) as PlaylistSong[]
        if (!cancelled) {
          setSongs(list)
          songsRef.current = list
        }

        const titles = list
          .map((s) => splitSongDisplayParts(playlistSongLabel(s)).title)
          .filter(Boolean)
        if (titles.length) {
          const { data: catalog } = await supabase
            .from('songs')
            .select('title, artist, year, genre')
            .in('title', titles)
          if (!cancelled && catalog?.length) {
            const map: Record<string, CatalogRow> = {}
            for (const item of catalog as CatalogRow[]) {
              if (item.title) map[item.title.toLowerCase()] = item
            }
            setCatalogByTitle(map)
            catalogRef.current = map
          }
        }
      }

      const embedded = trackFromPayload(row.current_song)
      if (embedded) {
        if (!cancelled) setTrack(embedded)
      } else {
        const song = resolvePlaylistSong(songsRef.current, row.current_song_id, row.current_track_index)
        if (!cancelled) setTrack(overlayTrackFromSong(song))
      }

      const { data: events } = await supabase
        .from('game_events')
        .select('event_type, payload, created_at')
        .eq('game_id', gameId)
        .in('event_type', ['bingo_approved', 'bingo_win', 'winner_crowned', 'WINNER_ANNOUNCED'])
        .order('created_at', { ascending: false })
        .limit(1)
      const recent = events?.[0]
      const recentWinner = winnerFromUnknown(recent?.payload, row.mode)
      const createdAt = recent?.created_at ? new Date(recent.created_at).getTime() : 0
      const isFresh = createdAt > 0 && Date.now() - createdAt < WINNER_HOLD_MS
      if (!cancelled && isFresh && recentWinner) {
        announceWinner(recentWinner)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [announceWinner, gameId, overlayTrackFromSong, supabase])

  useEffect(() => {
    const hostChannel = subscribeStageChannel(supabase, gameId, {
      onGameUpdate: (row) => applyGameRow(row),
      onSongChanged: (songId) => applySongId(songId),
      onWinnerCrowned: (payload) =>
        announceWinner({
          playerName: payload.playerName,
          cardId: payload.cardId,
          pattern: payload.pattern,
        }),
      onBingoWinner: ({ playerName, cardId }) => {
        if (playerName) announceWinner({ playerName, cardId, pattern: game?.mode })
      },
      onPlaybackState: () => {
        /* Audio-free overlay — ignore host pause/play SFX. */
      },
    })

    const aliasChannel = supabase
      .channel(`game:${gameId}`)
      .on('broadcast', { event: 'TRACK_PLAY' }, (msg) => {
        const next = trackFromPayload((msg as { payload?: unknown }).payload)
        if (next) setTrack(next)
      })
      .on('broadcast', { event: 'TRACK_CHANGE' }, (msg) => {
        const payload = (msg as { payload?: unknown }).payload
        const next = trackFromPayload(payload)
        if (next) {
          setTrack(next)
          return
        }
        const row = asRecord(payload)
        applySongId(
          (row?.songId as string | undefined) ?? (row?.current_song_id as string | undefined) ?? null,
          (row?.current_track_index as number | undefined) ?? null
        )
      })
      .on('broadcast', { event: 'WINNER_ANNOUNCED' }, (msg) => {
        announceWinner(winnerFromUnknown((msg as { payload?: unknown }).payload, game?.mode))
      })
      .on('broadcast', { event: 'GAME_RESET' }, () => resetOverlay())
      .on('broadcast', { event: 'game_ended' }, () => resetOverlay())
      .on('broadcast', { event: 'play-next' }, (msg) => {
        const payload = (msg as { payload?: unknown }).payload
        const next = trackFromPayload(payload)
        if (next) {
          setTrack(next)
          return
        }
        const row = asRecord(payload)
        applySongId(
          (row?.playlistSongId as string | undefined) ??
            (row?.current_song_id as string | undefined) ??
            (row?.songId as string | undefined) ??
            null
        )
      })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'game_events', filter: `game_id=eq.${gameId}` },
        (payload) => {
          const row = payload.new as { event_type?: string; payload?: unknown }
          const type = (row.event_type ?? '').toLowerCase()
          if (
            type === 'bingo_approved' ||
            type === 'bingo_win' ||
            type === 'winner_crowned' ||
            type === 'winner_announced'
          ) {
            announceWinner(winnerFromUnknown(row.payload, game?.mode))
          }
          if (type === 'game_reset' || type === 'game_ended') {
            resetOverlay()
          }
        }
      )
      .subscribe()

    hostChannel.on('broadcast', { event: 'game_ended' }, () => resetOverlay())
    hostChannel.on('broadcast', { event: 'GAME_RESET' }, () => resetOverlay())
    hostChannel.on('broadcast', { event: 'WINNER_ANNOUNCED' }, (msg) => {
      announceWinner(winnerFromUnknown((msg as { payload?: unknown }).payload, game?.mode))
    })

    return () => {
      clearWinnerTimer()
      supabase.removeChannel(hostChannel)
      supabase.removeChannel(aliasChannel)
    }
  }, [announceWinner, applyGameRow, applySongId, clearWinnerTimer, game?.mode, gameId, resetOverlay, supabase])

  useEffect(() => {
    if (!game) return
    hideTitlesRef.current = !!game.hide_song_titles
    if (game.status === 'lobby') return
    const song = resolvePlaylistSong(songs, game.current_song_id, game.current_track_index)
    if (song) setTrack(overlayTrackFromSong(song))
  }, [catalogByTitle, game, overlayTrackFromSong, songs, themeMeta])

  useEffect(() => {
    if (track?.id === displayTrack?.id) {
      if (track) setDisplayTrack(track)
      return
    }
    setTrackLeaving(true)
    const timer = window.setTimeout(() => {
      setDisplayTrack(track)
      setTrackLeaving(false)
    }, displayTrack ? 400 : 0)
    return () => window.clearTimeout(timer)
  }, [displayTrack?.id, track])

  const canvasClass = transparent
    ? 'stage-overlay-canvas stage-overlay-canvas--transparent'
    : 'stage-overlay-canvas'

  if (gameMissing) {
    return (
      <main className={canvasClass} aria-live="polite">
        <div className="stage-overlay-empty">
          <p className="stage-overlay-empty-kicker">Stage Overlay</p>
          <p className="stage-overlay-empty-copy">
            No game found for this ID. Use /stage?game=YOUR_GAME_ID
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className={canvasClass} aria-live="polite">
      {winner ? (
        <StageWinnerBanner
          winner={winner}
          fallbackPattern={game?.mode}
          onDismiss={() => {
            clearWinnerTimer()
            setWinner(null)
          }}
        />
      ) : null}

      {displayTrack ? (
        <NowPlayingLowerThird track={displayTrack} leaving={trackLeaving} />
      ) : (
        <div className="stage-overlay-standby">
          <p className="stage-overlay-kicker">LyricGrid</p>
          <p className="stage-overlay-standby-copy">Waiting for the next track…</p>
        </div>
      )}
    </main>
  )
}

function NowPlayingLowerThird({ track, leaving }: { track: OverlayTrack; leaving: boolean }) {
  const badges = [track.genre, track.decade].filter(Boolean) as string[]

  return (
    <section
      className={`stage-l3 ${leaving ? 'animate-stage-l3-out' : 'animate-stage-l3-in'}`}
      aria-label="Now playing"
    >
      <VinylSpinner spinning albumArtUrl={track.albumArtUrl} size={88} className="stage-l3-vinyl" />
      <div className="stage-l3-copy min-w-0">
        <p className="stage-overlay-kicker">Now Playing</p>
        <h1 className="stage-l3-title">{track.title}</h1>
        {track.artist ? <p className="stage-l3-artist">{track.artist}</p> : null}
        {badges.length ? (
          <div className="stage-l3-badges">
            {badges.map((badge) => (
              <span key={badge} className="stage-l3-badge">
                {badge}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}

function StageWinnerBanner({
  winner,
  fallbackPattern,
  onDismiss,
}: {
  winner: OverlayWinner
  fallbackPattern?: string
  onDismiss: () => void
}) {
  const pattern = winPatternLabel(winner.pattern || fallbackPattern)
  const cardLabel = shortCardId(winner.cardId)

  return (
    <div className="stage-winner" role="dialog" aria-labelledby="stage-winner-title">
      <div className="stage-winner-card animate-stage-winner-in">
        <p className="stage-winner-kicker">BINGO WINNER!</p>
        <h2 id="stage-winner-title" className="stage-winner-name">
          {winner.playerName}
        </h2>
        <p className="stage-winner-pattern">{pattern}</p>
        {cardLabel ? <p className="stage-winner-cardid">Card {cardLabel}</p> : null}
        <button type="button" className="stage-winner-dismiss" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  )
}

export function StageOverlayMissingGame({ transparent }: { transparent: boolean }) {
  const canvasClass = transparent
    ? 'stage-overlay-canvas stage-overlay-canvas--transparent'
    : 'stage-overlay-canvas'

  return (
    <main className={canvasClass}>
      <div className="stage-overlay-empty">
        <p className="stage-overlay-empty-kicker">Stage Overlay</p>
        <p className="stage-overlay-empty-copy">
          No active Game ID provided. Use /stage?game=YOUR_GAME_ID
        </p>
      </div>
    </main>
  )
}
