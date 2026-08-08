/** Genre / era filters and name parsing for the Browse Themes page. */

export const BROWSE_GENRE_PILLS = [
  'All',
  'Rock',
  'R&B & Soul',
  'Reggae',
  'Pop',
  'Hip Hop',
  'Dancehall',
  'Afrobeats',
] as const

export const BROWSE_ERA_PILLS = ['All', '70s', '80s', '90s', '2000s', '2010s', '2020s'] as const

export type BrowseGenreFilter = (typeof BROWSE_GENRE_PILLS)[number]
export type BrowseEraFilter = (typeof BROWSE_ERA_PILLS)[number]

export type BrowseThemeIcon = 'music' | 'mic' | 'guitar'

function normalize(name: string): string {
  return name.replace(/['']/g, '').toLowerCase()
}

/** Extract display era label from a theme name (e.g. "90's Hip-Hop" → "90s"). */
export function parseEraFromThemeName(name: string): string | null {
  const n = normalize(name)
  if (n.includes('2020')) return '2020s'
  if (n.includes('2010')) return '2010s'
  if (n.includes('2000')) return '2000s'
  if (/\b90s\b/.test(n) || n.startsWith('90')) return '90s'
  if (/\b80s\b/.test(n) || n.startsWith('80')) return '80s'
  if (/\b70s\b/.test(n) || n.startsWith('70')) return '70s'
  return null
}

/** Map theme name to a browse-genre pill label. */
export function parseGenreFromThemeName(name: string): BrowseGenreFilter | null {
  const n = normalize(name)
  if (n.includes('afrobeats')) return 'Afrobeats'
  if (n.includes('dancehall')) return 'Dancehall'
  if (n.includes('hip-hop') || n.includes('hip hop') || n.includes('hiphop')) return 'Hip Hop'
  if (n.includes('reggae')) return 'Reggae'
  if (n.includes('r&b') || n.includes('rb & soul') || (n.includes('soul') && !n.includes('rock'))) {
    return 'R&B & Soul'
  }
  if (n.includes('pop')) return 'Pop'
  if (n.includes('rock')) return 'Rock'
  return null
}

export function themeMatchesGenre(name: string, genre: BrowseGenreFilter): boolean {
  if (genre === 'All') return true
  return parseGenreFromThemeName(name) === genre
}

export function themeMatchesEra(name: string, era: BrowseEraFilter): boolean {
  if (era === 'All') return true
  return parseEraFromThemeName(name) === era
}

export function themeMatchesSearch(name: string, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const haystack = normalize(name)
  if (haystack.includes(q)) return true
  const genre = parseGenreFromThemeName(name)
  const era = parseEraFromThemeName(name)
  return (genre?.toLowerCase().includes(q) ?? false) || (era?.toLowerCase().includes(q) ?? false)
}

export function browseThemeIconKind(name: string): BrowseThemeIcon {
  const genre = parseGenreFromThemeName(name)
  if (genre === 'Hip Hop' || genre === 'R&B & Soul') return 'mic'
  if (genre === 'Rock' || genre === 'Reggae' || genre === 'Dancehall' || genre === 'Afrobeats') {
    return 'guitar'
  }
  return 'music'
}

export function formatSongCountLabel(count: number): string {
  return count === 1 ? '1 song' : `${count} songs`
}

/** Host flow: create a game pre-filtered to this theme's catalog songs. */
export function browseThemeHostHref(themeId: string): string {
  return `/host/create-from-media?theme=${encodeURIComponent(themeId)}`
}
