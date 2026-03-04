'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { YouTubeClipPlayer } from '@/components/YouTubeClipPlayer'
import {
  startGame,
  playNextSong,
  updateGameSettings,
  getCardForVerification,
  getCardsForPdf,
  type CardCellVerification,
  type WinPattern,
} from '@/app/actions/game'
import { getMaxPlayersForTier } from '@/lib/tiers'
import { generateBingoCardsPdf } from '@/lib/pdf-export'
import { JoinGameQRCode } from '@/components/JoinGameQRCode'
import type { Game, PlaylistSong, PlayedSong } from '@/lib/supabase/types'

export function HostDashboard({ gameId }: { gameId: string }) {
  const searchParams = useSearchParams()
  const code = searchParams.get('code') ?? ''
  const supabase = createClient()
  const [game, setGame] = useState<Game | null>(null)
  const [songs, setSongs] = useState<PlaylistSong[]>([])
  const [played, setPlayed] = useState<PlayedSong[]>([])
  const [playerCount, setPlayerCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState('')
  const [currentSong, setCurrentSong] = useState<PlaylistSong | null>(null)
  const [verificationCardId, setVerificationCardId] = useState('')
  const [verificationResult, setVerificationResult] = useState<
    { card: { player_name: string; player_identifier: string | null }; cells: CardCellVerification[] } | null
  >(null)
  const [verificationError, setVerificationError] = useState('')
  const [pdfExporting, setPdfExporting] = useState(false)
  const [pdfPerPage, setPdfPerPage] = useState<2 | 4>(4)
  const [logoUrlInput, setLogoUrlInput] = useState('')
  const [logoSaving, setLogoSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: g } = await supabase.from('games').select('*').eq('id', gameId).single()
      if (g) {
        setGame(g)
        setLogoUrlInput((g as Game).logo_url ?? '')
      }
      if (g?.playlist_id) {
        const { data: s } = await supabase
          .from('playlist_songs')
          .select('*')
          .eq('playlist_id', g.playlist_id)
          .order('position')
        setSongs(s ?? [])
      }
      const { count } = await supabase.from('cards').select('*', { count: 'exact', head: true }).eq('game_id', gameId)
      setPlayerCount(count ?? 0)
      const { data: p } = await supabase.from('played_songs').select('*').eq('game_id', gameId).order('played_at')
      setPlayed(p ?? [])
      setLoading(false)
    }
    load()
  }, [gameId, supabase])

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
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
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
    const res = await playNextSong(gameId, song.id)
    if (res.error) setActionError(res.error)
    else setCurrentSong(song)
  }

  async function handleVerifyCard() {
    setVerificationError('')
    setVerificationResult(null)
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
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-md shadow-black/40 p-8">
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
            Winning pattern
          </h4>
          <div className="flex flex-wrap gap-2 mb-4">
            {(
              [
                ['line', 'Single Line'],
                ['x', 'X-Shape'],
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

      {currentSong && currentSong.source !== 'local' && currentSong.youtube_id && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <h3 className="text-xl font-bold mb-4 text-slate-50">
            Now playing ({clipSeconds}s hook{crossfadeSeconds ? `, ${crossfadeSeconds}s crossfade` : ''})
          </h3>
          <YouTubeClipPlayer
            videoId={currentSong.youtube_id}
            startSeconds={0}
            endSeconds={clipSeconds}
            crossfadeSeconds={crossfadeSeconds}
            autoPlay
            className="max-w-2xl mx-auto"
          />
        </div>
      )}

      {currentSong?.source === 'local' && currentSong?.file_url && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <h3 className="text-xl font-bold mb-4 text-slate-50">Now playing (Media Library)</h3>
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
        <h3 className="text-2xl font-bold mb-4 text-slate-50">Playlist</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold text-emerald-400 uppercase tracking-wide mb-2">
              Up next – click to play
            </h4>
            <ul className="space-y-1.5 max-h-72 overflow-y-auto">
              {upNext.map((song, idx) => {
                const label = song.title || song.youtube_id || song.file_url || 'Track'
                return (
                  <li key={song.id} className="flex items-center gap-2">
                    <span className="text-slate-500 w-6 text-sm">{idx + 1}</span>
                    <span className="flex-1 truncate text-slate-200 text-sm">{label}</span>
                    <button
                      type="button"
                      onClick={() => handleNextSong(song)}
                      className="rounded-full bg-emerald-500 hover:bg-emerald-400 font-semibold py-1.5 px-3 text-xs shrink-0"
                    >
                      Play
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
              Played
            </h4>
            <ul className="space-y-1.5 max-h-72 overflow-y-auto">
              {playedSongs.map((song) => {
                const label = song.title || song.youtube_id || song.file_url || 'Track'
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
          </div>
        )}
      </div>
    </div>
  )
}
