import type { SupabaseClient } from '@supabase/supabase-js'

/** Points for a correct called-track dab. */
export const SCORE_CORRECT_TAP = 1
/** Points deducted for tapping an uncalled track (floored at 0). */
export const SCORE_WRONG_TAP = -1
/** Bonus when host verifies Bingo. */
export const SCORE_BINGO_BONUS = 10

export type GamePlayerScoreRow = {
  id: string
  game_id: string
  card_id: string
  player_name: string
  player_identifier: string | null
  score: number
  correct_taps: number
  wrong_taps: number
  streak_current: number
  streak_best: number
  bingo_bonus_awarded: boolean
  bingo_completed_at: string | null
  updated_at: string
  created_at: string
}

export type ArcadeScoreboardEntry = GamePlayerScoreRow & {
  accuracy: number
  rank: number
}

export function clampScore(score: number): number {
  return Math.max(0, Math.floor(score))
}

export function computeAccuracy(correctTaps: number, wrongTaps: number): number {
  const total = correctTaps + wrongTaps
  if (total <= 0) return 100
  return Math.round((correctTaps / total) * 1000) / 10
}

export function sortArcadeEntries(
  rows: GamePlayerScoreRow[]
): ArcadeScoreboardEntry[] {
  const sorted = [...rows].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    // Faster bingo completion ranks higher; players without bingo sort last on tie.
    if (a.bingo_completed_at && b.bingo_completed_at) {
      return a.bingo_completed_at.localeCompare(b.bingo_completed_at)
    }
    if (a.bingo_completed_at) return -1
    if (b.bingo_completed_at) return 1
    return a.player_name.localeCompare(b.player_name)
  })
  return sorted.map((row, index) => ({
    ...row,
    accuracy: computeAccuracy(row.correct_taps, row.wrong_taps),
    rank: index + 1,
  }))
}

type EnsureParams = {
  gameId: string
  cardId: string
  playerName?: string | null
  playerIdentifier?: string | null
}

async function ensureGamePlayer(
  supabase: SupabaseClient,
  params: EnsureParams
): Promise<{ row: GamePlayerScoreRow | null; error?: string }> {
  const { gameId, cardId } = params
  const name = (params.playerName ?? '').trim() || 'Player'
  const identifier = (params.playerIdentifier ?? '').trim() || null

  const { data: existing, error: readError } = await supabase
    .from('game_players')
    .select('*')
    .eq('game_id', gameId)
    .eq('card_id', cardId)
    .maybeSingle()

  if (readError) return { row: null, error: readError.message }
  if (existing) {
    const patch: Record<string, unknown> = {}
    if (name && name !== 'Player' && existing.player_name !== name) patch.player_name = name
    if (identifier && existing.player_identifier !== identifier) {
      patch.player_identifier = identifier
    }
    if (Object.keys(patch).length) {
      const { data: updated, error } = await supabase
        .from('game_players')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select('*')
        .single()
      if (error) return { row: existing as GamePlayerScoreRow, error: error.message }
      return { row: updated as GamePlayerScoreRow }
    }
    return { row: existing as GamePlayerScoreRow }
  }

  const { data: inserted, error: insertError } = await supabase
    .from('game_players')
    .insert({
      game_id: gameId,
      card_id: cardId,
      player_name: name,
      player_identifier: identifier,
      score: 0,
      correct_taps: 0,
      wrong_taps: 0,
      streak_current: 0,
      streak_best: 0,
    })
    .select('*')
    .single()

  if (insertError) {
    // Race: another request inserted first
    const { data: raced } = await supabase
      .from('game_players')
      .select('*')
      .eq('game_id', gameId)
      .eq('card_id', cardId)
      .maybeSingle()
    if (raced) return { row: raced as GamePlayerScoreRow }
    return { row: null, error: insertError.message }
  }

  return { row: inserted as GamePlayerScoreRow }
}

export async function recordCorrectTap(
  supabase: SupabaseClient,
  params: EnsureParams
): Promise<{ row: GamePlayerScoreRow | null; error?: string }> {
  const ensured = await ensureGamePlayer(supabase, params)
  if (!ensured.row) return ensured

  const nextScore = clampScore(ensured.row.score + SCORE_CORRECT_TAP)
  const nextStreak = ensured.row.streak_current + 1
  const nextBest = Math.max(ensured.row.streak_best, nextStreak)

  const { data, error } = await supabase
    .from('game_players')
    .update({
      score: nextScore,
      correct_taps: ensured.row.correct_taps + 1,
      streak_current: nextStreak,
      streak_best: nextBest,
      updated_at: new Date().toISOString(),
      player_name: (params.playerName ?? '').trim() || ensured.row.player_name,
    })
    .eq('id', ensured.row.id)
    .select('*')
    .single()

  if (error) return { row: null, error: error.message }
  return { row: data as GamePlayerScoreRow }
}

export async function recordWrongTap(
  supabase: SupabaseClient,
  params: EnsureParams
): Promise<{ row: GamePlayerScoreRow | null; error?: string }> {
  const ensured = await ensureGamePlayer(supabase, params)
  if (!ensured.row) return ensured

  const nextScore = clampScore(ensured.row.score + SCORE_WRONG_TAP)

  const { data, error } = await supabase
    .from('game_players')
    .update({
      score: nextScore,
      wrong_taps: ensured.row.wrong_taps + 1,
      streak_current: 0,
      updated_at: new Date().toISOString(),
      player_name: (params.playerName ?? '').trim() || ensured.row.player_name,
    })
    .eq('id', ensured.row.id)
    .select('*')
    .single()

  if (error) return { row: null, error: error.message }
  return { row: data as GamePlayerScoreRow }
}

export async function awardBingoBonus(
  supabase: SupabaseClient,
  params: EnsureParams
): Promise<{ row: GamePlayerScoreRow | null; awarded: boolean; error?: string }> {
  const ensured = await ensureGamePlayer(supabase, params)
  if (!ensured.row) return { ...ensured, awarded: false }
  if (ensured.row.bingo_bonus_awarded) {
    return { row: ensured.row, awarded: false }
  }

  const now = new Date().toISOString()
  const nextScore = clampScore(ensured.row.score + SCORE_BINGO_BONUS)

  const { data, error } = await supabase
    .from('game_players')
    .update({
      score: nextScore,
      bingo_bonus_awarded: true,
      bingo_completed_at: now,
      updated_at: now,
      player_name: (params.playerName ?? '').trim() || ensured.row.player_name,
    })
    .eq('id', ensured.row.id)
    .eq('bingo_bonus_awarded', false)
    .select('*')
    .single()

  if (error) {
    // Already awarded by concurrent request
    const { data: current } = await supabase
      .from('game_players')
      .select('*')
      .eq('id', ensured.row.id)
      .maybeSingle()
    return { row: (current as GamePlayerScoreRow) ?? ensured.row, awarded: false, error: error.message }
  }

  return { row: data as GamePlayerScoreRow, awarded: true }
}

export async function fetchGameScoreboard(
  supabase: SupabaseClient,
  gameId: string
): Promise<{ entries: ArcadeScoreboardEntry[]; error?: string }> {
  const { data, error } = await supabase
    .from('game_players')
    .select('*')
    .eq('game_id', gameId)

  if (error) return { entries: [], error: error.message }
  return { entries: sortArcadeEntries((data ?? []) as GamePlayerScoreRow[]) }
}
