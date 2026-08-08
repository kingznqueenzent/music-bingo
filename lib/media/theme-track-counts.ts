import type { SupabaseClient } from '@supabase/supabase-js'

export type ThemeWithTrackCount = {
  id: string
  name: string
  display_order?: number | null
  /** Catalog songs (`public.songs`) with this theme. */
  catalogCount: number
  /** YouTube / legacy rows in `public.theme_songs`. */
  themeSongsCount: number
  /** Combined available tracks for host display. */
  trackCount: number
}

async function countByThemeId(
  supabase: SupabaseClient,
  table: 'songs' | 'theme_songs'
): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  const pageSize = 1000
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('theme_id')
      .not('theme_id', 'is', null)
      .range(from, from + pageSize - 1)

    if (error) throw new Error(error.message)
    if (!data?.length) break

    for (const row of data) {
      const id = (row as { theme_id?: string | null }).theme_id
      if (!id) continue
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }

    if (data.length < pageSize) break
    from += pageSize
  }

  return counts
}

/** Load themes with catalog + theme_songs track totals. */
export async function fetchThemesWithTrackCounts(
  supabase: SupabaseClient
): Promise<{ themes: ThemeWithTrackCount[]; error?: string }> {
  try {
    const [{ data: themeRows, error: themeError }, catalogCounts, themeSongCounts] =
      await Promise.all([
        supabase
          .from('themes')
          .select('id, name, display_order')
          .order('display_order', { ascending: true })
          .order('name', { ascending: true }),
        countByThemeId(supabase, 'songs'),
        countByThemeId(supabase, 'theme_songs'),
      ])

    if (themeError) return { themes: [], error: themeError.message }

    const themes: ThemeWithTrackCount[] = (themeRows ?? []).map((t) => {
      const catalogCount = catalogCounts.get(t.id) ?? 0
      const themeSongsCount = themeSongCounts.get(t.id) ?? 0
      return {
        id: t.id,
        name: t.name,
        display_order: (t as { display_order?: number | null }).display_order ?? null,
        catalogCount,
        themeSongsCount,
        trackCount: catalogCount + themeSongsCount,
      }
    })

    return { themes }
  } catch (e) {
    return {
      themes: [],
      error: e instanceof Error ? e.message : 'Could not load theme track counts',
    }
  }
}

export function formatTrackCountLabel(count: number): string {
  return count === 1 ? '1 track' : `${count} tracks`
}
