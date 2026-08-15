import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeWinPattern } from '@/lib/bingo-win-pattern'
import { broadcastWinnerCrowned, type WinnerCrownedPayload } from '@/lib/supabase-realtime'
import { getLevelFromXp } from '@/lib/xp-levels'

export type CelebrationInput = {
  cardId: string
  playerName: string
  pattern?: string
}

/** Broadcast winner_crowned to stage, overlay, and any subscribed clients. */
export async function triggerWinnerCelebration(
  supabase: SupabaseClient,
  gameId: string,
  input: CelebrationInput
): Promise<WinnerCrownedPayload> {
  const { cardId, playerName, pattern: patternOverride } = input

  let pattern = patternOverride
  if (!pattern) {
    const { data: game } = await supabase.from('games').select('mode').eq('id', gameId).single()
    pattern = normalizeWinPattern(game?.mode)
  }

  let level: number | undefined
  let levelTitle: string | undefined
  const { data: lbRow } = await supabase
    .from('leaderboard')
    .select('points')
    .eq('player_name', playerName)
    .maybeSingle()
  if (lbRow?.points != null) {
    const lvl = getLevelFromXp(lbRow.points)
    level = lvl.level
    levelTitle = lvl.title
  }

  const payload: WinnerCrownedPayload = {
    playerName,
    cardId,
    pattern,
    level,
    levelTitle,
  }

  await broadcastWinnerCrowned(supabase, gameId, payload)
  return payload
}
