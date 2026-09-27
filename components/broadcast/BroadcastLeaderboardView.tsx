'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { resolveActiveBroadcastGame, type BroadcastGame } from '@/lib/broadcast/resolve-active-game'
import {
  BROADCAST_LEADERBOARD_LIMIT,
  fetchStageLeaderboard,
  resolveLeaderboardOrderByPoints,
  type BroadcastLeaderboardRow,
} from '@/lib/broadcast/fetch-stage-leaderboard'
import { debounce } from '@/lib/debounce'

const RESOLVE_INTERVAL_MS = 20_000

function publicPlayerName(name: string | null | undefined): string {
  const trimmed = (name ?? '').trim()
  return trimmed || 'Player'
}

export function BroadcastLeaderboardView({ slug }: { slug: string }) {
  const supabase = useMemo(() => createClient(), [])
  const [game, setGame] = useState<BroadcastGame | null>(null)
  const [rows, setRows] = useState<BroadcastLeaderboardRow[]>([])
  const [boardReady, setBoardReady] = useState(false)
  const [orderByPoints, setOrderByPoints] = useState(true)

  const resolveGame = useCallback(async () => {
    const next = await resolveActiveBroadcastGame(supabase, slug)
    setGame((prev) => {
      if (!next) return null
      if (prev?.id === next.id && prev.status === next.status) {
        return { ...prev, ...next }
      }
      return next
    })
  }, [slug, supabase])

  const loadBoard = useCallback(async () => {
    const data = await fetchStageLeaderboard(supabase, {
      limit: BROADCAST_LEADERBOARD_LIMIT,
      orderByPoints,
    })
    setRows(data)
    setBoardReady(true)
  }, [supabase, orderByPoints])

  const debouncedLoadBoard = useMemo(() => debounce(() => void loadBoard(), 1500), [loadBoard])

  useEffect(() => {
    let cancelled = false
    void resolveLeaderboardOrderByPoints(supabase).then((next) => {
      if (!cancelled) setOrderByPoints(next)
    })
    return () => {
      cancelled = true
    }
  }, [supabase])

  useEffect(() => {
    void resolveGame()
    const timer = window.setInterval(() => {
      void resolveGame()
    }, RESOLVE_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [resolveGame])

  useEffect(() => {
    const channel = supabase
      .channel('broadcast-lb-games')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, () => {
        void resolveGame()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, resolveGame])

  useEffect(() => {
    if (!game) {
      setRows([])
      setBoardReady(false)
      return
    }
    void loadBoard()
    const channel = supabase
      .channel('broadcast-lb-scores')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leaderboard' }, () => {
        debouncedLoadBoard()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [game, supabase, loadBoard, debouncedLoadBoard])

  if (!game) {
    return (
      <main className="broadcast-scene broadcast-lb-scene broadcast-lb-standby" aria-live="polite">
        <p className="broadcast-lb-kicker">LyricGrid</p>
        <h1 className="broadcast-lb-identity">KINGZ &amp; QUEENZ MUSIC BINGO</h1>
        <p className="broadcast-lb-soon">LEADERBOARD AVAILABLE DURING GAME</p>
      </main>
    )
  }

  const identity = game.venue_display_name?.trim() || 'KINGZ & QUEENZ MUSIC BINGO'
  const empty = boardReady && rows.length === 0

  return (
    <main className="broadcast-scene broadcast-lb-scene broadcast-lb-live" aria-live="polite">
      <header className="broadcast-lb-header">
        <p className="broadcast-lb-kicker">Kingz &amp; Queenz</p>
        <h1 className="broadcast-lb-identity">{identity}</h1>
        <p className="broadcast-lb-title">Leaderboard</p>
      </header>

      {empty ? (
        <p className="broadcast-lb-empty">No players on the board yet</p>
      ) : (
        <ol className="broadcast-lb-list">
          {rows.map((row, index) => (
            <li key={row.id} className="broadcast-lb-row">
              <span className="broadcast-lb-rank">#{index + 1}</span>
              <span className="broadcast-lb-name">{publicPlayerName(row.player_name)}</span>
              <span className="broadcast-lb-score">{row.points.toLocaleString()}</span>
            </li>
          ))}
        </ol>
      )}
    </main>
  )
}
