import type { Theme, Genre, Era } from '@/lib/supabase/types'

/**
 * Sort key for an era row: chronological order follows `eras.sort_order` then `start_year`.
 * Themes with no era sort last.
 */
function eraSortKey(era: Era | undefined | null): number {
  if (!era) return Number.MAX_SAFE_INTEGER
  return era.sort_order * 1_000_000 + era.start_year
}

/**
 * Global theme list order for LyricGrid:
 * 1. Era chronologically (60s → 70s → … → 2020s; no era last)
 * 2. Genre name A–Z within each era
 * 3. Theme name A–Z within each era+genre
 *
 * Pass the same `eras` and `genres` arrays you use elsewhere (from Supabase).
 */
export function sortThemesChronologicalThenGenre(
  themes: Theme[],
  eras: Era[],
  genres: Genre[]
): Theme[] {
  const eraById = new Map(eras.map((e) => [e.id, e]))
  const genreById = new Map(genres.map((g) => [g.id, g]))
  return [...themes].sort((a, b) => {
    const ea = a.era_id ? eraById.get(a.era_id) : undefined
    const eb = b.era_id ? eraById.get(b.era_id) : undefined
    const ka = eraSortKey(ea)
    const kb = eraSortKey(eb)
    if (ka !== kb) return ka - kb

    const na = (a.genre_id && genreById.get(a.genre_id)?.name) || ''
    const nb = (b.genre_id && genreById.get(b.genre_id)?.name) || ''
    const gcmp = na.localeCompare(nb, undefined, { sensitivity: 'base' })
    if (gcmp !== 0) return gcmp

    return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
  })
}
