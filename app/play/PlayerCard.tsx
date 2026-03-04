'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { CardCell, PlaylistSong, PlayedSong } from '@/lib/supabase/types'

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

export function PlayerCard({
  cardId,
  gameId,
  logoUrl = null,
}: {
  cardId: string
  gameId: string
  logoUrl?: string | null
}) {
  const supabase = createClient()
  const [cells, setCells] = useState<CellWithSong[]>([])
  const [playerName, setPlayerName] = useState('')
  const [playedSongIds, setPlayedSongIds] = useState<Set<string>>(() => getStoredMarks(gameId, cardId))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const persistMarks = useCallback(
    (ids: Set<string>) => {
      setStoredMarks(gameId, cardId, ids)
    },
    [gameId, cardId]
  )

  useEffect(() => {
    async function load() {
      const { data: card } = await supabase.from('cards').select('player_name').eq('id', cardId).single()
      if (card) setPlayerName(card.player_name)
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
      const { data: played } = await supabase.from('played_songs').select('playlist_song_id').eq('game_id', gameId)
      const fromServer = new Set((played ?? []).map((p) => p.playlist_song_id))
      setPlayedSongIds(fromServer)
      persistMarks(fromServer)
      setLoading(false)
    }
    load()
  }, [cardId, gameId, persistMarks])

  useEffect(() => {
    const channel = supabase
      .channel(`play-${gameId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'played_songs', filter: `game_id=eq.${gameId}` },
        (payload) => {
          const newId = (payload.new as PlayedSong).playlist_song_id
          setPlayedSongIds((prev) => {
            const next = new Set([...prev, newId])
            persistMarks(next)
            return next
          })
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [gameId, persistMarks, supabase])

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

  const gridSize = Math.sqrt(cells.length) | 0
  const size = gridSize >= 4 ? gridSize : 5
  const grid = Array(size)
    .fill(0)
    .map((_, row) =>
      cells.filter((c) => Math.floor(c.position / size) === row).sort((a, b) => a.position - b.position)
    )

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="flex items-center justify-between gap-4 mb-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-sky-400 bg-clip-text text-transparent">
          🎵 Your Bingo Card
        </h1>
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Game logo" className="h-10 w-10 rounded object-contain shrink-0" />
        )}
      </div>
      <p className="text-slate-300 mb-6">{playerName}</p>

      <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20">
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
        >
          {grid.map((row) =>
            row.map((cell) => {
              const isMarked = playedSongIds.has(cell.playlist_song_id)
              return (
                <div
                  key={cell.id}
                  className={`
                    aspect-square rounded-xl flex items-center justify-center p-1 text-center text-xs font-medium
                    border-2 transition-all
                    ${isMarked ? 'bg-green-500/80 border-green-300 text-white' : 'bg-white/10 border-white/30 text-white'}
                  `}
                >
                  <span className="line-clamp-3">{cell.song?.title || cell.song?.youtube_id || '—'}</span>
                </div>
              )
            })
          )}
        </div>
      </div>

      <p className="mt-6 text-white/70 text-sm text-center">
        When you get {size} in a row (horizontal, vertical, or diagonal), type <strong>BINGO</strong> in chat!
      </p>

      <Link href="/" className="mt-8 block text-center text-xl text-slate-400 hover:text-white transition-colors">
        ← Back to Home
      </Link>
    </div>
  )
}
