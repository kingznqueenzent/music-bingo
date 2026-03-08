'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { LyricGridLogo } from '@/components/LyricGridLogo'
import type { CardCell, PlaylistSong, LeaderboardEntry } from '@/lib/supabase/types'

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

type WinPattern = 'line' | 'x' | 'blackout'

function hasWinningPattern(
  markedSongIds: Set<string>,
  cells: { position: number; playlist_song_id: string }[],
  size: number,
  mode: WinPattern
): boolean {
  const positionToSong = new Map(cells.map((c) => [c.position, c.playlist_song_id]))
  const isMarked = (pos: number) => markedSongIds.has(positionToSong.get(pos)!)
  const isLineComplete = (positions: number[]) => positions.every((p) => isMarked(p))

  const cellCount = size * size
  const ROWS = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => r * size + c)
  )
  const COLS = Array.from({ length: size }, (_, c) =>
    Array.from({ length: size }, (_, r) => r * size + c)
  )
  const DIAGS: number[][] = [
    Array.from({ length: size }, (_, i) => i * size + i),
    Array.from({ length: size }, (_, i) => (i + 1) * size - 1 - i),
  ]

  if (mode === 'blackout') {
    return Array.from({ length: cellCount }, (_, i) => i).every((p) => isMarked(p))
  }
  if (mode === 'x') {
    return DIAGS.every((line) => isLineComplete(line))
  }
  for (const line of [...ROWS, ...COLS, ...DIAGS]) {
    if (isLineComplete(line)) return true
  }
  return false
}

interface CellWithSong extends CardCell {
  song?: PlaylistSong | null
}

