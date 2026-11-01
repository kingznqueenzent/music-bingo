'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  fetchGameScoreboard,
  sortArcadeEntries,
  type ArcadeScoreboardEntry,
  type GamePlayerScoreRow,
} from '@/lib/game-scoring'

export function useGameScoreboard(gameId: string | null | undefined) {
  const supabase = useMemo(() => createClient(), [])
  const [entries, setEntries] = useState<ArcadeScoreboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    if (!gameId) {
      setEntries([])
      setLoading(false)
      return
    }
    const { entries: next, error: fetchError } = await fetchGameScoreboard(supabase, gameId)
    if (fetchError) setError(fetchError)
    else setError('')
    setEntries(next)
    setLoading(false)
  }, [supabase, gameId])

  useEffect(() => {
    setLoading(true)
    void reload()
  }, [reload])

  useEffect(() => {
    if (!gameId) return

    const channel = supabase
      .channel(`game-players-scoreboard-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_players',
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          setEntries((prev) => {
            const map = new Map(prev.map((e) => [e.card_id, e as GamePlayerScoreRow]))
            if (payload.eventType === 'DELETE') {
              const oldRow = payload.old as { card_id?: string }
              if (oldRow.card_id) map.delete(oldRow.card_id)
            } else {
              const row = payload.new as GamePlayerScoreRow
              if (row?.card_id) map.set(row.card_id, row)
            }
            return sortArcadeEntries([...map.values()])
          })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [supabase, gameId])

  return { entries, loading, error, reload }
}
