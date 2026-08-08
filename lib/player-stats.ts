import type { SupabaseClient } from '@supabase/supabase-js'

export type PlayerStatsRow = {
  id: string
  username: string
  games_played: number
  wins: number
  score: number
  updated_at: string
}

export type PlayerStatsDelta = {
  gamesPlayed?: number
  wins?: number
  score?: number
}

const USERNAME_MAX = 80

export function normalizeStatsUsername(name: string): string {
  return name.trim().slice(0, USERNAME_MAX).toLowerCase()
}

/** Atomically increment games / wins / score for a player (case-insensitive username). */
export async function incrementPlayerStats(
  supabase: SupabaseClient,
  username: string,
  delta: PlayerStatsDelta
): Promise<{ error?: string }> {
  const key = normalizeStatsUsername(username)
  if (!key) return { error: 'Username is required' }

  const { error } = await supabase.rpc('increment_player_stats', {
    p_username: key,
    p_games: delta.gamesPlayed ?? 0,
    p_wins: delta.wins ?? 0,
    p_score: delta.score ?? 0,
  })

  if (error) return { error: error.message }
  return {}
}

export async function fetchTopPlayerStats(
  supabase: SupabaseClient,
  limit = 25
): Promise<{ rows: PlayerStatsRow[]; error?: string }> {
  const { data, error } = await supabase
    .from('player_stats')
    .select('id, username, games_played, wins, score, updated_at')
    .order('wins', { ascending: false })
    .order('score', { ascending: false })
    .limit(limit)

  if (error) return { rows: [], error: error.message }
  return { rows: (data ?? []) as PlayerStatsRow[] }
}

/** Display-friendly label from stored lowercase username. */
export function formatStatsUsername(username: string): string {
  const trimmed = username.trim()
  if (!trimmed) return 'Player'
  return trimmed.replace(/\b\w/g, (c) => c.toUpperCase())
}
