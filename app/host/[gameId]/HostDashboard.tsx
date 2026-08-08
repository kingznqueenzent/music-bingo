'use client'

import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { GameClipPlayer, gameClipSourceLabel } from '@/components/GameClipPlayer'
import {
  updateGameSettings,
  getCardForVerification,
  getCardsForPdf,
  playNextSong,
  startGame,
  type CardCellVerification,
  type WinPattern,
} from '@/app/actions/game'
import { formatPlayerCapLabel, type GameTier } from '@/lib/tiers'
import { debounce } from '@/lib/debounce'
import { generateBingoCardsPdf } from '@/lib/pdf-export'
import { JoinGameQRCode } from '@/components/JoinGameQRCode'
import { LyricGridLogo } from '@/components/LyricGridLogo'
import { SourceIndicator } from '@/components/SourceIndicator'
import { FeatureGate } from '@/components/FeatureGate'
import { GameSponsorsPanel } from '@/components/GameSponsorsPanel'
import { HostChatModeration } from '@/components/HostChatModeration'
import Link from 'next/link'
import { playlistSongDisplayParts, playlistSongLabel } from '@/lib/media-display'
import type { Game, PlaylistSong, PlayedSong } from '@/lib/supabase/types'
import { useAutoDismissStack } from '@/hooks/useAutoDismissStack'
import {
  subscribeHostGameChannel,
  broadcastPlaybackState,
  broadcastWinnerCrowned,
  broadcastSpinWheelStart,
  type BingoClaimPayload,
} from '@/lib/supabase-realtime'
import { resolveWheelSegments, pickWheelSegmentIndex } from '@/lib/stage-prize-wheel'
import { getLevelFromXp } from '@/lib/xp-levels'
import { toEvaluatorPattern, verifyBingoFromCells } from '@/lib/bingo-evaluator'
import { getWinProgress } from '@/lib/bingo/player-progress'
import { normalizeWinPattern } from '@/lib/bingo-win-pattern'
import { WinnersCircle } from '@/components/host/WinnersCircle'
import { ShoutoutConsole } from '@/components/host/ShoutoutConsole'
import { HostSongControls, CalledSongsLog } from '@/components/host/HostSongControls'
import { PlayerListPanel, type PlayerBoardStatus, playerStatusFromProgress } from '@/components/host/PlayerListPanel'

type HostDashboardProps = {
  gameId: string
  initialGame?: Game | null
  initialSongs?: PlaylistSong[]
  initialPlayed?: PlayedSong[]
  initialPlayerCount?: number
  serverError?: string
}

