'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { LyricGridLogo } from '@/components/LyricGridLogo'
import type {
  CardCell,
  PlaylistSong,
  LeaderboardEntry,
  GameSponsor,
  GameStatus,
} from '@/lib/supabase/types'
import { ChatPanel, type ChatIdentity } from '@/components/chat/ChatPanel'
import { BingoCard } from '@/components/bingo/BingoCard'
import { PatternMiniMap } from '@/components/bingo/PatternMiniMap'
import { PlayerProgressBar } from '@/components/bingo/PlayerProgressBar'
import { normalizeWinPattern, hasWinningPatternFromMarks, type WinPattern } from '@/lib/bingo-win-pattern'
import { getMarkedPositions, getWinProgress } from '@/lib/bingo/player-progress'
import { triggerHaptic } from '@/lib/haptic-feedback'
import { broadcastBingoClaim } from '@/lib/supabase-realtime'
import { toEvaluatorPattern } from '@/lib/bingo-evaluator'
import { roomCodeFromGame } from '@/types/database-extras'
import { FeatureGate } from '@/components/FeatureGate'

const STORAGE_KEY_PREFIX = 'bingo-marks'

function getStoredMarks(gameId: string, cardId: string): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}-${gameId}-${cardId}`)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as string[]
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

function setStoredMarks(gameId: string, cardId: string, ids: Set<string>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}-${gameId}-${cardId}`, JSON.stringify([...ids]))
  } catch {
    // ignore
  }
}

interface CellWithSong extends CardCell {
  song?: PlaylistSong | null
}

