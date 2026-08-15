'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LayoutGrid } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { BingoCard } from '@/components/bingo/BingoCard'
import { ResponsiveMenu } from '@/components/ui/menu/ResponsiveMenu'
import { debounce } from '@/lib/debounce'
import { broadcastBoardProgress } from '@/lib/supabase-realtime'
import { playlistSongDisplayParts, playlistSongLabel } from '@/lib/media-display'
import type { CardCell, GameStatus, PlaylistSong } from '@/lib/supabase/types'
import { roomCodeFromGame } from '@/types/database-extras'

const MARKS_STORAGE_PREFIX = 'bingo-marks'

function hostPlayerIdentifier(gameId: string): string {
  return `host-${gameId}`
}

function hostCardStorageKey(gameId: string): string {
  return `lyricgrid-host-card-${gameId}`
}

function getStoredMarks(gameId: string, cardId: string): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(`${MARKS_STORAGE_PREFIX}-${gameId}-${cardId}`)
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
    localStorage.setItem(`${MARKS_STORAGE_PREFIX}-${gameId}-${cardId}`, JSON.stringify([...ids]))
  } catch {
    // ignore
  }
}

type HostPlayerBoardPanelProps = {
  gameId: string
  gameCode: string
  gridSize: 4 | 5
  hideSongTitles: boolean
  open: boolean
  onClose: () => void
}

type CellWithSong = CardCell & { song?: PlaylistSong | null }

