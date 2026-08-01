import { allDecadeThemeNames } from '@/lib/decade-theme-catalog'

const DECADE_THEME_NAME_SET = new Set(allDecadeThemeNames())

export type ThemeRef = { id: string; name: string }

/** Theme IDs that belong to the decade × genre taxonomy (Media Manager grid). */
export function buildDecadeThemeIdSet(themes: ThemeRef[]): Set<string> {
  return new Set(themes.filter((t) => DECADE_THEME_NAME_SET.has(t.name)).map((t) => t.id))
}

export function isDecadeThemeName(name: string): boolean {
  return DECADE_THEME_NAME_SET.has(name.trim())
}

/** Song is categorized when assigned to a decade-genre theme row. */
export function isSongDecadeCategorized(
  song: { theme_id: string | null },
  decadeThemeIds: Set<string>
): boolean {
  return Boolean(song.theme_id && decadeThemeIds.has(song.theme_id))
}

/** Matches titles seeded as `{youtubeId} · {theme} ({id})`. */
export function titleHasYoutubeArtifact(title: string): boolean {
  return title.includes('·') || /^[A-Za-z0-9_-]{11}\s/.test(title.trim())
}

export { DECADE_THEME_NAME_SET }
