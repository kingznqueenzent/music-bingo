/**
 * Shared genre detection for Media Library uploads + filtering.
 * Canonical library genres: Reggae, Dancehall, Afrobeats, Hip-Hop, R&B, Other.
 */

export const LIBRARY_GENRES = [
  'Reggae',
  'Dancehall',
  'Afrobeats',
  'Hip-Hop',
  'R&B',
] as const

export type LibraryGenre = (typeof LIBRARY_GENRES)[number]

/** Stored / display genre including uncategorized bucket. */
export type DetectedGenre = LibraryGenre | 'Other'

export type LibraryGenreFilterId = 'all' | LibraryGenre | 'other'

export const LIBRARY_GENRE_FILTERS: { id: LibraryGenreFilterId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'Reggae', label: 'Reggae' },
  { id: 'Dancehall', label: 'Dancehall' },
  { id: 'Afrobeats', label: 'Afrobeats' },
  { id: 'Hip-Hop', label: 'Hip-Hop' },
  { id: 'R&B', label: 'R&B' },
  { id: 'other', label: 'Other / Uncategorized' },
]

/** Longer / more specific keywords first so "dancehall" wins over "hall". */
const KEYWORD_GENRE_RULES: { keyword: string; genre: LibraryGenre }[] = [
  { keyword: 'dancehall', genre: 'Dancehall' },
  { keyword: 'afrobeats', genre: 'Afrobeats' },
  { keyword: 'afrobeat', genre: 'Afrobeats' },
  { keyword: 'afro beats', genre: 'Afrobeats' },
  { keyword: 'hip-hop', genre: 'Hip-Hop' },
  { keyword: 'hip hop', genre: 'Hip-Hop' },
  { keyword: 'hiphop', genre: 'Hip-Hop' },
  { keyword: 'r&b', genre: 'R&B' },
  { keyword: 'r and b', genre: 'R&B' },
  { keyword: 'rnb', genre: 'R&B' },
  { keyword: 'rhythm and blues', genre: 'R&B' },
  { keyword: 'reggae', genre: 'Reggae' },
  { keyword: 'soca', genre: 'Dancehall' },
  { keyword: 'bashment', genre: 'Dancehall' },
  { keyword: 'rap', genre: 'Hip-Hop' },
  { keyword: 'trap', genre: 'Hip-Hop' },
  { keyword: 'soul', genre: 'R&B' },
  { keyword: 'afro', genre: 'Afrobeats' },
]

/** Map decade-theme / ID3 / legacy labels onto library genres. */
export function normalizeGenreLabel(raw: string | null | undefined): DetectedGenre | null {
  if (!raw?.trim()) return null
  const lower = raw.trim().toLowerCase().replace(/[_/]+/g, ' ').replace(/\s+/g, ' ')

  if (lower === 'other' || lower === 'uncategorized' || lower === 'unknown') return 'Other'

  for (const g of LIBRARY_GENRES) {
    if (lower === g.toLowerCase()) return g
  }

  if (lower.includes('dancehall')) return 'Dancehall'
  if (lower.includes('afrobeats') || lower.includes('afrobeat') || lower === 'afro') return 'Afrobeats'
  if (lower.includes('hip-hop') || lower.includes('hip hop') || lower.includes('hiphop') || lower === 'rap') {
    return 'Hip-Hop'
  }
  if (
    lower.includes('r&b') ||
    lower.includes('r and b') ||
    lower.includes('rnb') ||
    lower.includes('soul') ||
    lower.includes('rhythm and blues')
  ) {
    return 'R&B'
  }
  if (lower.includes('reggae')) return 'Reggae'

  return 'Other'
}

/** Infer genre from a decade-theme name like "90s Dancehall Reggae". */
export function inferGenreFromThemeName(themeName: string | null | undefined): DetectedGenre | null {
  return normalizeGenreLabel(themeName)
}

/**
 * Detect genre from filename / title / artist / free-text keywords.
 * Returns null when nothing matches (caller may fall back to Other or leave unset).
 */
export function detectGenreFromText(...parts: Array<string | null | undefined>): LibraryGenre | null {
  const haystack = parts
    .filter((p): p is string => Boolean(p && p.trim()))
    .join(' ')
    .toLowerCase()
  if (!haystack) return null

  for (const { keyword, genre } of KEYWORD_GENRE_RULES) {
    if (haystack.includes(keyword)) return genre
  }
  return null
}

/**
 * Resolve effective library genre for a catalog song.
 * Prefers stored `genre`, then theme name, then title/artist keywords.
 */
export function resolveSongGenre(input: {
  genre?: string | null
  title?: string | null
  artist?: string | null
  themeName?: string | null
}): DetectedGenre | null {
  const fromColumn = normalizeGenreLabel(input.genre)
  if (fromColumn && fromColumn !== 'Other') return fromColumn
  if (fromColumn === 'Other') return 'Other'

  const fromTheme = inferGenreFromThemeName(input.themeName)
  if (fromTheme && fromTheme !== 'Other') return fromTheme

  const fromText = detectGenreFromText(input.title, input.artist, input.themeName)
  if (fromText) return fromText

  if (fromTheme === 'Other') return 'Other'
  return null
}

/** Whether a song matches a library genre filter tab. */
export function songMatchesGenreFilter(
  song: {
    genre?: string | null
    title?: string | null
    artist?: string | null
  },
  themeName: string | null | undefined,
  filter: LibraryGenreFilterId
): boolean {
  if (filter === 'all') return true
  const resolved = resolveSongGenre({
    genre: song.genre,
    title: song.title,
    artist: song.artist,
    themeName,
  })
  if (filter === 'other') {
    return !resolved || resolved === 'Other'
  }
  return resolved === filter
}

/** Map library genre → decade-theme catalog genre label (for theme auto-assign). */
export function libraryGenreToThemeGenre(genre: LibraryGenre): string {
  if (genre === 'Dancehall') return 'Dancehall Reggae'
  return genre
}
