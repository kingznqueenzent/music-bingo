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
} from '@/app/actions/game'
import type { WinPattern } from '@/lib/bingo-win-pattern'
import { normalizeWinPattern } from '@/lib/bingo-win-pattern'
import { formatPlayerCapLabel, type GameTier } from '@/lib/tiers'
import { DEFAULT_GAME_PACE_SECONDS } from '@/lib/game-pace'
import { debounce } from '@/lib/debounce'
import { generateBingoCardsPdf } from '@/lib/pdf-export'
import { LyricGridLogo } from '@/components/LyricGridLogo'
import { VenueAssetsPanel } from '@/components/host/VenueAssetsPanel'
import { PastGamesPanel } from '@/components/host/PastGamesPanel'
import { RoomHealthPanel } from '@/components/host/RoomHealthPanel'
import { SourceIndicator } from '@/components/SourceIndicator'
import { FeatureGate } from '@/components/FeatureGate'
import { EnterpriseBrandingGate } from '@/components/host/EnterpriseBrandingGate'
import { GameSponsorsPanel } from '@/components/GameSponsorsPanel'
import { HostChatModeration } from '@/components/HostChatModeration'
import Link from 'next/link'
import { playlistSongDisplayParts, playlistSongLabel } from '@/lib/media-display'
import type { Game, GameStatus, PlaylistSong, PlayedSong } from '@/lib/supabase/types'
import { useAutoDismissStack } from '@/hooks/useAutoDismissStack'
import {
  subscribeHostGameChannel,
  broadcastPlaybackState,
  broadcastWinnerCrowned,
  broadcastSpinWheelStart,
  type BingoClaimPayload,
  type WinnerCrownedPayload,
} from '@/lib/supabase-realtime'
import { resolveWheelSegments, pickWheelSegmentIndex } from '@/lib/stage-prize-wheel'
import { getLevelFromXp } from '@/lib/xp-levels'
import { toEvaluatorPattern, verifyBingoFromCells } from '@/lib/bingo-evaluator'
import { getWinProgress } from '@/lib/bingo/player-progress'
import { WinnersCircle } from '@/components/host/WinnersCircle'
import { ShoutoutConsole } from '@/components/host/ShoutoutConsole'
import { HostSoundboard } from '@/components/host/HostSoundboard'
import { HostConfirmModal } from '@/components/host/HostConfirmModal'
import { HostSongControls, CalledSongsLog } from '@/components/host/HostSongControls'
import { HostPlayerBoardPanel, hostBoardGameCode } from '@/components/host/HostPlayerBoardPanel'
import { PlayerListPanel, type PlayerBoardStatus, playerStatusFromProgress } from '@/components/host/PlayerListPanel'
import { LayoutGrid } from 'lucide-react'
import { START_GAME_EMPTY_PLAYLIST_ERROR } from '@/lib/game-start'
import { roomCodeFromGame } from '@/types/database-extras'

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
  const codeParam = searchParams.get('code') ?? ''
  const displayCode = codeParam || (game ? roomCodeFromGame(game) : '')
  const supabase = useMemo(() => createClient(), [])
  const [game, setGame] = useState<Game | null>(initialGame ?? null)
  const [songs, setSongs] = useState<PlaylistSong[]>(initialSongs)
  const [played, setPlayed] = useState<PlayedSong[]>(initialPlayed)
  const [playerCount, setPlayerCount] = useState(initialPlayerCount)
  const [loading, setLoading] = useState(!initialGame && !initialServerError)
  const [songsLoading, setSongsLoading] = useState(!!initialGame?.playlist_id && initialSongs.length === 0)
  const [songsLoadError, setSongsLoadError] = useState('')
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
  const [brandPrimary, setBrandPrimary] = useState(initialGame?.brand_primary_hex ?? '#00FF66')
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
  const [startGameLoading, setStartGameLoading] = useState(false)
  const [startGameWarning, setStartGameWarning] = useState('')
  const [endGameConfirmOpen, setEndGameConfirmOpen] = useState(false)
  const [newGameConfirmOpen, setNewGameConfirmOpen] = useState(false)
  const [lifecycleLoading, setLifecycleLoading] = useState(false)
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
  const [celebrationRefireLoading, setCelebrationRefireLoading] = useState(false)
  const [lastCelebration, setLastCelebration] = useState<WinnerCrownedPayload | null>(null)
  const [trackSearch, setTrackSearch] = useState('')
  const [hostTab, setHostTab] = useState<'live' | 'venue' | 'history'>('live')
  const [hostBoardOpen, setHostBoardOpen] = useState(false)
  const [audioReadyLabel, setAudioReadyLabel] = useState('')
  const nowPlayingRef = useRef<HTMLDivElement>(null)
  const previousCurrentSongRef = useRef<PlaylistSong | null>(null)
  const playRowTouchHandledRef = useRef(false)
  const playChannelRef = useRef<{ send: (msg: { type: 'broadcast'; event: string; payload: object }) => void } | null>(null)
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoAdvanceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const upNextRef = useRef<PlaylistSong[]>([])
  const playbackPausedRef = useRef(false)
  const autoPlayEnabledRef = useRef(false)
  const gamePaceSecondsRef = useRef(DEFAULT_GAME_PACE_SECONDS)
  const playingSongIdRef = useRef<string | null>(null)
  const handleNextSongRef = useRef<(song: PlaylistSong) => Promise<void>>(async () => {})
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState<number | null>(null)

  useEffect(() => {
    if (initialGame && retryTrigger === 0) {
      setLoading(false)
      if (!initialGame.playlist_id || initialSongs.length > 0) {
        setSongsLoading(false)
        return
      }
    }
    let cancelled = false
    setLoadError('')
    setSongsLoadError('')
    setSongsLoading(!!initialGame?.playlist_id && initialSongs.length === 0)
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
      setBrandPrimary(gg.brand_primary_hex ?? '#00FF66')
      setBrandAccent(gg.brand_accent_hex ?? '#10b981')
      setHideLyricgrid(!!gg.brand_hide_lyricgrid)
      setEntryFeeDollars(gg.entry_fee_cents != null ? String((gg.entry_fee_cents / 100).toFixed(2)) : '0')
      if (g.playlist_id) {
        if (!cancelled) setSongsLoading(true)
        const { data: s, error: songsError } = await supabase
          .from('playlist_songs')
          .select('*')
          .eq('playlist_id', g.playlist_id)
          .order('position')
        if (!cancelled) {
          if (songsError) {
            setSongsLoadError(songsError.message)
            setSongs([])
          } else {
            setSongs(s ?? [])
          }
          setSongsLoading(false)
        }
      } else if (!cancelled) {
        setSongs([])
        setSongsLoading(false)
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
      if (result.valid) {
        setLastCelebration({
          playerName: payload.playerName ?? 'Player',
          cardId: payload.cardId,
          pattern,
        })
      }
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

  const clearAutoAdvance = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current)
      autoAdvanceTimerRef.current = null
    }
    if (autoAdvanceIntervalRef.current) {
      clearInterval(autoAdvanceIntervalRef.current)
      autoAdvanceIntervalRef.current = null
    }
    setAutoAdvanceCountdown(null)
  }, [])

  useEffect(() => () => clearAutoAdvance(), [clearAutoAdvance])

  const scheduleAutoAdvance = useCallback(() => {
    if (!autoPlayEnabledRef.current || playbackPausedRef.current || playingSongIdRef.current) return
    const pool = upNextRef.current
    if (pool.length === 0) return

    clearAutoAdvance()
    const pace = gamePaceSecondsRef.current
    setAutoAdvanceCountdown(pace)
    autoAdvanceIntervalRef.current = setInterval(() => {
      setAutoAdvanceCountdown((prev) => (prev != null && prev > 1 ? prev - 1 : prev))
    }, 1000)
    autoAdvanceTimerRef.current = setTimeout(() => {
      clearAutoAdvance()
      if (playbackPausedRef.current || playingSongIdRef.current || !autoPlayEnabledRef.current) return
      const currentPool = upNextRef.current
      if (currentPool.length === 0) return
      const pick = currentPool[Math.floor(Math.random() * currentPool.length)]
      void handleNextSongRef.current(pick)
    }, pace * 1000)
  }, [clearAutoAdvance])

  const handleClipEnded = useCallback(() => {
    scheduleAutoAdvance()
  }, [scheduleAutoAdvance])

  async function handleEndGameConfirmed() {
    setLifecycleLoading(true)
    setActionError('')
    try {
      const res = await fetch('/api/game/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!data.ok) {
        setActionError(data.error ?? 'Could not end game')
        return
      }
      setGame((prev) =>
        prev
          ? { ...prev, status: 'ended', current_song_id: null, auto_play_enabled: false }
          : prev
      )
      setPlayingSongId(null)
      setCurrentSong(null)
      setEndGameConfirmOpen(false)
      setVerifyBingoSuccess('Game ended. Players see Game Over.')
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e))
    } finally {
      setLifecycleLoading(false)
    }
  }

  async function handleNewGameConfirmed() {
    setLifecycleLoading(true)
    setActionError('')
    try {
      const res = await fetch('/api/game/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      })
      const data = (await res.json()) as {
        ok?: boolean
        error?: string
        gameId?: string
        roomCode?: string
        reusedSameGame?: boolean
      }
      if (!data.ok || !data.gameId) {
        setActionError(data.error ?? 'Could not start new game')
        return
      }
      setNewGameConfirmOpen(false)
      if (data.reusedSameGame) {
        setGame((prev) =>
          prev
            ? { ...prev, status: 'lobby', current_song_id: null, auto_play_enabled: false }
            : prev
        )
        setPlayed([])
        setPlayingSongId(null)
        setCurrentSong(null)
        setPlayerBoards([])
        setPlayerCount(0)
        setVerifyBingoSuccess(
          `Lobby reset. Room code ${data.roomCode ?? displayCode} — players should rejoin for new cards.`
        )
        setRetryTrigger((n) => n + 1)
      } else {
        window.location.assign(`/host/${data.gameId}?code=${encodeURIComponent(data.roomCode ?? '')}`)
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e))
    } finally {
      setLifecycleLoading(false)
    }
  }

  // Do not auto-load/play the last song on host page load – playback starts only when host clicks Play in "Up next"

  async function handleStart() {
    setActionError('')
    setStartGameWarning('')

    const playedIdsLocal = new Set(played.map((p) => p.playlist_song_id))
    const upNextLocal = songs.filter((s) => !playedIdsLocal.has(s.id))
    if (songs.length === 0 || upNextLocal.length === 0) {
      setStartGameWarning(
        songs.length === 0
          ? START_GAME_EMPTY_PLAYLIST_ERROR
          : 'All tracks have been played. Reset the played list to start again.'
      )
      return
    }

    setStartGameLoading(true)
    let success = false
    let playlistSongId: string | undefined

    try {
      const res = await fetch('/api/start-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string; playlistSongId?: string }
      if (res.ok && data?.ok) {
        success = true
        playlistSongId = data.playlistSongId
      } else {
        console.error('[handleStart] start-game API', data?.error ?? res.status)
        setActionError((data?.error ?? `Error ${res.status}`) + ' Trying fallback…')
      }
    } catch (e) {
      console.error('[handleStart] start-game fetch', e)
      setActionError((e instanceof Error ? e.message : 'Could not start game') + ' Trying fallback…')
    }

    if (!success) {
      try {
        const fallback = await startGame(gameId)
        if (fallback.ok) {
          success = true
          playlistSongId = fallback.playlistSongId
          setActionError('')
        } else {
          console.error('[handleStart] startGame fallback', fallback.error)
          setActionError(fallback.error ?? 'Could not start game.')
        }
      } catch (e) {
        console.error('[handleStart] startGame fallback', e)
        setActionError('Could not start game.')
      }
    }

    if (success) {
      const song = playlistSongId ? songs.find((s) => s.id === playlistSongId) ?? null : null
      setGame((prev) =>
        prev
          ? { ...prev, status: 'playing', current_song_id: playlistSongId ?? null }
          : null
      )
      if (song) {
        setCurrentSong(song)
        setTimeout(() => nowPlayingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
      }
      try {
        const { data: playedData } = await supabase
          .from('played_songs')
          .select('*')
          .eq('game_id', gameId)
          .order('played_at')
        setPlayed(playedData ?? [])
      } catch (e) {
        console.error('[handleStart] refresh played_songs', e)
      }
    }

    setStartGameLoading(false)
  }

  async function handleNextSong(song: PlaylistSong) {
    if (!song?.id) {
      setActionError('Invalid song.')
      return
    }
    clearAutoAdvance()
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
        clearAutoAdvance()
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
        setLastCelebration({
          playerName,
          cardId,
          pattern: normalizeWinPattern(game?.mode),
        })
        setVerifyBingoSuccess('Bingo verified! Celebration fired on Stage & overlay.')
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

  async function handleAutoPlayToggle() {
    setActionError('')
    const next = !(game?.auto_play_enabled ?? false)
    const prev = game?.auto_play_enabled ?? false
    setGame((g) => (g ? { ...g, auto_play_enabled: next } : null))
    if (!next) clearAutoAdvance()
    const res = await updateGameSettings(gameId, { autoPlayEnabled: next })
    if (res.error) {
      setActionError(res.error)
      setGame((g) => (g ? { ...g, auto_play_enabled: prev } : null))
    }
  }

  async function handlePaceChange(seconds: number) {
    setActionError('')
    const prevPace = game?.game_pace_seconds ?? DEFAULT_GAME_PACE_SECONDS
    setGame((g) => (g ? { ...g, game_pace_seconds: seconds } : null))
    const res = await updateGameSettings(gameId, { gamePaceSeconds: seconds })
    if (res.error) {
      setActionError(res.error)
      setGame((g) => (g ? { ...g, game_pace_seconds: prevPace } : null))
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
  const autoPlayEnabled = game.auto_play_enabled ?? false
  const gamePaceSeconds = game.game_pace_seconds ?? DEFAULT_GAME_PACE_SECONDS
  const gridSize = game.grid_size === 4 ? 4 : 5
  const stageUrl = typeof window !== 'undefined' ? `${window.location.origin}/stage/${gameId}` : ''
  const overlayUrl = typeof window !== 'undefined' ? `${window.location.origin}/overlay/${gameId}` : ''
  const winPattern = normalizeWinPattern(game.mode)
  const upNext = songs.filter((s) => !playedIds.has(s.id))
  const playedSongs = songs.filter((s) => playedIds.has(s.id))
  const trackSearchQ = trackSearch.trim().toLowerCase()
  const songMatchesSearch = (song: PlaylistSong) => {
    if (!trackSearchQ) return true
    const parts = playlistSongDisplayParts(song)
    return (
      parts.title.toLowerCase().includes(trackSearchQ) ||
      (parts.artist ?? '').toLowerCase().includes(trackSearchQ) ||
      parts.full.toLowerCase().includes(trackSearchQ)
    )
  }
  const filteredUpNext = upNext.filter(songMatchesSearch)
  const filteredPlayedSongs = playedSongs.filter(songMatchesSearch)
  const gameStatus = (game.status ?? 'lobby') as GameStatus
  const gameAlreadyLive = gameStatus === 'playing' && played.length > 0
  const canStartGame = gameStatus !== 'ended' && !gameAlreadyLive
  const showEmptyPlaylistHint = !songsLoading && songs.length === 0 && !songsLoadError

  upNextRef.current = upNext
  playbackPausedRef.current = playbackPaused
  autoPlayEnabledRef.current = autoPlayEnabled
  gamePaceSecondsRef.current = gamePaceSeconds
  playingSongIdRef.current = playingSongId
  handleNextSongRef.current = handleNextSong

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
        setLastCelebration({
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

  async function handleManualCelebration() {
    const payload =
      lastCelebration ??
      (winnersCircle.cardId
        ? {
            playerName: winnersCircle.playerName,
            cardId: winnersCircle.cardId,
            pattern: winnersCircle.pattern,
          }
        : null)
    if (!payload?.playerName) {
      setActionError('No winner to celebrate yet.')
      return
    }
    setCelebrationRefireLoading(true)
    setActionError('')
    try {
      await broadcastWinnerCrowned(supabase, gameId, payload)
      setLastCelebration(payload)
      setVerifyBingoSuccess(`Celebration re-fired for ${payload.playerName}`)
    } catch (e) {
      setActionError(String(e))
    } finally {
      setCelebrationRefireLoading(false)
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
    if (next) clearAutoAdvance()
    await broadcastPlaybackState(supabase, gameId, { paused: next })
  }

  return (
    <div className="w-full max-w-4xl min-w-0 space-y-5 sm:space-y-8 overflow-x-hidden px-0">
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
              className={`rounded-2xl border-2 border-emerald-500 bg-emerald-500/20 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-opacity duration-500 ease-out ${
                w.fading ? 'opacity-0' : 'opacity-100'
              }`}
            >
              <p className="text-base sm:text-xl font-bold text-emerald-300 min-w-0 break-words">
                🏆 WINNER: {w.playerName}
                {w.cardId ? (
                  <span className="text-slate-400 font-normal text-sm ml-2 block sm:inline">
                    (Card: {w.cardId.slice(0, 8)}…)
                  </span>
                ) : null}
              </p>
              <button
                type="button"
                onClick={() => dismissWinnerAlert(w.id)}
                className="rounded-lg bg-slate-700 hover:bg-slate-600 px-4 py-2.5 text-sm text-slate-200 shrink-0 touch-manipulation min-h-11 w-full sm:w-auto"
              >
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-md shadow-black/40 p-4 sm:p-6 md:p-8 min-w-0">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <LyricGridLogo size={44} className="shrink-0 sm:hidden" />
          <LyricGridLogo size={52} className="shrink-0 hidden sm:block" />
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-[#00FF66]/90">LyricGrid</h2>
            <p className="text-slate-400 text-sm">Host Control</p>
          </div>
        </div>
        <div
          className="flex flex-wrap gap-2 mb-5 p-1 rounded-xl border border-slate-700 bg-slate-950/40"
          role="tablist"
          aria-label="Host dashboard sections"
        >
          {(
            [
              { id: 'live' as const, label: 'Live room' },
              { id: 'venue' as const, label: 'Venue Assets / QR' },
              { id: 'history' as const, label: 'Past Games' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={hostTab === tab.id}
              onClick={() => setHostTab(tab.id)}
              className={`px-3 sm:px-4 py-2.5 min-h-12 rounded-lg text-sm font-semibold touch-manipulation transition-colors ${
                hostTab === tab.id
                  ? 'bg-[#00FF66]/15 text-[#00FF66] border border-[#00FF66]/30'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {hostTab === 'venue' ? (
          <VenueAssetsPanel gameCode={displayCode} variant="full" />
        ) : null}
        {hostTab === 'history' ? (
          <PastGamesPanel hostId={game.host_id ?? null} />
        ) : null}

        {hostTab === 'live' ? (
        <>
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-center sm:items-start justify-between gap-4 sm:gap-6 mb-4">
          <div className="min-w-0 w-full sm:flex-1 text-center sm:text-left">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-slate-50 break-words">
              Game: <span className="text-emerald-400">{displayCode}</span>
            </h2>
            <p className="text-sm sm:text-lg text-slate-300">
              Share this code with players, or open Venue Assets for a high-res QR linking to{' '}
              <span className="text-[#00FF66]/80">lyricgrid.ca/room/{displayCode}</span>.
            </p>
          </div>
          <VenueAssetsPanel
            gameCode={displayCode}
            variant="compact"
            className="mx-auto sm:mx-0 shrink-0"
          />
        </div>
        <RoomHealthPanel
          gameId={gameId}
          playerCount={playerCount}
          trackedBoards={playerBoards.length}
          className="mb-4"
        />
        <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-3 sm:gap-4 mb-4">
          <button
            type="button"
            onClick={handleStart}
            disabled={!canStartGame || startGameLoading || songsLoading}
            className="w-full sm:w-auto rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-lg sm:text-xl font-semibold py-3.5 sm:py-4 px-6 sm:px-8 shadow-xl shadow-emerald-500/40 transition-transform hover:scale-[1.02] disabled:hover:scale-100 cursor-pointer touch-manipulation select-none active:scale-[0.98] min-h-12 inline-flex items-center justify-center gap-2"
          >
            {startGameLoading || songsLoading ? (
              <>
                <span
                  className="inline-block h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin"
                  aria-hidden
                />
                {songsLoading ? 'Loading playlist…' : 'Starting…'}
              </>
            ) : (
              '▶️ Start game'
            )}
          </button>
          {gameStatus !== 'ended' ? (
            <button
              type="button"
              onClick={() => setEndGameConfirmOpen(true)}
              disabled={lifecycleLoading}
              className="w-full sm:w-auto rounded-full border border-red-500/50 px-6 py-3.5 sm:py-4 text-base sm:text-lg font-semibold text-red-300 hover:bg-red-500/10 transition-colors min-h-12 inline-flex items-center justify-center touch-manipulation disabled:opacity-50"
            >
              End Current Game
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setNewGameConfirmOpen(true)}
            disabled={lifecycleLoading}
            className="w-full sm:w-auto rounded-full border border-[#00FF66]/50 px-6 py-3.5 sm:py-4 text-base sm:text-lg font-semibold text-[#00FF66] hover:bg-[#00FF66]/10 transition-colors min-h-12 inline-flex items-center justify-center touch-manipulation disabled:opacity-50"
          >
            Start New Game
          </button>
          {gameAlreadyLive ? (
            <p className="w-full text-[#00FF66]/90 text-sm font-medium" role="status">
              Game is live — use Song Controls or Up Next below to call tracks.
            </p>
          ) : null}
          {gameStatus === 'ended' ? (
            <p className="w-full text-slate-400 text-sm font-medium" role="status">
              This game has ended. Tap <span className="text-[#00FF66]">Start New Game</span> for a fresh lobby.
            </p>
          ) : null}
          {songsLoadError ? (
            <p className="w-full text-amber-300 text-sm font-medium" role="alert">
              Could not load playlist: {songsLoadError}{' '}
              <button
                type="button"
                onClick={() => { setSongsLoadError(''); setRetryTrigger((n) => n + 1) }}
                className="underline text-emerald-300 hover:text-emerald-200 font-semibold"
              >
                Retry
              </button>
            </p>
          ) : null}
          {showEmptyPlaylistHint ? (
            <p className="w-full text-amber-300 text-sm font-medium" role="alert">
              {START_GAME_EMPTY_PLAYLIST_ERROR}.{' '}
              <Link href="/host" className="underline text-emerald-300 hover:text-emerald-200">
                Add songs on the host panel
              </Link>
              {' or '}
              <Link href="/themes" className="underline text-emerald-300 hover:text-emerald-200">
                browse themes
              </Link>
              .
            </p>
          ) : null}
          {startGameWarning ? (
            <p className="w-full text-amber-300 text-sm font-medium" role="alert">
              {startGameWarning}
            </p>
          ) : null}
          {stageUrl && (
            <a
              href={stageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto text-center rounded-full border border-slate-500 px-6 py-3.5 sm:py-4 text-base sm:text-lg font-semibold text-slate-200 hover:border-emerald-500 hover:text-emerald-400 transition-colors min-h-12 inline-flex items-center justify-center touch-manipulation"
            >
              🖥️ Open Stage View
            </a>
          )}
          {overlayUrl && (
            <a
              href={overlayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto text-center rounded-full border border-[#00FF66]/50 px-6 py-3.5 sm:py-4 text-base sm:text-lg font-semibold text-[#00FF66] hover:bg-[#00FF66]/10 transition-colors min-h-12 inline-flex items-center justify-center touch-manipulation"
            >
              📺 Meld Overlay
            </a>
          )}
          <a
            href="/leaderboard"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto text-center rounded-full border-2 border-[#00FF66]/70 bg-transparent px-6 py-3.5 sm:py-4 text-base sm:text-lg font-semibold text-[#00FF66] hover:bg-[#00FF66]/10 hover:border-[#00FF66] transition-all duration-300 min-h-12 inline-flex items-center justify-center touch-manipulation"
          >
            🏆 View Leaderboard
          </a>
          <button
            type="button"
            onClick={() => setHostBoardOpen(true)}
            className="hidden lg:inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-[#00FF66]/50 bg-[#00FF66]/10 px-6 py-3.5 sm:py-4 text-base sm:text-lg font-semibold text-[#00FF66] hover:bg-[#00FF66]/15 transition-colors min-h-12 touch-manipulation"
          >
            <LayoutGrid className="h-5 w-5 shrink-0" aria-hidden />
            View Card
          </button>
        </div>
        <div className="flex flex-col gap-3 mt-4">
          <div className="flex flex-wrap items-center gap-4">
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
                  else setGame((g) => (g ? { ...g, stage_show_leaderboard: next } : g))
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                  game.stage_show_leaderboard ? 'bg-amber-500' : 'bg-slate-600'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition ${
                    game.stage_show_leaderboard ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </label>
            <span className="text-slate-500 text-sm">
              When ON, Stage View shows the leaderboard instead of the media player.
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-slate-300 text-sm font-medium">Blind Mode (Hide Song Titles)</span>
              <button
                type="button"
                role="switch"
                aria-checked={!!game.hide_song_titles}
                onClick={async () => {
                  const next = !game.hide_song_titles
                  const res = await updateGameSettings(gameId, { hideSongTitles: next })
                  if (res.error) setActionError(res.error)
                  else setGame((g) => (g ? { ...g, hide_song_titles: next } : g))
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                  game.hide_song_titles ? 'bg-[#00FF66]' : 'bg-slate-600'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition ${
                    game.hide_song_titles ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </label>
            <span className="text-slate-500 text-sm">
              Players & Stage show ??? — identify songs by ear before stamping.
            </span>
          </div>
        </div>
        <p className="text-lg text-slate-300">
          📊 {playerCount.toLocaleString()} players joined
          {game.tier ? (
            <span className="ml-2 text-slate-500 text-sm">({formatPlayerCapLabel(game.tier as GameTier)})</span>
          ) : null}
        </p>

        <FeatureGate flag="host_analytics">
          <div className="mt-4 rounded-xl border border-green-500/20 bg-slate-900/50 p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-semibold text-green-400/90 uppercase tracking-wide mb-2">Analytics</h4>
              <p className="text-slate-300 text-sm">
                Live player count: <span className="font-semibold text-white">{playerCount}</span>
              </p>
            </div>
            <Link
              href="/host/analytics"
              className="rounded-full border border-green-500/50 px-4 py-2 text-sm font-semibold text-green-200 hover:bg-green-500/10"
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
          <EnterpriseBrandingGate>
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
                  value={brandPrimary.startsWith('#') ? brandPrimary : '#00FF66'}
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
          </EnterpriseBrandingGate>
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
        </>
        ) : null}
      </div>

      {hostTab === 'live' ? (
      <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HostSongControls
          clipSeconds={clipSeconds}
          paused={playbackPaused}
          hasCurrentSong={!!currentSong}
          hasUpNext={upNext.length > 0}
          playing={!!playingSongId}
          autoPlayEnabled={autoPlayEnabled}
          gamePaceSeconds={gamePaceSeconds}
          autoAdvanceCountdown={autoAdvanceCountdown}
          onToggleAutoPlay={() => void handleAutoPlayToggle()}
          onPaceChange={(sec) => void handlePaceChange(sec)}
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
        <div className="space-y-4">
          <ShoutoutConsole gameId={gameId} supabase={supabase} />
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <h3 className="text-sm font-bold text-slate-300 mb-2">Stage celebration</h3>
            <p className="text-slate-500 text-xs mb-3">
              Auto-fires when BINGO is server-verified. Re-play if OBS missed it.
            </p>
            <button
              type="button"
              onClick={() => void handleManualCelebration()}
              disabled={celebrationRefireLoading || (!lastCelebration && !winnersCircle.cardId)}
              className="w-full rounded-full border border-[#FFD700]/60 bg-[#FFD700]/10 hover:bg-[#FFD700]/20 disabled:opacity-40 text-[#FFD700] font-bold py-2.5 text-sm"
            >
              {celebrationRefireLoading
                ? 'Firing…'
                : `Manual Trigger${lastCelebration?.playerName ? `: ${lastCelebration.playerName}` : ''}`}
            </button>
          </div>
        </div>
      </div>

      <HostSoundboard gameId={gameId} supabase={supabase} />

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
            onEnded={handleClipEnded}
            onReadyChange={(state, detail) => {
              if (state === 'loading') {
                setAudioReadyLabel(`Buffering… ${detail?.bufferedPct ?? 0}%`)
              } else if (state === 'ready') {
                setAudioReadyLabel(
                  `Ready to call${detail?.latencyMs != null ? ` · ${detail.latencyMs}ms` : ''}${
                    detail?.bufferedPct ? ` · ${detail.bufferedPct}% cached` : ''
                  }`
                )
              } else if (state === 'error') {
                setAudioReadyLabel('Audio error — try next track or check storage URL')
              } else {
                setAudioReadyLabel('')
              }
            }}
            className="max-w-2xl mx-auto"
          />
          {audioReadyLabel ? (
            <p
              className={`mt-2 text-xs font-medium ${
                audioReadyLabel.startsWith('Ready')
                  ? 'text-emerald-400'
                  : audioReadyLabel.startsWith('Audio error')
                    ? 'text-red-300'
                    : 'text-amber-300'
              }`}
            >
              {audioReadyLabel}
            </p>
          ) : null}
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

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-md shadow-black/40 p-4 sm:p-6 md:p-8 min-w-0 overflow-x-hidden">
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-3 sm:gap-4 mb-4">
          <h3 className="text-xl sm:text-2xl font-bold text-slate-50">Playlist</h3>
          <button
            type="button"
            onClick={handleResetPlayed}
            disabled={resetPlayedLoading || played.length === 0}
            className="w-full sm:w-auto rounded-full border border-slate-500 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold py-2.5 px-4 text-sm text-slate-200 min-h-11 touch-manipulation"
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
        <div className="mb-4">
          <label htmlFor="host-track-search" className="sr-only">
            Search playlist tracks
          </label>
          <input
            id="host-track-search"
            type="search"
            value={trackSearch}
            onChange={(e) => setTrackSearch(e.target.value)}
            placeholder="Search playlist by title or artist…"
            className="w-full rounded-xl bg-slate-800/80 border border-slate-600 px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 min-h-11"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-w-0">
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-emerald-400 uppercase tracking-wide mb-2">
              Up next – click to play
            </h4>
            <ul className="space-y-1.5 max-h-72 overflow-y-auto overscroll-contain">
              {filteredUpNext.map((song, idx) => {
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
              {filteredUpNext.length === 0 && (
                <li className="text-slate-500 text-sm py-3 px-1">
                  {upNext.length === 0
                    ? 'All tracks played'
                    : trackSearchQ
                      ? (
                          <span className="flex flex-col gap-2">
                            No up-next matches.
                            <button
                              type="button"
                              onClick={() => setTrackSearch('')}
                              className="text-emerald-400 hover:text-emerald-300 text-left font-medium min-h-10"
                            >
                              Clear search
                            </button>
                          </span>
                        )
                      : 'No tracks'}
                </li>
              )}
            </ul>
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Recently Played (Master list)
            </h4>
            <ul className="space-y-1.5 max-h-72 overflow-y-auto overscroll-contain">
              {filteredPlayedSongs.map((song) => {
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
              {filteredPlayedSongs.length === 0 && (
                <li className="text-slate-500 text-sm py-2">
                  {playedSongs.length === 0 ? 'No tracks played yet' : 'No played matches for search.'}
                </li>
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
      </>
      ) : null}

      {hostTab === 'live' && game ? (
        <>
          <button
            type="button"
            onClick={() => setHostBoardOpen(true)}
            className="lg:hidden fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full border-2 border-[#00FF66]/60 bg-[#121212]/95 px-4 py-3 text-sm font-bold text-[#00FF66] shadow-[0_0_24px_rgba(0,255,102,0.2)] touch-manipulation min-h-12"
            aria-label="Open my player board"
          >
            <LayoutGrid className="h-5 w-5 shrink-0" aria-hidden />
            My Player Board
          </button>
          <HostPlayerBoardPanel
            gameId={gameId}
            gameCode={hostBoardGameCode(game)}
            gridSize={gridSize}
            hideSongTitles={!!game.hide_song_titles}
            open={hostBoardOpen}
            onClose={() => setHostBoardOpen(false)}
          />
        </>
      ) : null}

      <HostConfirmModal
        open={endGameConfirmOpen}
        title="End current game?"
        description="Players will see a Game Over screen. You can start a new game afterward with a fresh lobby."
        confirmLabel="End Current Game"
        confirmTone="danger"
        loading={lifecycleLoading}
        onConfirm={() => void handleEndGameConfirmed()}
        onCancel={() => setEndGameConfirmOpen(false)}
      />
      <HostConfirmModal
        open={newGameConfirmOpen}
        title="Start a new game?"
        description="This ends the current session (if still live), clears player cards for a fresh round, and opens a new lobby. Players will be asked to rejoin."
        confirmLabel="Start New Game"
        confirmTone="primary"
        loading={lifecycleLoading}
        onConfirm={() => void handleNewGameConfirmed()}
        onCancel={() => setNewGameConfirmOpen(false)}
      />
    </div>
  )
}