export function PlayerCard({
  cardId,
  gameId,
  logoUrl = null,
}: {
  cardId: string
  gameId: string
  logoUrl?: string | null
}) {
  const supabase = useMemo(() => createClient(), [])
  const [cells, setCells] = useState<CellWithSong[]>([])
  const [playerName, setPlayerName] = useState('')
  const [gameMode, setGameMode] = useState<WinPattern>('line')
  const [gridSize, setGridSize] = useState(5)
  const [markedSongIds, setMarkedSongIds] = useState<Set<string>>(() => getStoredMarks(gameId, cardId))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showWinModal, setShowWinModal] = useState(false)
  const [claimName, setClaimName] = useState('')
  const [claimSubmitting, setClaimSubmitting] = useState(false)
  const [claimError, setClaimError] = useState('')
  const [bingoSubmitting, setBingoSubmitting] = useState(false)
  const [bingoMessage, setBingoMessage] = useState<'invalid' | null>(null)
  const [leaderboardDrawerOpen, setLeaderboardDrawerOpen] = useState(false)
  const [leaderboardList, setLeaderboardList] = useState<LeaderboardEntry[]>([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)

  const persistMarks = useCallback(
    (ids: Set<string>) => {
      setStoredMarks(gameId, cardId, ids)
    },
    [gameId, cardId]
  )

  const toggleMark = useCallback(
    (playlistSongId: string) => {
      setMarkedSongIds((prev) => {
        const next = new Set(prev)
        if (next.has(playlistSongId)) next.delete(playlistSongId)
        else next.add(playlistSongId)
        persistMarks(next)
        return next
      })
    },
    [persistMarks]
  )

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
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (data.ok) {
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
    async function load() {
      const { data: card } = await supabase.from('cards').select('player_name').eq('id', cardId).single()
      if (card) setPlayerName(card.player_name)

      const { data: game } = await supabase.from('games').select('mode, grid_size').eq('id', gameId).single()
      if (game) {
        setGameMode((game.mode as WinPattern) || 'line')
        setGridSize(game.grid_size === 4 ? 4 : 5)
      }

      const { data: rows } = await supabase.from('card_cells').select('*').eq('card_id', cardId).order('position')
      if (!rows?.length) {
        setError('Card not found.')
        setLoading(false)
        return
      }
      const songIds = [...new Set(rows.map((r) => r.playlist_song_id))]
      const { data: songs } = await supabase.from('playlist_songs').select('*').in('id', songIds)
      const songMap = new Map((songs ?? []).map((s) => [s.id, s]))
      setCells(
        rows.map((r) => ({
          ...r,
          song: songMap.get(r.playlist_song_id) ?? null,
        }))
      )
      setMarkedSongIds(getStoredMarks(gameId, cardId))
      setLoading(false)
    }
    load()
  }, [cardId, gameId, supabase])

  useEffect(() => {
    if (!leaderboardDrawerOpen) return
    setLeaderboardLoading(true)
    const promise = supabase
      .from('leaderboard')
      .select('id, player_name, identifier, wins, points, last_played, updated_at')
      .order('points', { ascending: false })
      .limit(10)
    promise.then(({ data }) => {
      setLeaderboardList((data ?? []) as LeaderboardEntry[])
    }).then(() => setLeaderboardLoading(false), () => setLeaderboardLoading(false))
  }, [leaderboardDrawerOpen, supabase])

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
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [gameId, cardId, supabase])

  const canClaimBingo = hasWinningPattern(markedSongIds, cells, gridSize, gameMode)

  async function handleBingoClick() {
    if (!canClaimBingo || bingoSubmitting) return
    setBingoMessage(null)
    setBingoSubmitting(true)
    try {
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
        setBingoMessage('invalid')
        setTimeout(() => setBingoMessage(null), 4000)
      }
    } catch {
      setBingoMessage('invalid')
      setTimeout(() => setBingoMessage(null), 4000)
    } finally {
      setBingoSubmitting(false)
    }
  }

  if (loading) {
    return <div className="text-xl">Loading your card…</div>
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
  const grid = Array(size)
    .fill(0)
    .map((_, row) =>
      cells.filter((c) => Math.floor(c.position / size) === row).sort((a, b) => a.position - b.position)
    )

  return (
    <div className="w-full max-w-lg mx-auto relative pb-28">
      <div className="flex items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-3">
          <LyricGridLogo size={48} className="shrink-0" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[#00FFFF] to-cyan-300 bg-clip-text text-transparent">
            Your Bingo Card
          </h1>
        </div>
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Game logo" className="h-10 w-10 rounded object-contain shrink-0" />
        )}
      </div>
      <p className="text-slate-400 mb-6">{playerName}</p>

      <div className="bg-[#1E1E1E] rounded-2xl p-4 border border-white/10">
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
        >
          {grid.map((row) =>
            row.map((cell) => {
              const isMarked = markedSongIds.has(cell.playlist_song_id)
              return (
                <button
                  key={cell.id}
                  type="button"
                  onClick={() => toggleMark(cell.playlist_song_id)}
                  className={`
                    aspect-square rounded-xl flex flex-col items-center justify-center p-1 text-center text-xs font-medium
                    border-2 transition-all duration-200 overflow-hidden cursor-pointer touch-manipulation
                    ${isMarked
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[inset_0_0_20px_rgba(16,185,129,0.15)]'
                      : 'bg-[#1E1E1E] border-white/20 text-slate-300 hover:border-slate-400'}
                  `}
                >
                  {cell.song?.album_art_url && (
                    <img
                      src={cell.song.album_art_url}
                      alt=""
                      className="w-6 h-6 rounded object-cover shrink-0 mb-0.5"
                    />
                  )}
                  <span className="line-clamp-3">{cell.song?.title || cell.song?.youtube_id || cell.song?.spotify_track_id || '—'}</span>
                </button>
              )
            })
          )}
        </div>
      </div>

      <p className="mt-4 text-white/70 text-sm text-center">
        Tap a square to mark it when the host plays that song. Get a winning pattern, then tap BINGO!
      </p>

      <div className="mt-6 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={handleBingoClick}
          disabled={!canClaimBingo || bingoSubmitting}
          className="w-full max-w-xs rounded-2xl py-4 px-8 text-xl font-black uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/40 hover:scale-[1.02] disabled:hover:scale-100"
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
            <h2 className="text-2xl font-bold text-emerald-400 mb-2">BINGO VERIFIED!</h2>
            <p className="text-slate-300 mb-4">Enter your name to join the Leaderboard.</p>
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
                onClick={handleClaimLeaderboard}
                disabled={claimSubmitting}
                className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 font-semibold py-3 text-white"
              >
                {claimSubmitting ? 'Submitting…' : 'Join Leaderboard'}
              </button>
              <button
                type="button"
                onClick={() => { setShowWinModal(false); setClaimError('') }}
                className="rounded-xl bg-slate-600 hover:bg-slate-500 font-semibold py-3 px-4 text-slate-200"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      <Link href="/" className="mt-8 block text-center text-xl text-slate-400 hover:text-white transition-colors">
        ← Back to Home
      </Link>

      <button
        type="button"
        onClick={() => setLeaderboardDrawerOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-900 shadow-lg shadow-amber-500/40 flex items-center justify-center text-2xl transition-transform hover:scale-105"
        aria-label="View leaderboard"
      >
        🏆
      </button>

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
                onClick={() => setLeaderboardDrawerOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:text-white hover:bg-slate-700"
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
                      <span className="text-amber-300 font-semibold shrink-0">{p.points} pts</span>
                      <span className="text-slate-400 text-sm shrink-0">{p.wins} win{p.wins !== 1 ? 's' : ''}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
