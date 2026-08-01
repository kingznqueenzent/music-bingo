import {
  autoCategorizeFromKeywords,
  type AutoCategoryResult,
} from '@/lib/songAutoCategorizer'
import { buildThemeLookup, resolveThemeId, type CsvTheme } from '@/lib/media/resolve-theme-from-csv'
import type { ParsedSong } from '@/lib/media/song-catalog-types'

/** Apply keyword categorization locally, then MusicBrainz via API for gaps. */
export async function enrichParsedSongsWithAutoCategory(
  rows: ParsedSong[],
  themes: CsvTheme[]
): Promise<{ rows: ParsedSong[]; autoTagged: number }> {
  const themeLookup = buildThemeLookup(themes)
  let autoTagged = 0

  const keywordEnriched = rows.map((row) => {
    const needsTheme = !row.theme_id && !row.theme_name_raw
    const needsMeta = !row.artist || !row.year
    if (!needsTheme && !needsMeta) return row

    const kw = autoCategorizeFromKeywords(row.title)
    const themeName = row.theme_name_raw || kw.theme_name || undefined
    const themeId = row.theme_id ?? (themeName ? resolveThemeId(themeName, themeLookup) : null)

    const changed =
      kw.theme_name != null ||
      kw.cleanTitle !== row.title ||
      (!row.artist && kw.artist) ||
      (!row.year && kw.year)

    if (changed) autoTagged += 1

    return {
      ...row,
      title: kw.cleanTitle || row.title,
      artist: row.artist || kw.artist,
      year: row.year ?? kw.year,
      theme_id: themeId,
      theme_name_raw: themeName,
      /** Preserve original for MusicBrainz when keywords matched but year missing */
      _rawTitle: row.title,
    } as ParsedSong & { _rawTitle?: string }
  })

  const needsApi = keywordEnriched
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => !row.theme_id || !row.artist || !row.year)

  if (needsApi.length === 0) {
    return { rows: keywordEnriched, autoTagged }
  }

  const res = await fetch('/api/songs/auto-categorize', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      titles: needsApi.map(({ row }) => (row as ParsedSong & { _rawTitle?: string })._rawTitle ?? row.title),
    }),
  })

  if (!res.ok) {
    return { rows: keywordEnriched, autoTagged }
  }

  const body = (await res.json()) as { results?: AutoCategoryResult[] }
  const apiResults = body.results ?? []

  const merged = [...keywordEnriched]
  needsApi.forEach(({ index }, i) => {
    const api = apiResults[i]
    if (!api) return

    const row = merged[index]
    const themeName = row.theme_name_raw || api.theme_name || undefined
    const themeId =
      row.theme_id ?? (themeName ? resolveThemeId(themeName, themeLookup) : null)

    merged[index] = {
      ...row,
      title: api.cleanTitle || row.title,
      artist: row.artist || api.artist,
      year: row.year ?? api.year,
      theme_id: themeId ?? row.theme_id,
      theme_name_raw: themeName ?? row.theme_name_raw,
    }
    autoTagged += 1
  })

  return { rows: merged, autoTagged }
}
