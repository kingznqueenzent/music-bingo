import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Public fields only — same `leaderboard` table StageView reads for
 * authoritative scores. Never select identifier, emails, or host tokens.
 */
export type BroadcastLeaderboardRow = {
  id: string
  player_name: string
  wins: number
  points: number
}

/**
 * Top-N display cap for 1920×1080 and 1080×1920 Meld canvases.
 *
 * Stage overlay fetches 25 and scrolls. This dedicated scene shows 10 so
 * ranks stay readable at stream distance without scrolling. Order matches
 * StageView.fetchLeaderboard: `points` desc when xp_and_badges is on,
 * otherwise `wins` desc. Hidden rows keep that same authoritative order.
 */
export const BROADCAST_LEADERBOARD_LIMIT = 10

const PUBLIC_COLUMNS = 'id, player_name, wins, points'

export async function resolveLeaderboardOrderByPoints(
  supabase: SupabaseClient
): Promise<boolean> {
  const { data } = await supabase
    .from('feature_flags')
    .select('enabled')
    .eq('key', 'xp_and_badges')
    .maybeSingle()
  return !!(data as { enabled?: boolean } | null)?.enabled
}

/** Same source + sort as StageView — not player_stats. */
export async function fetchStageLeaderboard(
  supabase: SupabaseClient,
  options?: { limit?: number; orderByPoints?: boolean }
): Promise<BroadcastLeaderboardRow[]> {
  const limit = options?.limit ?? BROADCAST_LEADERBOARD_LIMIT
  const orderByPoints = options?.orderByPoints ?? true
  let query = supabase.from('leaderboard').select(PUBLIC_COLUMNS).limit(limit)
  query = orderByPoints
    ? query.order('points', { ascending: false })
    : query.order('wins', { ascending: false })
  const { data } = await query
  return (data ?? []) as BroadcastLeaderboardRow[]
}