export function HostPlayerBoardPanel({
  gameId,
  gameCode,
  gridSize,
  hideSongTitles,
  open,
  onClose,
}: HostPlayerBoardPanelProps) {
  const supabase = useMemo(() => createClient(), [])
  const [cardId, setCardId] = useState<string | null>(null)
  const [cells, setCells] = useState<CellWithSong[]>([])
  const [markedSongIds, setMarkedSongIds] = useState<Set<string>>(new Set())
  const [playedSongIds, setPlayedSongIds] = useState<Set<string>>(new Set())
  const [activeSongId, setActiveSongId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const profileIdentifier = hostPlayerIdentifier(gameId)
  const latestMarksRef = useRef<Set<string>>(new Set())

  const flushBoardSync = useMemo(
    () =>
      debounce((ids: Set<string>, card: string) => {
        void (async () => {
          try {
            const res = await fetch('/api/game/update-board', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                gameId,
                cardId: card,
                markedPlaylistSongIds: [...ids],
                playerIdentifier: profileIdentifier,
              }),
            })
            const data = (await res.json()) as { ok?: boolean; markedCount?: number }
            if (res.ok && data.ok) {
              void broadcastBoardProgress(supabase, gameId, {
                cardId: card,
                markedCount: data.markedCount ?? ids.size,
                playerIdentifier: profileIdentifier,
              })
            }
          } catch {
            // local marks remain
          }
        })()
      }, 400),
    [supabase, gameId, profileIdentifier]
  )

  const handleMarkChange = useCallback(
    (playlistSongId: string, marked: boolean) => {
      if (!cardId) return
      setMarkedSongIds((prev) => {
        const next = new Set(prev)
        if (marked) next.add(playlistSongId)
        else next.delete(playlistSongId)
        setStoredMarks(gameId, cardId, next)
        latestMarksRef.current = next
        flushBoardSync(next, cardId)
        return next
      })
    },
    [cardId, flushBoardSync, gameId]
  )

  const loadCardGrid = useCallback(
    async (id: string) => {
      const { data: card, error: cardError } = await supabase
        .from('cards')
        .select('grid_data')
        .eq('id', id)
        .single()

      if (cardError || !card) {
        throw new Error(cardError?.message ?? 'Could not load your board.')
      }

      const gridJson = card.grid_data
      if (Array.isArray(gridJson) && gridJson.length > 0) {
        const sorted = [...gridJson].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        const songIds = [
          ...new Set(sorted.map((cell) => cell.playlist_song_id).filter(Boolean) as string[]),
        ]
        let songMap = new Map<string, PlaylistSong>()
        if (songIds.length > 0) {
          const { data: songs } = await supabase.from('playlist_songs').select('*').in('id', songIds)
          songMap = new Map((songs ?? []).map((s) => [s.id, s]))
        }
        setCells(
          sorted.map((cell) => {
            const playlistSongId = cell.playlist_song_id ?? cell.track_id
            const fetched = playlistSongId ? songMap.get(playlistSongId) : undefined
            return {
              id: `grid-${cell.position}`,
              card_id: id,
              playlist_song_id: playlistSongId,
              position: cell.position,
              created_at: '',
              song: fetched ?? {
                id: playlistSongId,
                playlist_id: '',
                youtube_id: null,
                file_url: null,
                title: cell.title ?? null,
                position: cell.position,
                created_at: '',
              },
            }
          })
        )
        return
      }

      const { data: rows, error: cellsError } = await supabase
        .from('card_cells')
        .select('*')
        .eq('card_id', id)
        .order('position', { ascending: true })

      if (cellsError || !rows?.length) {
        throw new Error(cellsError?.message ?? 'Your board has no squares yet.')
      }

      const songIds = [...new Set(rows.map((r) => r.playlist_song_id))]
      const { data: songs } = await supabase.from('playlist_songs').select('*').in('id', songIds)
      const songMap = new Map((songs ?? []).map((s) => [s.id, s]))
      setCells(rows.map((r) => ({ ...r, song: songMap.get(r.playlist_song_id) ?? null })))
    },
    [supabase]
  )

  const ensureHostCard = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const storedId = typeof window !== 'undefined' ? localStorage.getItem(hostCardStorageKey(gameId)) : null
      if (storedId) {
        const { data: existing } = await supabase.from('cards').select('id').eq('id', storedId).eq('game_id', gameId).maybeSingle()
        if (existing?.id) {
          setCardId(existing.id)
          setMarkedSongIds(getStoredMarks(gameId, existing.id))
          await loadCardGrid(existing.id)
          return
        }
      }

      const { data: byIdentifier } = await supabase
        .from('cards')
        .select('id')
        .eq('game_id', gameId)
        .eq('player_identifier', profileIdentifier)
        .maybeSingle()

      if (byIdentifier?.id) {
        localStorage.setItem(hostCardStorageKey(gameId), byIdentifier.id)
        setCardId(byIdentifier.id)
        setMarkedSongIds(getStoredMarks(gameId, byIdentifier.id))
        await loadCardGrid(byIdentifier.id)
        return
      }

      setCardId(null)
      setCells([])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load board.')
    } finally {
      setLoading(false)
    }
  }, [gameId, loadCardGrid, profileIdentifier, supabase])

  const createHostCard = useCallback(async () => {
    setCreating(true)
    setError('')
    try {
      const code = gameCode.trim().toUpperCase()
      if (!code) {
        setError('Game code unavailable — refresh the page.')
        return
      }
      const res = await fetch('/api/bingo/generate-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameCode: code,
          username: 'Host',
          playerIdentifier: profileIdentifier,
        }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string; cardId?: string }
      if (!res.ok || !data.ok || !data.cardId) {
        setError(data.error ?? 'Could not create your board.')
        return
      }
      localStorage.setItem(hostCardStorageKey(gameId), data.cardId)
      setCardId(data.cardId)
      setMarkedSongIds(getStoredMarks(gameId, data.cardId))
      await loadCardGrid(data.cardId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create board.')
    } finally {
      setCreating(false)
    }
  }, [gameCode, gameId, loadCardGrid, profileIdentifier])

  useEffect(() => {
    if (!open) return
    void ensureHostCard()
  }, [open, ensureHostCard])

  useEffect(() => {
    if (!open || !cardId) return

    const channel = supabase
      .channel(`host-player-board-${gameId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        (payload) => {
          const row = payload.new as { current_song_id?: string | null; hide_song_titles?: boolean | null }
          if ('current_song_id' in row) {
            setActiveSongId(row.current_song_id ?? null)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'played_songs', filter: `game_id=eq.${gameId}` },
        (payload) => {
          const id = (payload.new as { playlist_song_id?: string }).playlist_song_id
          if (!id) return
          setPlayedSongIds((prev) => {
            if (prev.has(id)) return prev
            const next = new Set(prev)
            next.add(id)
            return next
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'played_songs', filter: `game_id=eq.${gameId}` },
        (payload) => {
          const id = (payload.old as { playlist_song_id?: string }).playlist_song_id
          if (!id) {
            setPlayedSongIds(new Set())
            return
          }
          setPlayedSongIds((prev) => {
            if (!prev.has(id)) return prev
            const next = new Set(prev)
            next.delete(id)
            return next
          })
        }
      )
      .subscribe()

    void (async () => {
      const { data: game } = await supabase
        .from('games')
        .select('current_song_id')
        .eq('id', gameId)
        .single()
      setActiveSongId((game as { current_song_id?: string | null })?.current_song_id ?? null)

      const { data: playedRows } = await supabase
        .from('played_songs')
        .select('playlist_song_id')
        .eq('game_id', gameId)
      setPlayedSongIds(new Set((playedRows ?? []).map((r) => r.playlist_song_id)))
    })()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [open, cardId, gameId, supabase])

  const bingoCardCells = useMemo(
    () =>
      cells.map((c) => {
        const parts = c.song
          ? playlistSongDisplayParts(c.song)
          : { title: '—', artist: null as string | null, full: '—' }
        return {
          id: c.id,
          position: c.position,
          playlistSongId: c.playlist_song_id,
          label: parts.full || playlistSongLabel(c.song ?? {}) || '—',
          title: parts.title,
          artist: parts.artist,
          albumArtUrl: c.song?.album_art_url ?? null,
        }
      }),
    [cells]
  )

  const boardBody = loading ? (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
      <span className="inline-block h-8 w-8 rounded-full border-2 border-[#00FF66]/30 border-t-[#00FF66] animate-spin" />
      <p className="text-sm">Loading your board…</p>
    </div>
  ) : !cardId || cells.length === 0 ? (
    <div className="py-8 px-2 text-center space-y-4">
      <p className="text-slate-300 text-sm">
        Play along from this device — get a personal bingo card synced with the live room.
      </p>
      {error ? <p className="text-red-300 text-sm">{error}</p> : null}
      <button
        type="button"
        onClick={() => void createHostCard()}
        disabled={creating}
        className="w-full rounded-xl bg-[#00FF66] hover:bg-green-300 disabled:opacity-50 text-[#121212] font-bold py-3 px-6 touch-manipulation min-h-12"
      >
        {creating ? 'Creating board…' : 'Get my player board'}
      </button>
    </div>
  ) : (
    <div className="py-2 px-1">
      {error ? <p className="text-red-300 text-sm mb-3 text-center">{error}</p> : null}
      {hideSongTitles ? (
        <p className="mb-3 text-center text-[10px] uppercase tracking-widest text-[#00FF66]/80 font-semibold">
          Blind Mode — titles hidden
        </p>
      ) : null}
      <BingoCard
        size={gridSize}
        cells={bingoCardCells}
        markedSongIds={markedSongIds}
        playedSongIds={playedSongIds}
        activeSongId={activeSongId}
        hideSongTitles={hideSongTitles}
        onMarkChange={handleMarkChange}
        className="max-w-none"
      />
      <p className="mt-3 text-white/50 text-xs text-center">
        Tap when a song is called. Marks sync with the live game.
      </p>
    </div>
  )

  return (
    <ResponsiveMenu
      open={open}
      onClose={onClose}
      title="My Player Board"
      description={gameCode ? `Room ${gameCode}` : undefined}
      forceSheet
      sheetSide="bottom"
      titleIcon={<LayoutGrid className="h-5 w-5 text-[#00FF66]" aria-hidden />}
    >
      {boardBody}
    </ResponsiveMenu>
  )
}

/** Resolve room code from game row fields (client-safe helper). */
export function hostBoardGameCode(game: { code?: string | null; room_code?: string | null } | null): string {
  if (!game) return ''
  return roomCodeFromGame(game)
}
