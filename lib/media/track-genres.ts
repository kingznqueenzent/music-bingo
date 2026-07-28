/**
 * Base44 genre buckets for host media catalog (Dancehall, Reggae, 80's Pop, …).
 * Used when assigning theme_id or inferring genre from theme / era names.
 */

export const TRACK_GENRE_BUCKETS = [
  'Dancehall',
  'Reggae',
  "80's Pop",
  "90's Pop",
  "70's Rock",
  "80's Rock",
  "90's Rock",
  "2000's Rock",
  "70's R&B",
  "80's R&B",
  "90's Reggae",
  "80's Reggae",
] as const

export type TrackGenreBucket = (typeof TRACK_GENRE_BUCKETS)[number]

const ERA_FROM_NAME = /\b(70|80|90|2000)s?\b/i

export function extractEraLabel(name: string | null | undefined): string | null {
  if (!name) return null
  const m = name.match(ERA_FROM_NAME)
  if (!m) return null
  const decade = m[1]
  return decade === '2000' ? '2000s' : `${decade}s`
}

/** Infer catalog genre from theme + parent genre + era (Base44 categorization). */
export function inferTrackGenre(input: {
  themeName?: string | null
  parentGenreName?: string | null
  eraName?: string | null
}): TrackGenreBucket | null {
  const theme = (input.themeName ?? '').toLowerCase()
  const parent = (input.parentGenreName ?? '').toLowerCase()
  const era = extractEraLabel(input.eraName ?? input.themeName) ?? extractEraLabel(input.themeName)

  if (theme.includes('dancehall')) return 'Dancehall'

  if (theme.includes('reggae') || parent === 'reggae') {
    if (era === '80s') return "80's Reggae"
    if (era === '90s') return "90's Reggae"
    return 'Reggae'
  }

  if (parent === 'pop' || theme.includes('pop')) {
    if (era === '80s') return "80's Pop"
    if (era === '90s') return "90's Pop"
  }

  if (parent === 'rock' || theme.includes('rock')) {
    if (era === '70s') return "70's Rock"
    if (era === '80s') return "80's Rock"
    if (era === '90s') return "90's Rock"
    if (era === '2000s') return "2000's Rock"
  }

  if (parent.includes('r&b') || parent.includes('soul') || theme.includes('r&b')) {
    if (era === '70s') return "70's R&B"
    if (era === '80s') return "80's R&B"
  }

  return null
}

export function normalizeTrackKey(title: string, artist: string | null | undefined): string {
  return `${title.trim().toLowerCase()}::${(artist ?? '').trim().toLowerCase()}`
}

/** Parse "Artist - Title" or "Title" from filename / import line. */
export function parseTitleArtist(raw: string): { title: string; artist: string | null } {
  let text = raw.trim()
  if (!text) return { title: 'Untitled', artist: null }
  text = text.replace(/\.(mp3|mp4|m4a|wav|flac|ogg|webm)$/i, '').trim()
  const dash = text.match(/^(.+?)\s[-–—]\s(.+)$/)
  if (dash) {
    return { artist: dash[1].trim(), title: dash[2].trim() }
  }
  return { title: text, artist: null }
}