export function PlayView({
  cardId,
  gameId,
  logoUrl = null,
  whiteLabel = null,
  sponsors = [],
  lyricHint = null,
}: {
  cardId: string
  gameId: string
  logoUrl?: string | null
  whiteLabel?: {
    venueDisplayName: string | null
    brandPrimaryHex: string | null
    brandAccentHex: string | null
    brandHideLyricgrid: boolean
  } | null
  sponsors?: GameSponsor[]
  /** Optional lyric hint banner above the card (future host / AI hints). */
  lyricHint?: string | null
}) {
  const supabase = useMemo(() => createClient(), [])
  const [cells, setCells] = useState<CellWithSong[]>([])
  const [playerName, setPlayerName] = useState('')
  const [gameMode, setGameMode] = useState<WinPattern>('line')
  const [gridSize, setGridSize] = useState(5)
  const [markedSongIds, setMarkedSongIds] = useState<Set<string>>(() => getStoredMarks(gameId, cardId))
  const [loading, setLoading] = useState(true)
  const [loadHint, setLoadHint] = useState('')
  const [error, setError] = useState('')
  const [songsFetchError, setSongsFetchError] = useState('')
  const [showWinModal, setShowWinModal] = useState(false)
  const [claimName, setClaimName] = useState('')
  const [claimSubmitting, setClaimSubmitting] = useState(false)
  const [claimError, setClaimError] = useState('')
  const [bingoSubmitting, setBingoSubmitting] = useState(false)
  const [bingoMessage, setBingoMessage] = useState<'invalid' | null>(null)
  const [leaderboardDrawerOpen, setLeaderboardDrawerOpen] = useState(false)
  const [leaderboardList, setLeaderboardList] = useState<LeaderboardEntry[]>([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)
  const [gameCode, setGameCode] = useState('')
  const [playedSongIds, setPlayedSongIds] = useState<Set<string>>(new Set())
  const [profileIdentifier, setProfileIdentifier] = useState('')
  const bingoSkipClickRef = useRef(false)
  const participationSentRef = useRef(false)
  const [envelopeSponsor, setEnvelopeSponsor] = useState<GameSponsor | null>(null)
  const [gameStatus, setGameStatus] = useState<GameStatus>('lobby')
  const [chatEmail, setChatEmail] = useState('')
  const [hostShoutout, setHostShoutout] = useState<{ kind: string; message: string } | null>(null)

  const persistMarks = useCallback(
    (ids: Set<string>) => {
      setStoredMarks(gameId, cardId, ids)
    },
    [gameId, cardId]
  )

  const handleMarkChange = useCallback(
    (playlistSongId: string, marked: boolean) => {
      setMarkedSongIds((prev) => {
        const next = new Set(prev)
        if (marked) next.add(playlistSongId)
        else next.delete(playlistSongId)
        persistMarks(next)
        void fetch('/api/game/update-board', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId,
            cardId,
            markedPlaylistSongIds: [...next],
            playerIdentifier: profileIdentifier || undefined,
          }),
        })
        return next
      })
    },
    [persistMarks, gameId, cardId, profileIdentifier]
  )

  const sendParticipationSession = useCallback(() => {
    if (participationSentRef.current) return
    const name = (claimName || playerName || '').trim()
    if (!name) return
    participationSentRef.current = true
    const body = JSON.stringify({ cardId, gameId, playerName: name })
    try {
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([body], { type: 'application/json' })
        navigator.sendBeacon(`${window.location.origin}/api/player-progress/complete-session`, blob)
      } else {
        void fetch('/api/player-progress/complete-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true,
        })
      }
    } catch {
      participationSentRef.current = false
    }
  }, [cardId, gameId, claimName, playerName])

  async function handleClaimLeaderboard() {
    const name = (claimName || playerName || '').trim()
    if (!name) {
      setClaimError('Enter your name.')
      return
    }
    setClaimError('')
    setClaimSubmitting(true)
    try {
      const res = await fetch('/api/leaderboard/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId, gameId, playerName: name }),
      })
      const data = (await res.json()) as {
        ok?: boolean
        error?: string
        xpGained?: number
        newBadges?: string[]
      }
      if (data.ok) {
        participationSentRef.current = true
        setShowWinModal(false)
        setClaimName('')
      } else {
        setClaimError(data.error ?? 'Failed to claim')
      }
    } catch (e) {
      setClaimError(String(e))
    } finally {
      setClaimSubmitting(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setLoadHint('Connecting…')
      setError('')
      setSongsFetchError('')

      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (!url?.trim() || !key?.trim() || url.includes('placeholder')) {
        setError(
          'Supabase is not configured (missing NEXT_PUBLIC_SUPABASE_URL / ANON_KEY). The app cannot load your card.'
        )
        setLoading(false)
        return
      }

      const { data: card, error: cardError } = await supabase
        .from('cards')
        .select('player_name, player_identifier, grid_data')
        .eq('id', cardId)
        .single()

      if (cancelled) return

      if (cardError) {
        setError(
          `Could not read your card (${cardError.message}). This may be a network issue or database policy blocking access.`
        )
        setLoading(false)
        return
      }
      if (!card) {
        setError('Card not found. Check the link or join again.')
        setLoading(false)
        return
      }
      setPlayerName(card.player_name)
      setProfileIdentifier((card.player_identifier ?? '').trim())

      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('mode, grid_size, status, code, room_code')
        .eq('id', gameId)
        .single()

      if (cancelled) return

      if (gameError) {
        setError(`Could not load game (${gameError.message}).`)
        setLoading(false)
        return
      }
      if (game) {
        setGameMode(normalizeWinPattern(game.mode))
        setGridSize(game.grid_size === 4 ? 4 : 5)
        if (game.status) setGameStatus(game.status as GameStatus)
        setGameCode(roomCodeFromGame(game))
      }

      const { data: playedRows } = await supabase
        .from('played_songs')
        .select('playlist_song_id')
        .eq('game_id', gameId)
      if (!cancelled && playedRows) {
        setPlayedSongIds(new Set(playedRows.map((r) => r.playlist_song_id)))
      }


      // grid_data from Choice A (players + bingo_game_tracks jsonb path)
      const gridJson = card.grid_data
      if (Array.isArray(gridJson) && gridJson.length > 0) {
        setLoadHint('Loading your grid…')
        const sorted = [...gridJson].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        setCells(
          sorted.map((cell) => ({
            id: `grid-${cell.position}`,
            card_id: cardId,
            playlist_song_id: cell.playlist_song_id ?? cell.track_id,
            position: cell.position,
            created_at: '',
            song: {
              id: cell.playlist_song_id ?? cell.track_id,
              playlist_id: '',
              youtube_id: null,
              file_url: null,
              title: cell.title ?? null,
              position: cell.position,
              created_at: '',
            },
          }))
        )
        setMarkedSongIds(getStoredMarks(gameId, cardId))
        setLoading(false)
        setLoadHint('')
        return
      }
      const maxAttempts = 12
      const delayMs = 400
      let rows: CardCell[] | null = null
      let cellsError: { message: string } | null = null

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        if (cancelled) return
        setLoadHint(attempt === 1 ? 'Loading your grid…' : `Waiting for card squares… (${attempt}/${maxAttempts})`)

        const { data: cellRows, error: ce } = await supabase
          .from('card_cells')
          .select('*')
          .eq('card_id', cardId)
          .order('position', { ascending: true })

        if (cancelled) return

        if (ce) {
          cellsError = ce
          break
        }
        if (cellRows && cellRows.length > 0) {
          rows = cellRows
          break
        }
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, delayMs))
        }
      }

      if (cancelled) return

      if (!rows?.length && !cellsError) {
        setLoadHint('Retrying card grid in 1.5s…')
        await new Promise((r) => setTimeout(r, 1500))
        if (cancelled) return
        const { data: retryRows, error: retryErr } = await supabase
          .from('card_cells')
          .select('*')
          .eq('card_id', cardId)
          .order('position', { ascending: true })
        if (retryErr) {
          cellsError = retryErr
        } else if (retryRows?.length) {
          rows = retryRows
        }
      }

      if (cancelled) return

      if (cellsError) {
        setError(
          `Could not load card squares: ${cellsError.message}. If this persists, RLS may be blocking reads on card_cells for anonymous players.`
        )
        setLoading(false)
        return
      }
      if (!rows?.length) {
        setError(
          'This card has no squares yet. Try refreshing the page. If you just joined, wait a moment and reload — the grid may still be saving.'
        )
        setLoading(false)
        return
      }

      setLoadHint('Loading song titles…')
      const songIds = [...new Set(rows.map((r) => r.playlist_song_id))]
      const { data: songs, error: songsError } = await supabase.from('playlist_songs').select('*').in('id', songIds)

      if (cancelled) return

      if (songsError) {
        setSongsFetchError(
          `Song details could not be loaded (${songsError.message}). Squares still work; titles may show as placeholders.`
        )
      } else {
        setSongsFetchError('')
      }

      const songMap = new Map((songs ?? []).map((s) => [s.id, s]))
      setCells(
        rows.map((r) => ({
          ...r,
          song: songMap.get(r.playlist_song_id) ?? null,
        }))
      )
      setMarkedSongIds(getStoredMarks(gameId, cardId))
      setLoading(false)
      setLoadHint('')
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [cardId, gameId, supabase])

  useEffect(() => {
    try {
      const e = localStorage.getItem('lyricgrid_chat_email')
      if (e) setChatEmail(e)
    } catch {
      // ignore
    }
  }, [])

  /**
   * Host / Kingz Control can change `games.mode` anytime — keep player UI in sync with Supabase.
   * Requires Realtime enabled on `public.games` in the Supabase dashboard, or updates never arrive.
   * @see docs/SUPABASE-REALTIME-GAMES.md
   */
  useEffect(() => {
    const channel = supabase
      .channel(`player-sync-game-${gameId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        (payload) => {
          const row = payload.new as {
            mode?: string | null
            grid_size?: number | null
            status?: GameStatus | null
          }
          if (row.mode != null) setGameMode(normalizeWinPattern(row.mode))
          if (row.grid_size === 4 || row.grid_size === 5) setGridSize(row.grid_size)
          if (row.status === 'lobby' || row.status === 'playing' || row.status === 'ended') setGameStatus(row.status)
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'played_songs', filter: `game_id=eq.${gameId}` },
        (payload) => {
          const row = payload.new as { playlist_song_id?: string }
          if (row.playlist_song_id) {
            setPlayedSongIds((prev) => new Set([...prev, row.playlist_song_id!]))
          }
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [gameId, supabase])

  useEffect(() => {
    if (!leaderboardDrawerOpen) return
    setLeaderboardLoading(true)
    const promise = supabase
      .from('leaderboard')
      .select('id, player_name, identifier, wins, points, total_xp, last_played, updated_at')
      .order('points', { ascending: false })
      .limit(10)
    promise.then(({ data }) => {
      setLeaderboardList((data ?? []) as LeaderboardEntry[])
    }).then(() => setLeaderboardLoading(false), () => setLeaderboardLoading(false))
  }, [leaderboardDrawerOpen, supabase])

  useEffect(() => {
    if (showWinModal && sponsors.length > 0) {
      setEnvelopeSponsor(sponsors[Math.floor(Math.random() * sponsors.length)])
    } else {
      setEnvelopeSponsor(null)
    }
  }, [showWinModal, sponsors])

  useEffect(() => {
    const channel = supabase
      .channel(`play-${gameId}`)
      .on(
        'broadcast',
        { event: 'bingo_verified' },
        (payload: { payload?: { cardId?: string } }) => {
          if (payload?.payload?.cardId === cardId) setShowWinModal(true)
        }
      )
      .on(
        'broadcast',
        { event: 'host_shoutout' },
        (payload: { payload?: { kind?: string; message?: string } }) => {
          const p = payload?.payload
          if (p?.message) {
            setHostShoutout({ kind: p.kind ?? 'custom', message: p.message })
            window.setTimeout(() => setHostShoutout(null), 12000)
          }
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [gameId, cardId, supabase])

  useEffect(() => {
    const onLeave = () => {
      sendParticipationSession()
    }
    window.addEventListener('pagehide', onLeave)
    window.addEventListener('beforeunload', onLeave)
    return () => {
      window.removeEventListener('pagehide', onLeave)
      window.removeEventListener('beforeunload', onLeave)
    }
  }, [sendParticipationSession])

  const chatIdentity: ChatIdentity = useMemo(
    () => ({
      playerName,
      playerEmail: chatEmail,
      playerIdentifier: (profileIdentifier || cardId).trim(),
      avatarUrl: null,
    }),
    [playerName, chatEmail, profileIdentifier, cardId]
  )

  const canClaimBingo = hasWinningPatternFromMarks(markedSongIds, cells, gridSize, gameMode)

  async function handleBingoClick() {
    if (!canClaimBingo || bingoSubmitting) return
    setBingoMessage(null)
    setBingoSubmitting(true)
    try {
      void broadcastBingoClaim(supabase, gameId, {
        cardId,
        playerId: profileIdentifier || cardId,
        playerName,
        pattern: toEvaluatorPattern(gameMode),
        markedPlaylistSongIds: [...markedSongIds],
      })

      const res = await fetch('/api/verify-bingo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId,
          gameId,
          markedPlaylistSongIds: [...markedSongIds],
        }),
      })
      const data = (await res.json()) as { valid?: boolean; error?: string; playerName?: string }
      if (data.valid) {
        triggerHaptic('success')
        const ch = supabase.channel(`game-${gameId}`)
        ch.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            ch.send({
              type: 'broadcast',
              event: 'bingo_winner',
              payload: { cardId, playerName: data.playerName ?? playerName },
            })
          }
        })
        setShowWinModal(true)
      } else {
        triggerHaptic('error')
        setBingoMessage('invalid')
        setTimeout(() => setBingoMessage(null), 4000)
      }
    } catch {
      triggerHaptic('error')
      setBingoMessage('invalid')
      setTimeout(() => setBingoMessage(null), 4000)
    } finally {
      setBingoSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 min-h-[40vh] text-center px-4">
        <div
          className="h-10 w-10 rounded-full border-2 border-emerald-400/30 border-t-emerald-400 animate-spin"
          aria-hidden
        />
        <p className="text-xl text-slate-100">Loading your card…</p>
        {loadHint ? <p className="text-sm text-slate-400 max-w-md">{loadHint}</p> : null}
        <p className="text-xs text-slate-500 max-w-md">
          If this hangs, check your connection or Supabase env vars. Errors appear below when loading finishes.
        </p>
      </div>
    )
  }
  if (error) {
    return (
      <div className="text-center">
        <p className="text-xl text-red-300">{error}</p>
        <Link href="/join" className="mt-6 inline-block text-xl underline hover:text-yellow-400">
          Join game
        </Link>
      </div>
    )
  }

  const size = gridSize

  const bingoCardCells = useMemo(
    () =>
      cells.map((c) => ({
        id: c.id,
        position: c.position,
        playlistSongId: c.playlist_song_id,
        label: c.song?.title || c.song?.youtube_id || '—',
        albumArtUrl: c.song?.album_art_url ?? null,
      })),
    [cells]
  )

  const progress = useMemo(
    () => getWinProgress(markedSongIds, cells, size, gameMode),
    [markedSongIds, cells, size, gameMode]
  )

  const markedPositions = useMemo(
    () => getMarkedPositions(markedSongIds, cells, size),
    [markedSongIds, cells, size]
  )

  const primary = whiteLabel?.brandPrimaryHex?.trim() || '#00FFFF'
  const accent = whiteLabel?.brandAccentHex?.trim() || '#34d399'
  const hideLyricgrid = !!whiteLabel?.brandHideLyricgrid

  return (
    <div
      className="w-full max-w-6xl mx-auto px-2 sm:px-0 relative pb-32 lg:pb-28 lg:flex lg:flex-row lg:gap-6 lg:items-start"
      style={
        whiteLabel
          ? ({
              ['--venue-primary' as string]: primary,
              ['--venue-accent' as string]: accent,
            } as React.CSSProperties)
          : undefined
      }
    >
      <div className="flex-1 min-w-0 max-w-3xl mx-auto w-full">
      {/* Play header: game code + player */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {!hideLyricgrid && (
            <>
              <LyricGridLogo size={48} className="shrink-0" />
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-[#00FFFF] to-cyan-300 bg-clip-text text-transparent">
                  Your Bingo Card
                </h1>
                <p className="text-slate-400 text-sm mt-0.5 truncate">{playerName}</p>
              </div>
            </>
          )}
          {hideLyricgrid && (
            <div className="flex items-center gap-3 min-w-0">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="h-12 w-auto max-h-14 object-contain shrink-0" />
              ) : null}
              <div className="min-w-0">
                <h1
                  className="text-2xl sm:text-4xl font-bold bg-clip-text text-transparent truncate"
                  style={{
                    backgroundImage: `linear-gradient(to right, ${primary}, ${accent})`,
                  }}
                >
                  {whiteLabel?.venueDisplayName?.trim() || 'Your Bingo Card'}
                </h1>
                <p className="text-slate-400 text-sm mt-1 truncate">{playerName}</p>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {gameCode ? (
            <div
              className="rounded-xl border border-[#00FFFF]/40 bg-[#1E1E1E] px-3 py-2 text-center"
              aria-label={`Game code ${gameCode}`}
            >
              <p className="text-[10px] uppercase tracking-widest text-[#00FFFF]/70">Game code</p>
              <p className="text-lg font-black text-[#00FFFF] tabular-nums tracking-wider">{gameCode}</p>
            </div>
          ) : null}
          {!hideLyricgrid && logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Game logo" className="h-10 w-10 rounded object-contain shrink-0" />
          ) : null}
        </div>
      </div>

      {lyricHint ? (
        <div
          className="mb-4 rounded-xl border border-[#00FFFF]/35 bg-[#00FFFF]/5 px-4 py-3 text-sm text-cyan-100"
          role="note"
          aria-label="Lyric hint"
        >
          <p className="text-[10px] uppercase tracking-widest text-[#00FFFF]/80 font-semibold mb-1">Lyric hint</p>
          <p>{lyricHint}</p>
        </div>
      ) : null}

      {hostShoutout ? (
        <div
          className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
            hostShoutout.kind === 'warning'
              ? 'border-red-500/50 bg-red-950/40 text-red-100'
              : hostShoutout.kind === 'venue'
                ? 'border-[#00FFFF]/40 bg-[#00FFFF]/10 text-cyan-100'
                : 'border-amber-500/40 bg-amber-950/30 text-amber-100'
          }`}
          role="status"
        >
          <p className="text-[10px] uppercase tracking-widest opacity-80 font-semibold mb-1">Host message</p>
          <p>{hostShoutout.message}</p>
        </div>
      ) : null}

      {songsFetchError ? (
        <p className="mb-4 text-amber-200/90 text-sm rounded-xl border border-amber-500/40 bg-amber-950/40 px-4 py-3">
          {songsFetchError}
        </p>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 mb-4">
        <PlayerProgressBar
          current={progress.current}
          target={progress.target}
          label={progress.label}
          mode={gameMode}
        />
        <PatternMiniMap size={size} mode={gameMode} markedPositions={markedPositions} />
      </div>

      <BingoCard
        size={size}
        cells={bingoCardCells}
        markedSongIds={markedSongIds}
        playedSongIds={playedSongIds}
        onMarkChange={handleMarkChange}
      />

      <p className="mt-4 text-white/70 text-sm text-center">
        Tap squares when the host plays that song. Gold flash = called · Red shake = not played yet.
      </p>

      <div className="mt-6 flex flex-col items-center gap-3">
        <button
          type="button"
          onPointerDown={(e) => {
            if (e.pointerType !== 'touch' || !canClaimBingo || bingoSubmitting) return
            e.preventDefault()
            bingoSkipClickRef.current = true
            void handleBingoClick()
            window.setTimeout(() => {
              bingoSkipClickRef.current = false
            }, 600)
          }}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={() => {
            if (bingoSkipClickRef.current) {
              bingoSkipClickRef.current = false
              return
            }
            void handleBingoClick()
          }}
          disabled={!canClaimBingo || bingoSubmitting}
          className="w-full max-w-xs rounded-2xl py-4 px-8 text-xl font-black uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[#00FFFF] hover:bg-cyan-300 text-[#121212] shadow-lg shadow-[#00FFFF]/30 hover:scale-[1.02] disabled:hover:scale-100 touch-manipulation pointer-events-auto"
        >
          {bingoSubmitting ? 'Checking…' : 'BINGO!'}
        </button>
        {!canClaimBingo && (
          <p className="text-slate-500 text-xs">Mark a full line (or the current pattern) to enable BINGO.</p>
        )}
        {bingoMessage === 'invalid' && (
          <p className="text-red-400 text-sm font-medium">Invalid Bingo – only mark songs the host has already played.</p>
        )}
      </div>

      {showWinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-800 border border-emerald-500/50 rounded-2xl p-6 max-w-sm w-full shadow-xl animate-win-modal-in">
            <FeatureGate flag="sponsor_integration">
              {envelopeSponsor && (
                <div className="mb-4 rounded-xl border border-fuchsia-500/40 bg-fuchsia-950/40 p-4 text-center">
                  <p className="text-xs uppercase tracking-widest text-fuchsia-200/80 mb-2">Mystery envelope</p>
                  {envelopeSponsor.logo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={envelopeSponsor.logo_url}
                      alt=""
                      className="h-12 mx-auto mb-2 object-contain max-w-[180px]"
                    />
                  )}
                  <p className="text-fuchsia-100 font-semibold">{envelopeSponsor.name}</p>
                </div>
              )}
            </FeatureGate>
            <h2 className="text-2xl font-bold text-emerald-400 mb-2">BINGO VERIFIED!</h2>
            <FeatureGate
              flag="xp_and_badges"
              fallback={<p className="text-slate-300 mb-4">Enter your name to record your win.</p>}
            >
              <p className="text-slate-300 mb-4">Enter your name to join the Leaderboard.</p>
            </FeatureGate>
            <input
              type="text"
              value={claimName || playerName}
              onChange={(e) => setClaimName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-xl bg-slate-700 border border-slate-600 px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-4"
            />
            {claimError && <p className="text-red-400 text-sm mb-2">{claimError}</p>}
            <div className="flex gap-3">
              <button
                type="button"
                onTouchStart={(e) => e.stopPropagation()}
                onClick={handleClaimLeaderboard}
                disabled={claimSubmitting}
                className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 font-semibold py-3 text-white touch-manipulation pointer-events-auto"
              >
                {claimSubmitting ? 'Submitting…' : 'Join Leaderboard'}
              </button>
              <button
                type="button"
                onTouchStart={(e) => e.stopPropagation()}
                onClick={() => {
                  sendParticipationSession()
                  setShowWinModal(false)
                  setClaimError('')
                }}
                className="rounded-xl bg-slate-600 hover:bg-slate-500 font-semibold py-3 px-4 text-slate-200 touch-manipulation pointer-events-auto"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-col items-center gap-2">
        <FeatureGate flag="xp_and_badges">
          <Link
            href={`/profile?identifier=${encodeURIComponent(profileIdentifier || cardId)}`}
            className="text-lg text-cyan-400/90 hover:text-cyan-300 transition-colors touch-manipulation pointer-events-auto"
          >
            View your profile (XP & badges)
          </Link>
        </FeatureGate>
        <Link
          href="/lyricgrid"
          className="block text-center text-xl text-slate-400 hover:text-white transition-colors touch-manipulation pointer-events-auto"
        >
          ← Back to Home
        </Link>
      </div>

      <FeatureGate flag="xp_and_badges">
        <button
          type="button"
          onTouchStart={(e) => e.stopPropagation()}
          onClick={() => setLeaderboardDrawerOpen(true)}
          className="fixed bottom-24 right-6 z-30 lg:bottom-6 w-14 h-14 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-900 shadow-lg shadow-amber-500/40 flex items-center justify-center text-2xl transition-transform hover:scale-105 touch-manipulation pointer-events-auto"
          aria-label="View leaderboard"
        >
          🏆
        </button>
      </FeatureGate>

      <FeatureGate flag="xp_and_badges">
        {leaderboardDrawerOpen && (
          <>
            <div
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={() => setLeaderboardDrawerOpen(false)}
              aria-hidden
            />
            <div
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-slate-900 border-t border-slate-700 shadow-2xl max-h-[85vh] flex flex-col transition-transform duration-300 ease-out"
              role="dialog"
              aria-label="Top 10 leaderboard"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-700">
                <h2 className="text-xl font-bold text-white">🏆 Top 10 All-Time</h2>
                <button
                  type="button"
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={() => setLeaderboardDrawerOpen(false)}
                  className="rounded-full p-2 text-slate-400 hover:text-white hover:bg-slate-700 touch-manipulation pointer-events-auto"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <div className="overflow-y-auto flex-1 p-4">
                {leaderboardLoading ? (
                  <p className="text-slate-400 text-center py-8">Loading…</p>
                ) : leaderboardList.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">No scores yet. Win a game and claim your spot!</p>
                ) : (
                  <ul className="space-y-2">
                    {leaderboardList.map((p, i) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between gap-3 rounded-xl bg-slate-800/60 px-4 py-3 border border-slate-700/50"
                      >
                        <span className="text-lg font-bold text-amber-400 w-8 shrink-0">#{i + 1}</span>
                        <span className="flex-1 truncate text-slate-100 font-medium">{p.player_name}</span>
                        <span className="text-amber-300 font-semibold shrink-0">{(p.total_xp ?? p.points) ?? 0} XP</span>
                        <span className="text-slate-400 text-sm shrink-0">{p.wins} win{p.wins !== 1 ? 's' : ''}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}
      </FeatureGate>
      </div>

      <FeatureGate flag="community_chat">
        {(gameStatus === 'lobby' || gameStatus === 'playing') && (
          <ChatPanel
            room={gameStatus === 'lobby' ? 'lobby' : 'ingame'}
            gameId={gameId}
            identity={chatIdentity}
            title={gameStatus === 'lobby' ? 'Lobby chat' : 'Game chat'}
          />
        )}
      </FeatureGate>
    </div>
  )
}

/** @deprecated Use `PlayView` — kept for existing imports. */
export const PlayerCard = PlayView
