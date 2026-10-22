/**
 * iTunes Search API helpers for song year / genre enrichment.
 * Maps primaryGenreName onto MASTER_GENRES when possible; fills gaps only.
 */

import { parseJsonResponse } from '@/lib/media/fetch-json'
import { isUntaggedStoredGenre, normalizeGenreLabel, toStoredGenre } from '@/lib/media/detect-genre'
import { parseSongYear } from '@/types/song'

export type ItunesSongResult = {
  trackName?: string
  artistName?: string
  releaseDate?: string
  primaryGenreName?: string
}

export type ItunesSearchResponse = {
  resultCount?: number
  results?: ItunesSongResult[]
}

export type ItunesEnrichment = {
  year: number | null
  genre: string | null
  primaryGenreName: string | null
}

const ITUNES_SLEEP_MS = 350

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function buildItunesSearchTerm(artist: string | null | undefined, title: string): string {
  const parts = [artist?.trim(), title.trim()].filter(Boolean)
  return parts.join(' ')
}

/** Map iTunes primaryGenreName → stored MASTER_GENRES label (or null if unusable). */
export function mapItunesGenreToStored(primaryGenreName: string | null | undefined): string | null {
  if (!primaryGenreName?.trim()) return null
  const normalized = normalizeGenreLabel(primaryGenreName)
  if (!normalized || normalized === 'Other') {
    // Try raw keyword detect on the iTunes label itself
    const stored = toStoredGenre(primaryGenreName)
    return stored
  }
  return toStoredGenre(normalized)
}

export function yearFromItunesReleaseDate(releaseDate: string | null | undefined): number | null {
  if (!releaseDate?.trim()) return null
  return parseSongYear(releaseDate.slice(0, 4))
}

export async function fetchItunesSongEnrichment(
  artist: string | null | undefined,
  title: string
): Promise<ItunesEnrichment | null> {
  const term = buildItunesSearchTerm(artist, title)
  if (!term) return null

  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=1`
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
    cache: 'no-store',
  })

  const data = await parseJsonResponse<ItunesSearchResponse>(response)
  const hit = data.results?.[0]
  if (!hit) return null

  return {
    year: yearFromItunesReleaseDate(hit.releaseDate),
    genre: mapItunesGenreToStored(hit.primaryGenreName),
    primaryGenreName: hit.primaryGenreName?.trim() || null,
  }
}

export type SongEnrichCandidate = {
  id: string
  title: string
  artist: string | null
  year: number | null
  genre: string | null
}

/** Whether this catalog row needs enrichment (missing year and/or untagged genre). */
export function songNeedsEnrichment(song: {
  year?: number | string | null
  genre?: string | null
}): boolean {
  const year = parseSongYear(song.year)
  const needsYear = year == null
  const needsGenre = isUntaggedStoredGenre(song.genre)
  return needsYear || needsGenre
}

/**
 * Build a partial update: fill year when null; fill genre only when empty/Untagged.
 * Never overwrites a carefully set MASTER_GENRES genre.
 */
export function buildEnrichmentUpdate(
  song: SongEnrichCandidate,
  itunes: ItunesEnrichment
): { year?: number; genre?: string | null } | null {
  const patch: { year?: number; genre?: string | null } = {}

  if (song.year == null && itunes.year != null) {
    patch.year = itunes.year
  }

  if (isUntaggedStoredGenre(song.genre) && itunes.genre) {
    patch.genre = itunes.genre
  }

  if (patch.year === undefined && patch.genre === undefined) return null
  return patch
}

export { ITUNES_SLEEP_MS }
