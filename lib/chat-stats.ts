import type { SupabaseClient } from '@supabase/supabase-js'
import { evaluateNewBadges } from '@/lib/badge-definitions'
import { getLevelFromXp } from '@/lib/xp-levels'

/** After a chat message is stored: update leaderboard stats and return new badge ids. */
export async function applyChatActivity(
  supabase: SupabaseClient,
  params: { playerIdentifier: string; playerName: string }
): Promise<{ newBadgeIds: string[] }> {
  const id = params.playerIdentifier.trim()
  if (!id) return { newBadgeIds: [] }

  const today = new Date().toISOString().slice(0, 10)

  const { data: row } = await supabase
    .from('leaderboard')
    .select(
      'id, player_name, wins, points, total_xp, games_played, streak_current, streak_best, last_played_week, badges, chat_messages_sent, chat_distinct_days, last_chat_date'
    )
    .eq('identifier', id)
    .maybeSingle()

  const prevSent = row?.chat_messages_sent ?? 0
  const newSent = prevSent + 1

  let newDistinct = row?.chat_distinct_days ?? 0
  const last = row?.last_chat_date
  if (last !== today) {
    newDistinct += 1
  }

  const xp = row ? row.total_xp ?? row.points ?? 0 : 0
  const level = getLevelFromXp(xp).level

  const newBadges = evaluateNewBadges({
    gamesPlayed: row?.games_played ?? 0,
    wins: row?.wins ?? 0,
    streakCurrent: row?.streak_current ?? 0,
    level,
    existingBadgeIds: row?.badges ?? [],
    chatMessagesSent: newSent,
    chatDistinctDays: newDistinct,
  })

  const mergedBadges = [...new Set([...(row?.badges ?? []), ...newBadges])]

  const payload = {
    player_name: params.playerName.trim() || row?.player_name || 'Player',
    chat_messages_sent: newSent,
    chat_distinct_days: newDistinct,
    last_chat_date: today,
    badges: mergedBadges,
    updated_at: new Date().toISOString(),
  }

  if (row) {
    await supabase.from('leaderboard').update(payload).eq('id', row.id)
  } else {
    await supabase.from('leaderboard').insert({
      identifier: id,
      player_name: params.playerName.trim() || 'Player',
      wins: 0,
      points: 0,
      total_xp: 0,
      games_played: 0,
      streak_current: 0,
      streak_best: 0,
      badges: mergedBadges,
      chat_messages_sent: newSent,
      chat_distinct_days: newDistinct,
      last_chat_date: today,
      last_played: null,
      updated_at: new Date().toISOString(),
    })
  }

  return { newBadgeIds: newBadges }
}
