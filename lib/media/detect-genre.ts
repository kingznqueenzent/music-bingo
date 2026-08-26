/**
 * Shared genre detection for Media Library uploads + filtering.
 * Canonical buckets live in `constants/genres.ts` (MASTER_GENRES).
 */

import {
  MASTER_GENRES,
  TAGGED_GENRES,
  canonicalMasterGenre,
  isMasterGenre,
  isTaggedGenre,
  type TaggedGenre,
} from '@/constants/genres'

export {
  MASTER_GENRES,
  TAGGED_GENRES,
  canonicalMasterGenre,
  isMasterGenre,
  isTaggedGenre,
}
export type { MasterGenre, TaggedGenre } from '@/constants/genres'

/** @deprecated Use TAGGED_GENRES — kept so existing imports keep working. */
export const LIBRARY_GENRES = TAGGED_GENRES

export type LibraryGenre = TaggedGenre

/** Bulk tagging targets: master list including Untagged. */
export const BULK_GENRE_TARGETS = MASTER_GENRES
export type BulkGenreTarget = (typeof BULK_GENRE_TARGETS)[number]

/** Stored / display genre including unclassified bucket. */
export type DetectedGenre = LibraryGenre | 'Other'

/** Persist a library genre; Untagged / empty → null (matches isUntaggedStoredGenre). */
export function toStoredGenre(genre: string | null | undefined): string | null {
  const trimmed = genre?.trim() ?? ''
  if (!trimmed || trimmed.toLowerCase() === 'untagged') return null
  const canonical = canonicalMasterGenre(trimmed)
  if (canonical && canonical !== 'Untagged') return canonical
  return trimmed
}

export function isBulkGenreTarget(value: string): value is BulkGenreTarget {
  return isMasterGenre(value)
}

export type LibraryGenreFilterId = 'all' | LibraryGenre | 'other'

export const LIBRARY_GENRE_FILTERS: { id: LibraryGenreFilterId; label: string }[] = [
  { id: 'all', label: 'All' },
  ...TAGGED_GENRES.map((g) => ({ id: g as LibraryGenreFilterId, label: g })),
  { id: 'other', label: 'Untagged' },
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
  { keyword: 'calypso', genre: 'Calypso' },
  { keyword: 'chutney', genre: 'Chutney' },
  { keyword: 'gospel', genre: 'Gospel' },
  { keyword: 'country', genre: 'Country' },
  { keyword: 'latin', genre: 'Latin' },
  { keyword: 'soca', genre: 'Soca' },
  { keyword: 'bashment', genre: 'Dancehall' },
  { keyword: 'reggaeton', genre: 'Latin' },
  { keyword: '2000s', genre: '2000s' },
  { keyword: '80s', genre: '80s' },
  { keyword: '90s', genre: '90s' },
  { keyword: 'rock', genre: 'Rock' },
  { keyword: 'rap', genre: 'Hip-Hop' },
  { keyword: 'trap', genre: 'Hip-Hop' },
  { keyword: 'soul', genre: 'R&B' },
  { keyword: 'afro', genre: 'Afrobeats' },
  { keyword: 'pop', genre: 'Pop' },
]

/** Map decade-theme / ID3 / legacy labels onto library genres. */
export function normalizeGenreLabel(raw: string | null | undefined): DetectedGenre | null {
  if (!raw?.trim()) return null
  const lower = raw.trim().toLowerCase().replace(/[_/]+/g, ' ').replace(/\s+/g, ' ')

  if (lower === 'other' || lower === 'uncategorized' || lower === 'unknown' || lower === 'untagged') {
    return 'Other'
  }

  const exact = canonicalMasterGenre(raw)
  if (exact && exact !== 'Untagged') return exact

  for (const { keyword, genre } of KEYWORD_GENRE_RULES) {
    if (lower.includes(keyword)) return genre
  }

  return 'Other'
}

/**
 * Stored genre belongs in the Untagged bucket:
 * NULL, empty / whitespace, literal "Untagged", or Other (legacy unclassified).
 */
export function isUntaggedStoredGenre(genre?: string | null): boolean {
  const trimmed = genre?.trim() ?? ''
  if (!trimmed) return true
  if (trimmed.toLowerCase() === 'untagged') return true
  const normalized = normalizeGenreLabel(genre)
  return !normalized || normalized === 'Other'
}

/** Count catalog songs that lack a library genre tag. */
export function countUntaggedSongs(songs: Array<{ genre?: string | null }>): number {
  return songs.reduce((n, s) => n + (isUntaggedStoredGenre(s.genre) ? 1 : 0), 0)
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
  if (filter === 'other') {
    return isUntaggedStoredGenre(song.genre)
  }
  const storedNorm = normalizeGenreLabel(song.genre)
  if (storedNorm && storedNorm !== 'Other') return storedNorm === filter
  const resolved = resolveSongGenre({
    genre: song.genre,
    title: song.title,
    artist: song.artist,
    themeName,
  })
  return resolved === filter
}

/** Map library genre → decade-theme catalog genre label (for theme auto-assign). */
export function libraryGenreToThemeGenre(genre: LibraryGenre): string {
  if (genre === 'Dancehall') return 'Dancehall Reggae'
  return genre
}
