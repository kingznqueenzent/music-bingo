import { buildThemeLookup, resolveThemeId, type CsvTheme } from '@/lib/media/resolve-theme-from-csv'
import type { AutoCategoryResult } from '@/lib/songAutoCategorizer'

export type TrackFormAutoFill = {
  title: string
  artist: string
  year: number
  theme_id: string
  theme_name: string | null
}

/** Resolve auto-categorize API result into Media Manager form fields. */
export function mapAutoCategoryToFormFields(
  result: AutoCategoryResult,
  themes: CsvTheme[],
  current?: Partial<TrackFormAutoFill>
): TrackFormAutoFill {
  const lookup = buildThemeLookup(themes)
  const themeId = result.theme_name ? resolveThemeId(result.theme_name, lookup) ?? '' : ''

  return {
    title: result.cleanTitle || current?.title || '',
    artist: result.artist ?? current?.artist ?? '',
    year: result.year ?? current?.year ?? new Date().getFullYear(),
    theme_id: current?.theme_id?.trim() ? current.theme_id : themeId,
    theme_name: result.theme_name,
  }
}

const AUTO_CATEGORY_TIMEOUT_MS = 12_000

/** Client-side: call host API to auto-categorize a raw filename/title. */
export async function fetchAutoCategory(rawTitle: string): Promise<AutoCategoryResult | null> {
  try {
    const res = await fetch('/api/songs/auto-categorize', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: rawTitle }),
      signal: AbortSignal.timeout(AUTO_CATEGORY_TIMEOUT_MS),
    })

    if (!res.ok) return null

    const body = (await res.json()) as { results?: AutoCategoryResult[] }
    return body.results?.[0] ?? null
  } catch (e) {
    console.warn('[fetchAutoCategory] skipped:', e instanceof Error ? e.message : e)
    return null
  }
}
