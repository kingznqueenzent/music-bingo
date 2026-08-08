import type { SupabaseClient } from '@supabase/supabase-js'
import type { GameStatus } from '@/lib/supabase/types'

export type HostGameListRow = {
  id: string
  code: string
  status: GameStatus
  title: string
  callCount: number
  createdAt: string
}

type GameQueryRow = {
  id: string
  code: string
  status: string | null
  created_at: string | null
  playlists: { name: string } | { name: string }[] | null
}

/** Recent host games with playlist title and played-song call counts. */
export async function fetchHostGamesList(
  supabase: SupabaseClient,
  opts?: { limit?: number; hostId?: string | null }
): Promise<{ rows: HostGameListRow[]; error?: string }> {
  const limit = opts?.limit ?? 20

  let q = supabase
    .from('games')
    .select('id, code, status, created_at, playlists(name)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (opts?.hostId) {
    q = q.eq('host_id', opts.hostId)
  }

  const { data, error } = await q

  if (error) {
    return { rows: [], error: error.message }
  }

  const games = (data ?? []) as GameQueryRow[]
  if (games.length === 0) {
    return { rows: [] }
  }

  const gameIds = games.map((g) => g.id)
  const { data: playedRows, error: playedError } = await supabase
    .from('played_songs')
    .select('game_id')
    .in('game_id', gameIds)

  if (playedError) {
    return { rows: [], error: playedError.message }
  }

  const callCounts = new Map<string, number>()
  for (const row of playedRows ?? []) {
    const id = row.game_id as string
    callCounts.set(id, (callCounts.get(id) ?? 0) + 1)
  }

  const rows: HostGameListRow[] = games.map((g) => {
    const playlist = Array.isArray(g.playlists) ? g.playlists[0] : g.playlists
    const status = (g.status ?? 'lobby') as GameStatus
    return {
      id: g.id,
      code: String(g.code ?? ''),
      status,
      title: playlist?.name?.trim() || `Room ${g.code}`,
      callCount: callCounts.get(g.id) ?? 0,
      createdAt: g.created_at ?? new Date().toISOString(),
    }
  })

  return { rows }
}
