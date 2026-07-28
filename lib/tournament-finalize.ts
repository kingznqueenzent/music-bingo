import type { SupabaseClient } from '@supabase/supabase-js'

const BADGE_CHAMPION = 'tournament_champion'
const BADGE_FINALIST = 'tournament_finalist'

function mergeBadges(existing: string[] | null | undefined, add: string[]): string[] {
  return [...new Set([...(existing ?? []), ...add])]
}

async function mergeBadgesForIdentifier(
  supabase: SupabaseClient,
  playerIdentifier: string,
  ids: string[]
): Promise<void> {
  if (!ids.length || !playerIdentifier.trim()) return
  const { data: row } = await supabase
    .from('leaderboard')
    .select('id, badges')
    .eq('identifier', playerIdentifier.trim())
    .maybeSingle()

  if (!row) return
  await supabase
    .from('leaderboard')
    .update({
      badges: mergeBadges(row.badges as string[] | null, ids),
      updated_at: new Date().toISOString(),
    })
    .eq('id', row.id)
}

/**
 * Activate upcoming tournaments in window; complete ended tournaments; assign ranks, XP, badges.
 */
export async function finalizeDueTournaments(supabase: SupabaseClient): Promise<void> {
  const today = new Date().toISOString().slice(0, 10)

  await supabase
    .from('tournaments')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('status', 'upcoming')
    .lte('start_date', today)
    .gte('end_date', today)

  const { data: toComplete } = await supabase
    .from('tournaments')
    .select('id, winner_bonus_xp')
    .eq('status', 'active')
    .lt('end_date', today)

  const list = (toComplete ?? []) as { id: string; winner_bonus_xp: number }[]
  for (const t of list) {
    const { data: entries } = await supabase
      .from('tournament_entries')
      .select('id, player_identifier, player_name, points')
      .eq('tournament_id', t.id)
      .order('points', { ascending: false })

    const sorted = [...(entries ?? [])].sort((a, b) => (b.points ?? 0) - (a.points ?? 0))

    let currentRank = 1
    for (let i = 0; i < sorted.length; i++) {
      const row = sorted[i] as { id: string; points: number }
      if (i > 0) {
        const prev = sorted[i - 1] as { points: number }
        if (row.points < prev.points) {
          currentRank = i + 1
        }
      }
      await supabase
        .from('tournament_entries')
        .update({ rank: currentRank, updated_at: new Date().toISOString() })
        .eq('id', row.id)
    }

    const bonus = t.winner_bonus_xp ?? 200
    const winner = sorted[0] as { player_identifier?: string } | undefined

    if (winner?.player_identifier) {
      const wid = winner.player_identifier.trim()
      const { data: lb } = await supabase
        .from('leaderboard')
        .select('id, badges, points, total_xp')
        .eq('identifier', wid)
        .maybeSingle()

      if (lb) {
        const newXp = (lb.total_xp ?? lb.points ?? 0) + bonus
        await supabase
          .from('leaderboard')
          .update({
            points: newXp,
            total_xp: newXp,
            badges: mergeBadges(lb.badges as string[] | null, [BADGE_CHAMPION]),
            updated_at: new Date().toISOString(),
          })
          .eq('id', lb.id)
      } else {
        await mergeBadgesForIdentifier(supabase, wid, [BADGE_CHAMPION])
      }

      for (let i = 0; i < Math.min(3, sorted.length); i++) {
        const e = sorted[i] as { player_identifier?: string }
        if (e.player_identifier) {
          await mergeBadgesForIdentifier(supabase, e.player_identifier.trim(), [BADGE_FINALIST])
        }
      }
    }

    await supabase
      .from('tournaments')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', t.id)
  }
}
