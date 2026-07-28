import type { SupabaseClient } from '@supabase/supabase-js'

export type HostAnalyticsSnapshot = {
  totalGames: number
  avgPlayersPerGame: number
  popularThemes: { name: string; count: number }[]
  peakDayLabel: string
  peakHourLabel: string
  prizesClaimed: number
  topReturning: { player_name: string; identifier: string; games_played: number }[]
}

function dowLabel(d: number): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d] ?? '—'
}

export async function getHostAnalyticsSnapshot(supabase: SupabaseClient): Promise<HostAnalyticsSnapshot> {
  const { count: totalGames } = await supabase.from('games').select('*', { count: 'exact', head: true })

  const { data: cardRows } = await supabase.from('cards').select('game_id')
  const byGame = new Map<string, number>()
  for (const r of cardRows ?? []) {
    const gid = (r as { game_id: string }).game_id
    byGame.set(gid, (byGame.get(gid) ?? 0) + 1)
  }
  const counts = [...byGame.values()]
  const avgPlayersPerGame =
    counts.length === 0 ? 0 : Math.round((counts.reduce((a, b) => a + b, 0) / counts.length) * 10) / 10

  const { data: themedGames } = await supabase.from('games').select('theme_id').not('theme_id', 'is', null).limit(2000)
  const themeIds = [...new Set((themedGames ?? []).map((r) => (r as { theme_id: string }).theme_id).filter(Boolean))]
  const { data: themeRows } =
    themeIds.length > 0
      ? await supabase.from('themes').select('id, name').in('id', themeIds)
      : { data: [] as { id: string; name: string }[] }
  const themeNameById = new Map((themeRows ?? []).map((t) => [t.id, t.name ?? 'Theme']))

  const themeCounts = new Map<string, number>()
  for (const row of themedGames ?? []) {
    const tid = (row as { theme_id: string | null }).theme_id
    if (!tid) continue
    const name = themeNameById.get(tid) ?? 'Theme'
    themeCounts.set(name, (themeCounts.get(name) ?? 0) + 1)
  }
  const popularThemes = [...themeCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  const { data: cardTimes } = await supabase.from('cards').select('created_at').limit(8000)
  const byDow = new Map<number, number>()
  const byHour = new Map<number, number>()
  for (const r of cardTimes ?? []) {
    const raw = (r as { created_at?: string }).created_at
    if (!raw) continue
    const d = new Date(raw)
    const dow = d.getDay()
    const hr = d.getHours()
    byDow.set(dow, (byDow.get(dow) ?? 0) + 1)
    byHour.set(hr, (byHour.get(hr) ?? 0) + 1)
  }
  let peakDow = 0
  let peakDowN = -1
  for (const [k, v] of byDow) {
    if (v > peakDowN) {
      peakDowN = v
      peakDow = k
    }
  }
  let peakHr = 0
  let peakHrN = -1
  for (const [k, v] of byHour) {
    if (v > peakHrN) {
      peakHrN = v
      peakHr = k
    }
  }

  const { count: prizesClaimed } = await supabase.from('claimed_prizes').select('*', { count: 'exact', head: true })

  const { data: topReturning } = await supabase
    .from('leaderboard')
    .select('player_name, identifier, games_played')
    .order('games_played', { ascending: false })
    .limit(10)

  return {
    totalGames: totalGames ?? 0,
    avgPlayersPerGame,
    popularThemes,
    peakDayLabel: cardTimes?.length ? dowLabel(peakDow) : '—',
    peakHourLabel: cardTimes?.length ? `${peakHr}:00–${peakHr + 1}:00` : '—',
    prizesClaimed: prizesClaimed ?? 0,
    topReturning: (topReturning ?? []) as HostAnalyticsSnapshot['topReturning'],
  }
}
