'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { YouTubeClipPlayer } from '@/components/YouTubeClipPlayer'
import {
  startGame,
  updateGameSettings,
  getCardForVerification,
  getCardsForPdf,
  type CardCellVerification,
  type WinPattern,
} from '@/app/actions/game'
import { getMaxPlayersForTier } from '@/lib/tiers'
import { generateBingoCardsPdf } from '@/lib/pdf-export'
import { JoinGameQRCode } from '@/components/JoinGameQRCode'
import { LyricGridLogo } from '@/components/LyricGridLogo'
import { SourceIndicator } from '@/components/SourceIndicator'
import { playlistSongLabel } from '@/lib/media-display'
import type { Game, PlaylistSong, PlayedSong } from '@/lib/supabase/types'

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
  const [logoSaving, setLogoSaving] = useState(false)
  const [verifyBingoLoading, setVerifyBingoLoading] = useState(false)
  const [verifyBingoSuccess, setVerifyBingoSuccess] = useState('')
  const [winnerAlert, setWinnerAlert] = useState<{ playerName: string; cardId: string } | null>(null)
  const [resetPlayedLoading, setResetPlayedLoading] = useState(false)
  const nowPlayingRef = useRef<HTMLDivElement>(null)
  const previousCurrentSongRef = useRef<PlaylistSong | null>(null)
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
      setLogoUrlInput((g as Game).logo_url ?? '')
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

  useEffect(() => {
    const channel = supabase
      .channel(`game-${gameId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        (payload) => setGame(payload.new as Game)
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'played_songs', filter: `game_id=eq.${gameId}` },
        () => {
          supabase.from('played_songs').select('*').eq('game_id', gameId).order('played_at').then(({ data }) => setPlayed(data ?? []))
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'cards', filter: `game_id=eq.${gameId}` },
        () => {
          supabase.from('cards').select('*', { count: 'exact', head: true }).eq('game_id', gameId).then(({ count }) => setPlayerCount(count ?? 0))
        }
      )
      .on(
        'broadcast',
        { event: 'bingo_winner' },
        (payload: { payload?: { playerName?: string; cardId?: string } }) => {
          const p = payload?.payload
          if (p?.playerName != null || p?.cardId != null) {
            setWinnerAlert({ playerName: p?.playerName ?? 'Player', cardId: p?.cardId ?? '' })
          }
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [gameId, supabase])

  useEffect(() => {
    const ch = supabase.channel(`play-${gameId}`)
    ch.subscribe(() => {})
    playChannelRef.current = ch as unknown as { send: (msg: { type: 'broadcast'; event: string; payload: object }) => void }
    return () => {
      supabase.removeChannel(ch)
      playChannelRef.current = null
    }
  }, [gameId, supabase])

  useEffect(() => {
    if (!game?.current_song_id) {
      setCurrentSong(null)
      return
    }
    const song = songs.find((s) => s.id === game.current_song_id) ?? null
    setCurrentSong(song)
  }, [game?.current_song_id, songs])

  async function handleStart() {
    setActionError('')
    const res = await startGame(gameId)
    if (res.error) setActionError(res.error)
  }

  async function handleNextSong(song: PlaylistSong) {
    setActionError('')
    previousCurrentSongRef.current = currentSong
    setCurrentSong(song)
    setTimeout(() => nowPlayingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    setPlayingSongId(song.id)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)
    try {
      const res = await fetch('/api/play-next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, playlistSongId: song.id }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      let data: { ok?: boolean; error?: string }
      try {
        data = (await res.json()) as { ok?: boolean; error?: string }
      } catch {
        setCurrentSong(previousCurrentSongRef.current)
        setActionError(res.ok ? 'Invalid response.' : `Error ${res.status}. Try again.`)
        return
      }
      if (res.ok && data.ok) {
        // Keep currentSong (already set optimistically)
      } else {
        setCurrentSong(previousCurrentSongRef.current)
        setActionError(data.error ?? `Error ${res.status}. Could not play song.`)
      }
    } catch (e) {
      clearTimeout(timeoutId)
      setCurrentSong(previousCurrentSongRef.current)
      if ((e as Error).name === 'AbortError') {
        setActionError('Request timed out. Try again.')
      } else {
        setActionError(e instanceof Error ? e.message : 'Something went wrong.')
      }
    } finally {
      setPlayingSongId(null)
    }
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
    const res = await updateGameSettings(gameId, { clipSeconds: seconds })
    if (res.error) setActionError(res.error)
  }

  async function handleCrossfadeChange(seconds: number) {
    setActionError('')
    const res = await updateGameSettings(gameId, { crossfadeSeconds: seconds })
    if (res.error) setActionError(res.error)
  }

  async function handleWinPatternChange(pattern: WinPattern) {
    setActionError('')
    const res = await updateGameSettings(gameId, { winPattern: pattern })
    if (res.error) setActionError(res.error)
  }

  async function handleSaveLogo() {
    setLogoSaving(true)
    setActionError('')
    const res = await updateGameSettings(gameId, { logoUrl: logoUrlInput.trim() || null })
    setLogoSaving(false)
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

  return (
    <div className="w-full max-w-4xl space-y-8">
      {winnerAlert && (
        <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-500/20 p-4 flex items-center justify-between gap-4">
          <p className="text-xl font-bold text-emerald-300">
            🏆 WINNER: {winnerAlert.playerName}
            {winnerAlert.cardId && <span className="text-slate-400 font-normal text-sm ml-2">(Card: {winnerAlert.cardId.slice(0, 8)}…)</span>}
          </p>
          <button
            type="button"
            onClick={() => setWinnerAlert(null)}
            className="rounded-lg bg-slate-700 hover:bg-slate-600 px-3 py-1.5 text-sm text-slate-200"
          >
            Dismiss
          </button>
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
            className="rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-xl font-semibold py-4 px-8 shadow-xl shadow-emerald-500/40 transition-transform hover:scale-[1.02] disabled:hover:scale-100"
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
          📊 {playerCount} players joined
          {game.tier && (
            <span className="ml-2 text-slate-500 text-sm">
              (max {getMaxPlayersForTier(game.tier)} for {game.tier})
            </span>
          )}
        </p>

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

        {game.tier === 'enterprise' && (
          <div className="mt-6 pt-6 border-t border-slate-700">
            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Custom branding (Enterprise)
            </h4>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="url"
                value={logoUrlInput}
                onChange={(e) => setLogoUrlInput(e.target.value)}
                placeholder="Logo image URL"
                className="flex-1 min-w-[200px] rounded-xl bg-slate-800 border border-slate-600 px-3 py-2 text-slate-200 placeholder-slate-500 text-sm"
              />
              <button
                type="button"
                onClick={handleSaveLogo}
                disabled={logoSaving}
                className="rounded-full bg-slate-600 hover:bg-slate-500 px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {logoSaving ? 'Saving…' : 'Save logo'}
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-slate-700">
          <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Winning pattern (players must mark this to claim BINGO)
          </h4>
          <div className="flex flex-wrap gap-2 mb-4">
            {(
              [
                ['line', 'Single Line (horizontal, vertical, or diagonal)'],
                ['x', 'X-Shape (both diagonals)'],
                ['blackout', 'Full House (Blackout)'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => handleWinPatternChange(value)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
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
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-slate-300">Clip length:</span>
            {[20, 30, 45].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => handleClipChange(sec)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
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
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
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

      {currentSong && currentSong.source === 'local' ? null : currentSong?.youtube_id ? (
        <div ref={nowPlayingRef} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="flex items-center gap-3 mb-4">
            <SourceIndicator source="youtube" />
            <h3 className="text-xl font-bold text-slate-50">
              Now playing ({clipSeconds}s hook{crossfadeSeconds ? `, ${crossfadeSeconds}s crossfade` : ''})
            </h3>
          </div>
          <YouTubeClipPlayer
            key={currentSong.id}
            videoId={currentSong.youtube_id}
            startSeconds={0}
            endSeconds={clipSeconds}
            crossfadeSeconds={crossfadeSeconds}
            autoPlay
            className="max-w-2xl mx-auto"
          />
        </div>
      ) : null}
      {currentSong && !currentSong.youtube_id && !currentSong?.file_url ? (
        <div ref={nowPlayingRef} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <h3 className="text-xl font-bold text-slate-50">Now playing</h3>
          <p className="text-slate-300 mt-2">{playlistSongLabel(currentSong)}</p>
        </div>
      ) : null}

      {currentSong?.source === 'local' && currentSong?.file_url && (
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
      )}

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
            <ul className="space-y-1.5 max-h-72 overflow-y-auto">
              {upNext.map((song, idx) => {
                const label = playlistSongLabel(song)
                const isPlaying = playingSongId === song.id
                return (
                  <li
                    key={song.id}
                    className="flex items-center gap-2 py-1.5 px-2 -mx-2 rounded-lg hover:bg-slate-800/80 transition-colors group"
                  >
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleNextSong(song) }}
                      className="rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 font-semibold py-1.5 px-3 text-xs shrink-0 min-w-[4rem] cursor-pointer transition-transform"
                    >
                      {isPlaying ? 'Playing…' : 'Play'}
                    </button>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={() => handleNextSong(song)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleNextSong(song) } }}
                      className="flex-1 flex items-center gap-2 min-w-0 cursor-pointer select-none"
                    >
                      <span className="text-slate-500 w-6 text-sm shrink-0">{idx + 1}</span>
                      <span className="truncate text-slate-200 text-sm">{label}</span>
                    </span>
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
            <ul className="space-y-1.5 max-h-72 overflow-y-auto">
              {playedSongs.map((song) => {
                const label = playlistSongLabel(song)
                return (
                  <li key={song.id} className="flex items-center gap-2 opacity-70">
                    <span className="text-slate-500 text-sm line-through flex-1 truncate">{label}</span>
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
              className="inline-grid gap-1 p-2 rounded-xl bg-slate-800/50"
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
                    className={`rounded-lg px-2 py-1.5 text-xs font-medium min-h-[2.5rem] flex items-center justify-center text-center ${
                      cell.played
                        ? 'bg-emerald-600/80 text-white'
                        : 'bg-slate-700/80 text-slate-400'
                    }`}
                    title={cell.title ?? undefined}
                  >
                    {cell.title ? (cell.title.length > 12 ? cell.title.slice(0, 11) + '…' : cell.title) : '—'}
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