export function HostDashboard({
  gameId,
  initialGame = null,
  initialSongs = [],
  initialPlayed = [],
  initialPlayerCount = 0,
  serverError: initialServerError,
}: HostDashboardProps) {
  const searchParams = useSearchParams()
  const code = searchParams.get('code') ?? ''
  const supabase = useMemo(() => createClient(), [])
  const [game, setGame] = useState<Game | null>(initialGame ?? null)
  const [songs, setSongs] = useState<PlaylistSong[]>(initialSongs)
  const [played, setPlayed] = useState<PlayedSong[]>(initialPlayed)
  const [playerCount, setPlayerCount] = useState(initialPlayerCount)
  const [loading, setLoading] = useState(!initialGame && !initialServerError)
  const [loadError, setLoadError] = useState(initialServerError ?? '')
  const [retryTrigger, setRetryTrigger] = useState(0)
  const [actionError, setActionError] = useState('')
  const [playingSongId, setPlayingSongId] = useState<string | null>(null)
  const [currentSong, setCurrentSong] = useState<PlaylistSong | null>(null)
  const [verificationCardId, setVerificationCardId] = useState('')
  const [verificationResult, setVerificationResult] = useState<
    { card: { player_name: string; player_identifier: string | null }; cells: CardCellVerification[] } | null
  >(null)
  const [verificationError, setVerificationError] = useState('')
  const [pdfExporting, setPdfExporting] = useState(false)
  const [pdfPerPage, setPdfPerPage] = useState<2 | 4>(4)
  const [logoUrlInput, setLogoUrlInput] = useState(initialGame?.logo_url ?? '')
  const [venueNameInput, setVenueNameInput] = useState(initialGame?.venue_display_name ?? '')
  const [brandPrimary, setBrandPrimary] = useState(initialGame?.brand_primary_hex ?? '#00FFFF')
  const [brandAccent, setBrandAccent] = useState(initialGame?.brand_accent_hex ?? '#10b981')
  const [hideLyricgrid, setHideLyricgrid] = useState(!!initialGame?.brand_hide_lyricgrid)
  const [entryFeeDollars, setEntryFeeDollars] = useState(
    initialGame?.entry_fee_cents != null ? String((initialGame.entry_fee_cents / 100).toFixed(2)) : '0'
  )
  const [brandingSaving, setBrandingSaving] = useState(false)
  const [verifyBingoLoading, setVerifyBingoLoading] = useState(false)
  const [verifyBingoSuccess, setVerifyBingoSuccess] = useState('')
  const { items: winnerAlerts, push: pushWinnerAlert, dismiss: dismissWinnerAlert } = useAutoDismissStack<{
    playerName: string
    cardId: string
  }>(2)
  const [resetPlayedLoading, setResetPlayedLoading] = useState(false)
  const [playbackPaused, setPlaybackPaused] = useState(false)
  const [playerBoards, setPlayerBoards] = useState<PlayerBoardStatus[]>([])
  const [winnersCircle, setWinnersCircle] = useState<{
    open: boolean
    playerName: string
    cardId: string
    pattern: string
    verified: boolean
    markedPlaylistSongIds: string[]
  }>({
    open: false,
    playerName: '',
    cardId: '',
    pattern: 'LINE',
    verified: false,
    markedPlaylistSongIds: [],
  })
  const [winConfirmLoading, setWinConfirmLoading] = useState(false)
  const nowPlayingRef = useRef<HTMLDivElement>(null)
  const previousCurrentSongRef = useRef<PlaylistSong | null>(null)
  const playRowTouchHandledRef = useRef(false)
  const playChannelRef = useRef<{ send: (msg: { type: 'broadcast'; event: string; payload: object }) => void } | null>(null)

  useEffect(() => {
    if (initialGame && retryTrigger === 0) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoadError('')
    const timeoutMs = 15000
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out. Check your connection or try again.')), timeoutMs)
    )
    const loadPromise = (async () => {
      const { data: g, error: gameError } = await supabase.from('games').select('*').eq('id', gameId).single()
      if (gameError) {
        const msg = [gameError.message, gameError.details, gameError.hint].filter(Boolean).join(' ') || 'Could not load game.'
        throw new Error(msg)
      }
      if (!g || cancelled) return
      setGame(g)
      const gg = g as Game
      setLogoUrlInput(gg.logo_url ?? '')
      setVenueNameInput(gg.venue_display_name ?? '')
      setBrandPrimary(gg.brand_primary_hex ?? '#00FFFF')
      setBrandAccent(gg.brand_accent_hex ?? '#10b981')
      setHideLyricgrid(!!gg.brand_hide_lyricgrid)
      setEntryFeeDollars(gg.entry_fee_cents != null ? String((gg.entry_fee_cents / 100).toFixed(2)) : '0')
      if (g.playlist_id) {
        const { data: s } = await supabase
          .from('playlist_songs')
          .select('*')
          .eq('playlist_id', g.playlist_id)
          .order('position')
        if (!cancelled) setSongs(s ?? [])
      }
      const { count } = await supabase.from('cards').select('*', { count: 'exact', head: true }).eq('game_id', gameId)
      if (!cancelled) setPlayerCount(count ?? 0)
      const { data: playedData } = await supabase.from('played_songs').select('*').eq('game_id', gameId).order('played_at')
      if (!cancelled) setPlayed(playedData ?? [])
    })()
    Promise.race([loadPromise, timeoutPromise])
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [gameId, supabase, retryTrigger, initialGame])

  const refreshPlayerBoards = useCallback(async () => {
    const gridSizeLocal = game?.grid_size === 4 ? 4 : 5
    const mode = normalizeWinPattern(game?.mode)
    const { data: cards } = await supabase
      .from('cards')
      .select('id, player_name, player_identifier, grid_data')
      .eq('game_id', gameId)

    const boards: PlayerBoardStatus[] = (cards ?? []).map((card) => {
      const grid = Array.isArray(card.grid_data) ? card.grid_data : []
      const cells = grid
        .map((cell, idx) => {
          const c = cell as {
            position?: number
            playlist_song_id?: string
            track_id?: string
            marked?: boolean
          }
          const songId = c.playlist_song_id ?? c.track_id
          if (!songId) return null
          return {
            position: c.position ?? idx,
            playlist_song_id: songId,
            marked: !!c.marked,
          }
        })
        .filter(Boolean) as { position: number; playlist_song_id: string; marked?: boolean }[]

      const markedIds = new Set(
        cells.filter((c) => c.marked).map((c) => c.playlist_song_id)
      )
      const progress =
        cells.length > 0
          ? getWinProgress(markedIds, cells, gridSizeLocal, mode)
          : { current: 0, target: gridSizeLocal, label: `0 / ${gridSizeLocal}` }

      let status: PlayerBoardStatus['status'] = playerStatusFromProgress(progress.current, progress.target)

      return {
        cardId: card.id,
        playerName: card.player_name ?? 'Player',
        playerIdentifier: card.player_identifier ?? null,
        markedCount: progress.current,
        target: progress.target,
        status,
      }
    })
    setPlayerBoards(boards)
  }, [game?.grid_size, game?.mode, gameId, supabase])

  const debouncedRefreshPlayerBoards = useMemo(
    () => debounce(() => void refreshPlayerBoards(), 2500),
    [refreshPlayerBoards]
  )

  const applyBoardProgress = useCallback(
    (payload: { cardId: string; markedCount: number }) => {
      setPlayerBoards((prev) => {
        const idx = prev.findIndex((p) => p.cardId === payload.cardId)
        if (idx === -1) {
          debouncedRefreshPlayerBoards()
          return prev
        }
        const row = prev[idx]
        const next = [...prev]
        next[idx] = {
          ...row,
          markedCount: payload.markedCount,
          status: playerStatusFromProgress(payload.markedCount, row.target),
        }
        return next
      })
    },
    [debouncedRefreshPlayerBoards]
  )

  useEffect(() => {
    void refreshPlayerBoards()
  }, [refreshPlayerBoards, playerCount])

  const handleBingoClaim = useCallback(
    async (payload: BingoClaimPayload) => {
      const pattern = toEvaluatorPattern(String(payload.pattern))
      const calledIds = played.map((p) => p.playlist_song_id)

      const { data: cells } = await supabase
        .from('card_cells')
        .select('position, playlist_song_id')
        .eq('card_id', payload.cardId)
        .order('position')

      let boardCells = cells ?? []
      if (boardCells.length === 0) {
        const { data: card } = await supabase
          .from('cards')
          .select('grid_data')
          .eq('id', payload.cardId)
          .single()
        const grid = Array.isArray(card?.grid_data) ? card.grid_data : []
        boardCells = grid
          .map((cell, idx) => {
            const c = cell as { position?: number; playlist_song_id?: string; track_id?: string }
            const songId = c.playlist_song_id ?? c.track_id
            if (!songId) return null
            return { position: c.position ?? idx, playlist_song_id: songId }
          })
          .filter(Boolean) as { position: number; playlist_song_id: string }[]
      }

      const gridSizeLocal = game?.grid_size === 4 ? 4 : 5
      const result = verifyBingoFromCells(
        boardCells,
        payload.markedPlaylistSongIds,
        calledIds,
        pattern,
        gridSizeLocal
      )

      setWinnersCircle({
        open: true,
        playerName: payload.playerName ?? 'Player',
        cardId: payload.cardId,
        pattern,
        verified: result.valid,
        markedPlaylistSongIds: [...(payload.markedPlaylistSongIds ?? [])],
      })
      pushWinnerAlert({
        playerName: payload.playerName ?? 'Player',
        cardId: payload.cardId,
      })
    },
    [game?.grid_size, played, pushWinnerAlert, supabase]
  )

  useEffect(() => {
    const channel = subscribeHostGameChannel(supabase, gameId, {
      onGameUpdate: (row) => setGame(row as unknown as Game),
      onSongCalled: () => {
        supabase
          .from('played_songs')
          .select('*')
          .eq('game_id', gameId)
          .order('played_at')
          .then(({ data }) => setPlayed(data ?? []))
      },
      onPlayerJoined: () => {
        supabase
          .from('cards')
          .select('*', { count: 'exact', head: true })
          .eq('game_id', gameId)
          .then(({ count }) => setPlayerCount(count ?? 0))
        debouncedRefreshPlayerBoards()
      },
      onBingoWinner: (p) => {
        pushWinnerAlert({ playerName: p.playerName ?? 'Player', cardId: p.cardId ?? '' })
      },
      onBingoClaim: (payload) => {
        void handleBingoClaim(payload)
      },
      onBoardUpdate: (payload) => {
        applyBoardProgress(payload)
      },
    })
    return () => {
      supabase.removeChannel(channel)
    }
  }, [gameId, supabase, pushWinnerAlert, handleBingoClaim, applyBoardProgress, debouncedRefreshPlayerBoards])

  useEffect(() => {
    const ch = supabase.channel(`play-${gameId}`)
    ch.subscribe(() => {})
    playChannelRef.current = ch as unknown as { send: (msg: { type: 'broadcast'; event: string; payload: object }) => void }
    return () => {
      supabase.removeChannel(ch)
      playChannelRef.current = null
    }
  }, [gameId, supabase])

  // Do not auto-load/play the last song on host page load – playback starts only when host clicks Play in "Up next"

  async function handleStart() {
    setActionError('')
    setGame((prev) => (prev ? { ...prev, status: 'playing' as const } : null))
    let success = false
    try {
      const res = await fetch('/api/start-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (res.ok && data?.ok) success = true
      else setActionError((data?.error ?? `Error ${res.status}`) + ' Trying fallback…')
    } catch (e) {
      setActionError((e instanceof Error ? e.message : 'Could not start game') + ' Trying fallback…')
    }
    if (!success) {
      const fallback = await startGame(gameId)
      if (fallback.ok) {
        success = true
        setActionError('')
      } else setActionError(fallback.error ?? 'Could not start game.')
    }
    if (!success) setGame((prev) => (prev ? { ...prev, status: 'lobby' as const } : null))
  }

  async function handleNextSong(song: PlaylistSong) {
    if (!song?.id) {
      setActionError('Invalid song.')
      return
    }
    setActionError('')
    previousCurrentSongRef.current = currentSong
    setCurrentSong(song)
    setTimeout(() => nowPlayingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    setPlayingSongId(song.id)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 12000)
    let success = false
    try {
      const res = await fetch('/api/play-next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, playlistSongId: song.id }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      let data: { ok?: boolean; error?: string } | undefined
      try {
        data = (await res.json()) as { ok?: boolean; error?: string }
      } catch {
        setActionError(res.ok ? 'Invalid response.' : `API error ${res.status}. Trying fallback…`)
        // Fall through to server action
      }
      if (res.ok && data?.ok) {
        success = true
      } else if (data?.error) {
        setActionError(data.error + ' Trying fallback…')
      }
    } catch (e) {
      clearTimeout(timeoutId)
      if ((e as Error).name === 'AbortError') {
        setActionError('Request timed out. Trying fallback…')
      } else {
        setActionError((e instanceof Error ? e.message : 'Something went wrong') + ' Trying fallback…')
      }
    }
    if (!success) {
      try {
        const fallback = await playNextSong(gameId, song.id)
        if (fallback.ok) success = true
        else setActionError(fallback.error ?? 'Could not play song.')
      } catch {
        setActionError(prev => (prev ? prev.replace(' Trying fallback…', '') + ' Fallback failed.' : 'Could not play song.'))
      }
    }
    if (success) {
      setActionError('')
      try {
        const { data: playedData } = await supabase
          .from('played_songs')
          .select('*')
          .eq('game_id', gameId)
          .order('played_at')
        setPlayed(playedData ?? [])
      } catch {
        // keep currentSong and played as-is
      }
    } else {
      setCurrentSong(previousCurrentSongRef.current)
    }
    setPlayingSongId(null)
  }

  async function handleResetPlayed() {
    setActionError('')
    setResetPlayedLoading(true)
    try {
      const res = await fetch('/api/reset-played', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (res.ok && data.ok) {
        const { data: playedData } = await supabase
          .from('played_songs')
          .select('*')
          .eq('game_id', gameId)
          .order('played_at')
        setPlayed(playedData ?? [])
        setCurrentSong(null)
      } else {
        setActionError(data.error ?? 'Could not reset played list.')
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setResetPlayedLoading(false)
    }
  }

  async function handleVerifyCard() {
    setVerificationError('')
    setVerificationResult(null)
    setVerifyBingoSuccess('')
    const id = verificationCardId.trim()
    if (!id) {
      setVerificationError('Enter a card ID.')
      return
    }
    const result = await getCardForVerification(id, gameId)
    if ('error' in result) {
      setVerificationError(result.error)
      return
    }
    setVerificationResult(result)
  }

  async function handleConfirmBingo() {
    setVerificationError('')
    setVerifyBingoSuccess('')
    const cardId = verificationCardId.trim()
    if (!cardId || !verificationResult) return
    setVerifyBingoLoading(true)
    try {
      const res = await fetch('/api/verify-bingo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, cardId }),
      })
      const data = (await res.json()) as { valid?: boolean; error?: string }
      if (data.valid) {
        playChannelRef.current?.send({
          type: 'broadcast',
          event: 'bingo_verified',
          payload: { cardId },
        })
        const playerName =
          (data as { playerName?: string }).playerName ?? verificationResult.card.player_name
        await broadcastWinnerCrowned(supabase, gameId, {
          playerName,
          cardId,
          pattern: normalizeWinPattern(game?.mode),
        })
        setVerifyBingoSuccess('Bingo verified! Winner notified — they can claim on the leaderboard.')
      } else {
        setVerificationError(data.error ?? 'Verification failed')
      }
    } catch (e) {
      setVerificationError(String(e))
    } finally {
      setVerifyBingoLoading(false)
    }
  }

  async function handleClipChange(seconds: number) {
    setActionError('')
    const prevClip = game?.clip_seconds ?? 20
    setGame((prev) => (prev ? { ...prev, clip_seconds: seconds } : null))
    const res = await updateGameSettings(gameId, { clipSeconds: seconds })
    if (res.error) {
      setActionError(res.error)
      setGame((prev) => (prev ? { ...prev, clip_seconds: prevClip } : null))
    }
  }

  async function handleCrossfadeChange(seconds: number) {
    setActionError('')
    const prevCrossfade = game?.crossfade_seconds ?? 0
    setGame((prev) => (prev ? { ...prev, crossfade_seconds: seconds } : null))
    const res = await updateGameSettings(gameId, { crossfadeSeconds: seconds })
    if (res.error) {
      setActionError(res.error)
      setGame((prev) => (prev ? { ...prev, crossfade_seconds: prevCrossfade } : null))
    }
  }

  async function handleWinPatternChange(pattern: WinPattern) {
    setActionError('')
    const prevMode = game?.mode ?? 'line'
    setGame((prev) => (prev ? { ...prev, mode: pattern } : null))
    const res = await updateGameSettings(gameId, { winPattern: pattern })
    if (res.error) {
      setActionError(res.error)
      setGame((prev) => (prev ? { ...prev, mode: prevMode } : null))
    }
  }

  async function handleSaveVenueBranding() {
    setBrandingSaving(true)
    setActionError('')
    const res = await updateGameSettings(gameId, {
      logoUrl: logoUrlInput.trim() || null,
      venueDisplayName: venueNameInput.trim() || null,
      brandPrimaryHex: brandPrimary.trim() || null,
      brandAccentHex: brandAccent.trim() || null,
      brandHideLyricgrid: hideLyricgrid,
    })
    setBrandingSaving(false)
    if (res.error) setActionError(res.error)
  }

  async function handleSaveEntryFee() {
    setBrandingSaving(true)
    setActionError('')
    const fee = Number.parseFloat(entryFeeDollars.replace(/,/g, ''))
    const feeCents = Number.isFinite(fee) ? Math.round(fee * 100) : 0
    const res = await updateGameSettings(gameId, { entryFeeCents: feeCents })
    setBrandingSaving(false)
    if (res.error) setActionError(res.error)
  }

  async function handleExportPdf() {
    setPdfExporting(true)
    setActionError('')
    const result = await getCardsForPdf(gameId)
    setPdfExporting(false)
    if ('error' in result) {
      setActionError(result.error)
      return
    }
    if (result.cards.length === 0) {
      setActionError('No cards to export. Players must join first.')
      return
    }
    await generateBingoCardsPdf(result.gameCode, result.cards, pdfPerPage, result.logoUrl)
  }

  if (loading) {
    return <div className="text-xl text-slate-300">Loading…</div>
  }
  if (loadError) {
    const isSchemaError = /playlist_id|current_song_id|player_identifier|player_name|schema cache|column.*games|column.*cards/i.test(loadError)
    const isTimeout = /timed out|timeout/i.test(loadError)
    return (
      <div className="space-y-4 max-w-xl">
        <p className="text-xl text-red-300">Could not load game.</p>
        <p className="text-slate-300 text-sm font-mono break-all bg-slate-800/80 px-3 py-2 rounded">{loadError}</p>
        {isSchemaError && (
          <p className="text-slate-400 text-sm">
            Supabase’s schema cache is stale. Run <strong>supabase/reload-schema-cache.sql</strong> in Supabase SQL Editor, wait 20 seconds, then <strong>Restart project</strong> (Project Settings → General). Then click Retry below.
          </p>
        )}
        {isTimeout && (
          <p className="text-slate-400 text-sm">
            The request took too long. Check your connection and that Supabase env vars are set on Vercel. Then click Retry.
          </p>
        )}
        {!isSchemaError && !isTimeout && (
          <p className="text-slate-400 text-sm">
            Try running <strong>supabase/reload-schema-cache.sql</strong> in Supabase SQL Editor, then <strong>Restart project</strong>, then Retry. If it still fails, check Vercel env vars (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY).
          </p>
        )}
        <button
          type="button"
          onClick={() => { setLoadError(''); setLoading(true); setRetryTrigger((n) => n + 1) }}
          className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-6 py-3"
        >
          Retry
        </button>
      </div>
    )
  }
  if (!game) {
    return <div className="text-xl text-red-300">Game not found.</div>
  }

  const playedIds = new Set(played.map((p) => p.playlist_song_id))
  const clipSeconds = game.clip_seconds ?? 20
  const crossfadeSeconds = game.crossfade_seconds ?? 0
  const gridSize = game.grid_size === 4 ? 4 : 5
  const stageUrl = typeof window !== 'undefined' ? `${window.location.origin}/stage/${gameId}` : ''
  const winPattern = (game.mode as WinPattern) || 'line'
  const upNext = songs.filter((s) => !playedIds.has(s.id))
  const playedSongs = songs.filter((s) => playedIds.has(s.id))

  async function handleConfirmWinFromCircle() {
    const cardId = winnersCircle.cardId
    if (!cardId) return
    setWinConfirmLoading(true)
    try {
      const res = await fetch('/api/verify-bingo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          cardId,
          markedPlaylistSongIds: winnersCircle.markedPlaylistSongIds,
        }),
      })
      const data = (await res.json()) as { valid?: boolean; error?: string; playerName?: string }
      if (data.valid) {
        playChannelRef.current?.send({
          type: 'broadcast',
          event: 'bingo_verified',
          payload: { cardId },
        })
        const playerName = data.playerName ?? winnersCircle.playerName
        let level: number | undefined
        let levelTitle: string | undefined
        const { data: lbRow } = await supabase
          .from('leaderboard')
          .select('points')
          .eq('player_name', playerName)
          .maybeSingle()
        if (lbRow?.points != null) {
          const lvl = getLevelFromXp(lbRow.points)
          level = lvl.level
          levelTitle = lvl.title
        }
        await broadcastWinnerCrowned(supabase, gameId, {
          playerName,
          cardId,
          pattern: winnersCircle.pattern,
          level,
          levelTitle,
        })
        setWinnersCircle((w) => ({ ...w, open: false, verified: true }))
        setVerifyBingoSuccess(`${playerName} verified!`)
      } else {
        setActionError(data.error ?? 'Verification failed')
      }
    } catch (e) {
      setActionError(String(e))
    } finally {
      setWinConfirmLoading(false)
    }
  }

  async function handleLaunchPrizeWheel() {
    const segments = resolveWheelSegments(game)
    const targetIndex = pickWheelSegmentIndex(segments)
    const spinId = crypto.randomUUID()
    await broadcastSpinWheelStart(supabase, gameId, {
      segments,
      targetIndex,
      winnerName: winnersCircle.playerName || undefined,
      spinId,
    })
    setWinnersCircle((w) => ({ ...w, open: false }))
    window.open(`/stage/${gameId}`, '_blank', 'noopener,noreferrer')
  }

  async function handleTogglePlaybackPause() {
    const next = !playbackPaused
    setPlaybackPaused(next)
    await broadcastPlaybackState(supabase, gameId, { paused: next })
  }

  return (
    <div className="w-full max-w-4xl space-y-8">
      <WinnersCircle
        open={winnersCircle.open}
        playerName={winnersCircle.playerName}
        cardId={winnersCircle.cardId}
        pattern={winnersCircle.pattern}
        verified={winnersCircle.verified}
        confirmLoading={winConfirmLoading}
        onConfirmWin={handleConfirmWinFromCircle}
        onLaunchPrizeWheel={handleLaunchPrizeWheel}
        onDismiss={() => setWinnersCircle((w) => ({ ...w, open: false }))}
      />
      {winnerAlerts.length > 0 && (
        <div className="space-y-2">
          {winnerAlerts.map((w) => (
            <div
              key={w.id}
              className={`rounded-2xl border-2 border-emerald-500 bg-emerald-500/20 p-4 flex items-center justify-between gap-4 transition-opacity duration-500 ease-out ${
                w.fading ? 'opacity-0' : 'opacity-100'
              }`}
            >
              <p className="text-xl font-bold text-emerald-300">
                🏆 WINNER: {w.playerName}
                {w.cardId ? (
                  <span className="text-slate-400 font-normal text-sm ml-2">(Card: {w.cardId.slice(0, 8)}…)</span>
                ) : null}
              </p>
              <button
                type="button"
                onClick={() => dismissWinnerAlert(w.id)}
                className="rounded-lg bg-slate-700 hover:bg-slate-600 px-3 py-1.5 text-sm text-slate-200 shrink-0 touch-manipulation"
              >
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-md shadow-black/40 p-8">
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <LyricGridLogo size={52} className="shrink-0" />
          <div>
            <h2 className="text-2xl font-bold text-[#00FFFF]/90">LyricGrid</h2>
            <p className="text-slate-400 text-sm">Host Control</p>
          </div>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-6 mb-4">
          <div>
            <h2 className="text-3xl font-bold mb-2 text-slate-50">
              Game: <span className="text-emerald-400">{code || game.code}</span>
            </h2>
            <p className="text-lg text-slate-300">
              Share this code with players, or they can scan the QR code to open the Join page with the code pre-filled.
            </p>
          </div>
          <JoinGameQRCode gameCode={code || game.code} size={140} />
        </div>
        <div className="flex flex-wrap gap-4 mb-4">
          <button
            type="button"
            onClick={handleStart}
            disabled={game.status !== 'lobby'}
            className="rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-xl font-semibold py-4 px-8 shadow-xl shadow-emerald-500/40 transition-transform hover:scale-[1.02] disabled:hover:scale-100 cursor-pointer touch-manipulation select-none active:scale-[0.98] min-h-[48px]"
          >
            ▶️ Start game
          </button>
          {stageUrl && (
            <a
              href={stageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-slate-500 px-6 py-4 text-lg font-semibold text-slate-200 hover:border-emerald-500 hover:text-emerald-400 transition-colors"
            >
              🖥️ Open Stage View
            </a>
          )}
          <a
            href="/leaderboard"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border-2 border-[#00FFFF]/70 bg-transparent px-6 py-4 text-lg font-semibold text-[#00FFFF] hover:bg-[#00FFFF]/10 hover:border-[#00FFFF] transition-all duration-300"
          >
            🏆 View Leaderboard
          </a>
        </div>
        <div className="flex flex-wrap items-center gap-4 mt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-slate-300 text-sm font-medium">Show Leaderboard on Stage View</span>
            <button
              type="button"
              role="switch"
              aria-checked={game.stage_show_leaderboard ?? false}
              onClick={async () => {
                const next = !(game.stage_show_leaderboard ?? false)
                const res = await updateGameSettings(gameId, { stageShowLeaderboard: next })
                if (res.error) setActionError(res.error)
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                game.stage_show_leaderboard ? 'bg-amber-500' : 'bg-slate-600'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition translate-x-0.5 ${
                  game.stage_show_leaderboard ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </label>
          <span className="text-slate-500 text-sm">
            When ON, Stage View shows the leaderboard instead of the media player.
          </span>
        </div>
        <p className="text-lg text-slate-300">
          📊 {playerCount.toLocaleString()} players joined
          {game.tier ? (
            <span className="ml-2 text-slate-500 text-sm">({formatPlayerCapLabel(game.tier as GameTier)})</span>
          ) : null}
        </p>

        <FeatureGate flag="host_analytics">
          <div className="mt-4 rounded-xl border border-cyan-500/20 bg-slate-900/50 p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-semibold text-cyan-400/90 uppercase tracking-wide mb-2">Analytics</h4>
              <p className="text-slate-300 text-sm">
                Live player count: <span className="font-semibold text-white">{playerCount}</span>
              </p>
            </div>
            <Link
              href="/host/analytics"
              className="rounded-full border border-cyan-500/50 px-4 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/10"
            >
              Open analytics dashboard
            </Link>
          </div>
        </FeatureGate>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-slate-400 text-sm">Print mode:</span>
          <select
            value={pdfPerPage}
            onChange={(e) => setPdfPerPage(Number(e.target.value) as 2 | 4)}
            className="rounded-lg bg-slate-800 border border-slate-600 text-slate-200 px-3 py-1.5 text-sm"
          >
            <option value={2}>2 cards per page</option>
            <option value={4}>4 cards per page</option>
          </select>
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={pdfExporting || playerCount === 0}
            className="rounded-full border border-slate-500 px-4 py-2 text-sm font-medium text-slate-200 hover:border-emerald-500 hover:text-emerald-400 disabled:opacity-50"
          >
            {pdfExporting ? 'Generating…' : 'Export PDF'}
          </button>
        </div>

        <FeatureGate flag="b2b_white_label">
          <div className="mt-6 pt-6 border-t border-slate-700 space-y-4">
            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Venue branding</h4>
            <p className="text-slate-500 text-sm">
              Shown on join, stage, and player cards. Enable “Hide LyricGrid branding” to show only your venue on
              player-facing screens.
            </p>
            <input
              type="text"
              value={venueNameInput}
              onChange={(e) => setVenueNameInput(e.target.value)}
              placeholder="Venue display name"
              className="w-full rounded-xl bg-slate-800 border border-slate-600 px-3 py-2 text-slate-200 placeholder-slate-500 text-sm"
            />
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="url"
                value={logoUrlInput}
                onChange={(e) => setLogoUrlInput(e.target.value)}
                placeholder="Logo image URL"
                className="flex-1 min-w-[200px] rounded-xl bg-slate-800 border border-slate-600 px-3 py-2 text-slate-200 placeholder-slate-500 text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-4 items-center">
              <label className="flex items-center gap-2 text-sm text-slate-300">
                Primary
                <input
                  type="color"
                  value={brandPrimary.startsWith('#') ? brandPrimary : '#00FFFF'}
                  onChange={(e) => setBrandPrimary(e.target.value)}
                  className="h-9 w-14 cursor-pointer rounded border border-slate-600 bg-slate-800"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                Accent
                <input
                  type="color"
                  value={brandAccent.startsWith('#') ? brandAccent : '#10b981'}
                  onChange={(e) => setBrandAccent(e.target.value)}
                  className="h-9 w-14 cursor-pointer rounded border border-slate-600 bg-slate-800"
                />
              </label>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
              <input
                type="checkbox"
                checked={hideLyricgrid}
                onChange={(e) => setHideLyricgrid(e.target.checked)}
                className="rounded border-slate-600"
              />
              Hide LyricGrid branding on player join / stage / bingo card
            </label>
            <button
              type="button"
              onClick={handleSaveVenueBranding}
              disabled={brandingSaving}
              className="rounded-full bg-slate-600 hover:bg-slate-500 px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {brandingSaving ? 'Saving…' : 'Save venue branding'}
            </button>
          </div>
        </FeatureGate>

        <FeatureGate flag="paid_entry_games">
          <div className="mt-6 pt-6 border-t border-slate-700 space-y-3">
            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Paid entry</h4>
            <p className="text-slate-500 text-sm">
              Entry fee per player (added to the prize pool when someone joins). Players see a payment step before
              receiving a card.
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Entry fee (USD)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={entryFeeDollars}
                  onChange={(e) => setEntryFeeDollars(e.target.value)}
                  className="w-32 rounded-xl bg-slate-800 border border-slate-600 px-3 py-2 text-slate-200 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={handleSaveEntryFee}
                disabled={brandingSaving}
                className="rounded-full bg-emerald-700 hover:bg-emerald-600 px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                Save entry fee
              </button>
            </div>
            <p className="text-slate-500 text-xs">
              Prize pool (accumulated): ${((game.prize_pool_cents ?? 0) / 100).toFixed(2)}
            </p>
          </div>
        </FeatureGate>

        <FeatureGate flag="sponsor_integration">
          <GameSponsorsPanel gameId={gameId} />
        </FeatureGate>

        <FeatureGate flag="community_chat">
          <HostChatModeration gameId={gameId} game={game} onGameRefresh={() => setRetryTrigger((n) => n + 1)} />
        </FeatureGate>

        <div className="mt-6 pt-6 border-t border-slate-700">
          <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Winning pattern (players must mark this to claim BINGO)
          </h4>
          <div className="flex flex-wrap gap-2 mb-4">
            {(
              [
                ['line', 'Single Line (horizontal, vertical, or diagonal)'],
                ['corners', 'Four Corners'],
                ['x', 'X-Shape (both diagonals)'],
                ['blackout', 'Full House (Blackout)'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => handleWinPatternChange(value)}
                className={`rounded-full px-5 py-3 text-sm font-medium transition-colors cursor-pointer touch-manipulation select-none active:scale-[0.98] min-h-[44px] ${
                  winPattern === value
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-6 pt-6 border-t border-slate-700">
          <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Auto-snippets
          </h4>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-300">Clip length:</span>
            {[20, 30, 45].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => handleClipChange(sec)}
                className={`rounded-full px-5 py-3 text-sm font-medium transition-colors cursor-pointer touch-manipulation select-none active:scale-[0.98] min-h-[44px] ${
                  clipSeconds === sec
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {sec}s
              </button>
            ))}
            <span className="text-slate-500 mx-2">|</span>
            <span className="text-slate-300">Crossfade:</span>
            {[0, 3].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => handleCrossfadeChange(sec)}
                className={`rounded-full px-5 py-3 text-sm font-medium transition-colors cursor-pointer touch-manipulation select-none active:scale-[0.98] min-h-[44px] ${
                  crossfadeSeconds === sec
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>
        </div>
        {actionError && <p className="text-red-300 mt-2">{actionError}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HostSongControls
          clipSeconds={clipSeconds}
          paused={playbackPaused}
          hasCurrentSong={!!currentSong}
          hasUpNext={upNext.length > 0}
          playing={!!playingSongId}
          onTogglePause={handleTogglePlaybackPause}
          onNext={() => upNext[0] && handleNextSong(upNext[0])}
          onSkip={() => {
            const next = upNext.find((s) => s.id !== currentSong?.id) ?? upNext[0]
            if (next) void handleNextSong(next)
          }}
          onTimerChange={handleClipChange}
        />
        <CalledSongsLog songs={playedSongs} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PlayerListPanel players={playerBoards} />
        <ShoutoutConsole gameId={gameId} supabase={supabase} />
      </div>

      {currentSong && gameClipSourceLabel(currentSong) !== 'unknown' ? (
        <div ref={nowPlayingRef} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="flex items-center gap-3 mb-4">
            <SourceIndicator source={gameClipSourceLabel(currentSong) === 'mp3' ? 'local' : 'youtube'} />
            <h3 className="text-xl font-bold text-slate-50">
              Now playing ({clipSeconds}s hook{crossfadeSeconds ? `, ${crossfadeSeconds}s crossfade` : ''})
            </h3>
          </div>
          <GameClipPlayer
            song={currentSong}
            clipSeconds={clipSeconds}
            crossfadeSeconds={crossfadeSeconds}
            autoPlay={!playbackPaused}
            className="max-w-2xl mx-auto"
          />
        </div>
      ) : null}
      {currentSong && gameClipSourceLabel(currentSong) === 'unknown' ? (
        <div ref={nowPlayingRef} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <h3 className="text-xl font-bold text-slate-50">Now playing</h3>
          <p className="text-slate-300 mt-2">{playlistSongLabel(currentSong)}</p>
        </div>
      ) : null}

      {currentSong?.source === 'local' && currentSong?.file_url && !currentSong.audio_url ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="flex items-center gap-3 mb-4">
            <SourceIndicator source="local" />
            <h3 className="text-xl font-bold text-slate-50">Now playing (Media Library)</h3>
          </div>
          {currentSong.file_url.match(/\.(mp4|webm)$/i) ? (
            <video
              key={currentSong.id}
              src={currentSong.file_url}
              autoPlay
              controls
              className="max-w-2xl mx-auto w-full rounded-xl bg-black aspect-video object-contain"
            />
          ) : (
            <audio
              key={currentSong.id}
              src={currentSong.file_url}
              autoPlay
              controls
              className="w-full max-w-2xl"
            />
          )}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-md shadow-black/40 p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h3 className="text-2xl font-bold text-slate-50">Playlist</h3>
          <button
            type="button"
            onClick={handleResetPlayed}
            disabled={resetPlayedLoading || played.length === 0}
            className="rounded-full border border-slate-500 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold py-2 px-4 text-sm text-slate-200"
          >
            {resetPlayedLoading ? 'Resetting…' : 'Reset played list'}
          </button>
        </div>
        {actionError && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/50 text-red-300 text-sm space-y-1">
            <p>{actionError}</p>
            {(actionError.includes('schema cache') || actionError.includes('column') || actionError.includes('played_songs')) && (
              <p className="text-slate-400 text-xs mt-1">Run supabase/reload-schema-cache.sql in Supabase SQL Editor, then Restart project.</p>
            )}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold text-emerald-400 uppercase tracking-wide mb-2">
              Up next – click to play
            </h4>
            <ul className="space-y-1.5 max-h-72 overflow-y-auto overscroll-contain">
              {upNext.map((song, idx) => {
                const parts = playlistSongDisplayParts(song)
                const isPlaying = playingSongId === song.id
                return (
                  <li key={song.id} className="min-w-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (playRowTouchHandledRef.current) {
                          playRowTouchHandledRef.current = false
                          return
                        }
                        handleNextSong(song)
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault()
                        playRowTouchHandledRef.current = true
                        handleNextSong(song)
                        setTimeout(() => { playRowTouchHandledRef.current = false }, 400)
                      }}
                      className="w-full flex items-center gap-2 py-3 px-3 rounded-lg hover:bg-slate-800/80 active:bg-slate-700/80 transition-colors cursor-pointer touch-manipulation select-none text-left min-h-12 border-0"
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                      title={parts.full}
                    >
                      <span className="rounded-full bg-emerald-500 text-white font-semibold py-1.5 px-3 text-xs shrink-0 min-w-[4rem] text-center pointer-events-none">
                        {isPlaying ? 'Playing…' : 'Play'}
                      </span>
                      <span className="text-slate-500 w-6 text-sm shrink-0 pointer-events-none">{idx + 1}</span>
                      <span className="flex-1 min-w-0 pointer-events-none">
                        <span className="host-song-title text-slate-200 block">{parts.title}</span>
                        {parts.artist ? (
                          <span className="text-slate-500 text-xs truncate block">{parts.artist}</span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                )
              })}
              {upNext.length === 0 && (
                <li className="text-slate-500 text-sm py-2">All tracks played</li>
              )}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Recently Played (Master list)
            </h4>
            <ul className="space-y-1.5 max-h-72 overflow-y-auto overscroll-contain">
              {playedSongs.map((song) => {
                const parts = playlistSongDisplayParts(song)
                return (
                  <li key={song.id} className="flex items-center gap-2 opacity-70 min-w-0">
                    <span className="flex-1 min-w-0">
                      <span className="host-song-title text-slate-400 line-through block">{parts.title}</span>
                      {parts.artist ? (
                        <span className="text-slate-600 text-xs truncate block">{parts.artist}</span>
                      ) : null}
                    </span>
                    <span className="text-slate-600 text-xs shrink-0">Played</span>
                  </li>
                )
              })}
              {playedSongs.length === 0 && (
                <li className="text-slate-500 text-sm py-2">No tracks played yet</li>
              )}
            </ul>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-md shadow-black/40 p-8">
        <h3 className="text-2xl font-bold mb-4 text-slate-50">Master Board – verify a bingo</h3>
        <p className="text-slate-300 mb-4">
          When a player calls Bingo, enter their Card ID to see their card with played songs highlighted.
        </p>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <input
            type="text"
            value={verificationCardId}
            onChange={(e) => setVerificationCardId(e.target.value)}
            placeholder="Card ID (e.g. from player URL)"
            className="flex-1 min-w-[200px] rounded-xl bg-slate-800 border border-slate-600 px-4 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
          <button
            type="button"
            onClick={handleVerifyCard}
            className="rounded-full bg-emerald-500 hover:bg-emerald-400 font-semibold py-2 px-6"
          >
            Load card
          </button>
        </div>
        {verificationError && <p className="text-red-300 text-sm mb-2">{verificationError}</p>}
        {verifyBingoSuccess && <p className="text-emerald-400 text-sm mb-2">{verifyBingoSuccess}</p>}
        {verificationResult && (
          <div className="mt-4">
            <p className="text-slate-300 mb-2">
              <strong>{verificationResult.card.player_name}</strong>
              {verificationResult.card.player_identifier && (
                <span className="text-slate-500 ml-2">({verificationResult.card.player_identifier})</span>
              )}
            </p>
            <div
              className="bingo-grid w-full max-w-md inline-grid gap-1.5 p-2 rounded-xl bg-slate-800/50"
              style={{
                gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${gridSize}, auto)`,
              }}
            >
              {verificationResult.cells
                .sort((a, b) => a.position - b.position)
                .map((cell) => (
                  <div
                    key={cell.position}
                    className={`bingo-cell rounded-lg px-1.5 py-2 font-medium min-h-11 min-w-0 flex items-center justify-center text-center ${
                      cell.played
                        ? 'bg-emerald-600/80 text-white'
                        : 'bg-slate-700/80 text-slate-400'
                    }`}
                    title={cell.title ?? undefined}
                  >
                    <span className="host-verify-cell-title">{cell.title?.trim() || '—'}</span>
                  </div>
                ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleConfirmBingo}
                disabled={verifyBingoLoading}
                className="rounded-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 font-semibold py-2 px-6 text-slate-900"
              >
                {verifyBingoLoading ? 'Verifying…' : 'Verify BINGO'}
              </button>
              <span className="text-slate-500 text-sm">If the card has a valid line, this notifies the player to claim on the leaderboard.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
