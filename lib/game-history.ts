import type { SupabaseClient } from '@supabase/supabase-js'

export type GameHistoryRow = {
  id: string
  game_id: string | null
  game_code: string
  host_id: string | null
  total_players: number
  winner_names: string[]
  started_at: string | null
  ended_at: string
  duration_seconds: number | null
  created_at: string
}

/** Upsert archive row after a verified win (appends winner, refreshes player count). */
export async function recordGameHistoryWin(
  supabase: SupabaseClient,
  params: {
    gameId: string
    winnerName: string
  }
): Promise<{ error?: string }> {
  const { gameId, winnerName } = params
  const name = winnerName.trim() || 'Player'

  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('id, code, host_id, created_at, status')
    .eq('id', gameId)
    .maybeSingle()

  if (gameError || !game) {
    return { error: gameError?.message ?? 'Game not found' }
  }

  const { count } = await supabase
    .from('cards')
    .select('*', { count: 'exact', head: true })
    .eq('game_id', gameId)

  const totalPlayers = count ?? 0
  const startedAt = game.created_at ? new Date(game.created_at) : null
  const endedAt = new Date()
  const durationSeconds = startedAt
    ? Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000))
    : null

  const { data: existing } = await supabase
    .from('game_history')
    .select('id, winner_names')
    .eq('game_id', gameId)
    .maybeSingle()

  const winners = new Set<string>(
    Array.isArray(existing?.winner_names) ? existing.winner_names : []
  )
  winners.add(name)

  const payload = {
    game_id: gameId,
    game_code: String(game.code ?? ''),
    host_id: game.host_id ?? null,
    total_players: totalPlayers,
    winner_names: [...winners],
    started_at: game.created_at ?? null,
    ended_at: endedAt.toISOString(),
    duration_seconds: durationSeconds,
  }

  if (existing?.id) {
    const { error } = await supabase.from('game_history').update(payload).eq('id', existing.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase.from('game_history').insert(payload)
    if (error) return { error: error.message }
  }

  return {}
}

export async function fetchRecentGameHistory(
  supabase: SupabaseClient,
  opts?: { hostId?: string | null; limit?: number }
): Promise<{ rows: GameHistoryRow[]; error?: string }> {
  const limit = opts?.limit ?? 40
  let q = supabase
    .from('game_history')
    .select('*')
    .order('ended_at', { ascending: false })
    .limit(limit)

  if (opts?.hostId) {
    q = q.eq('host_id', opts.hostId)
  }

  const { data, error } = await q
  if (error) return { rows: [], error: error.message }
  return { rows: (data ?? []) as GameHistoryRow[] }
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || seconds < 0) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m >= 60) {
    const h = Math.floor(m / 60)
    const rm = m % 60
    return `${h}h ${rm}m`
  }
  return `${m}m ${s.toString().padStart(2, '0')}s`
}
