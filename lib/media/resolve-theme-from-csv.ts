export type CsvTheme = {
  id: string
  name: string
}

/** Normalize theme label for fuzzy CSV matching. */
function normalizeThemeLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[''`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function themeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[''`]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/** Build lookup maps from public.themes for CSV theme_name resolution. */
export function buildThemeLookup(themes: CsvTheme[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const theme of themes) {
    const name = theme.name.trim()
    if (!name) continue
    map.set(normalizeThemeLabel(name), theme.id)
    map.set(themeSlug(name), theme.id)
    map.set(name.toLowerCase().trim(), theme.id)
  }
  return map
}

/** Resolve CSV theme_name / theme column to public.themes.id. */
export function resolveThemeId(rawTheme: string, lookup: Map<string, string>): string | null {
  const trimmed = rawTheme.trim()
  if (!trimmed) return null
  return (
    lookup.get(normalizeThemeLabel(trimmed)) ??
    lookup.get(themeSlug(trimmed)) ??
    lookup.get(trimmed.toLowerCase()) ??
    null
  )
}
