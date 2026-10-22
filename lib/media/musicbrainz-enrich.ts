/**
 * MusicBrainz recording search helpers for catalog year enrichment.
 * Rate-limit ~1 req/s and send a meaningful User-Agent (MusicBrainz requirement).
 */

import { parseJsonResponse } from '@/lib/media/fetch-json'
import { parseSongYear } from '@/types/song'

export const MUSICBRAINZ_USER_AGENT = 'LyricGrid/1.0 (contact@lyricgrid.ca)'

/** Slightly over 1s to stay under MusicBrainz ~1 request/second guideline. */
export const MUSICBRAINZ_SLEEP_MS = 1100

export type MusicBrainzRecording = {
  title?: string
  'first-release-date'?: string
  releases?: Array<{ date?: string }>
  'artist-credit'?: Array<{ name?: string }>
}

export type MusicBrainzSearchResponse = {
  recordings?: MusicBrainzRecording[]
  count?: number
}

export type MusicBrainzEnrichment = {
  year: number | null
  artist: string | null
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Escape Lucene special chars for MusicBrainz search terms. */
export function escapeMusicBrainzTerm(value: string): string {
  return value.replace(/([+\-&|!(){}\[\]^"~*?:\\/])/g, '\\$1')
}

/**
 * Lucene query: recording title + artist when available.
 * Example: recording:"Billie Jean" AND artist:"Michael Jackson"
 */
export function buildMusicBrainzQuery(
  artist: string | null | undefined,
  title: string
): string | null {
  const cleanTitle = title.trim()
  if (!cleanTitle) return null

  const recordingClause = `recording:"${escapeMusicBrainzTerm(cleanTitle)}"`
  const cleanArtist = artist?.trim()
  if (cleanArtist) {
    return `${recordingClause} AND artist:"${escapeMusicBrainzTerm(cleanArtist)}"`
  }
  return recordingClause
}

export function yearFromMusicBrainzRecording(
  recording: MusicBrainzRecording | null | undefined
): number | null {
  if (!recording) return null
  const releaseDate = recording['first-release-date'] || recording.releases?.[0]?.date
  if (!releaseDate?.trim()) return null
  return parseSongYear(releaseDate.slice(0, 4))
}

export async function fetchMusicBrainzSongEnrichment(
  artist: string | null | undefined,
  title: string
): Promise<MusicBrainzEnrichment | null> {
  const query = buildMusicBrainzQuery(artist, title)
  if (!query) return null

  const url = `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(query)}&fmt=json&limit=1`
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': MUSICBRAINZ_USER_AGENT,
    },
    signal: AbortSignal.timeout(12_000),
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`MusicBrainz HTTP ${response.status}`)
  }

  const data = await parseJsonResponse<MusicBrainzSearchResponse>(response)
  const hit = data.recordings?.[0]
  if (!hit) return null

  return {
    year: yearFromMusicBrainzRecording(hit),
    artist: hit['artist-credit']?.[0]?.name?.trim() || null,
  }
}

export type SongEnrichCandidate = {
  id: string
  title: string
  artist: string | null
  year: number | null
  genre: string | null
}

/** Primary target: catalog rows with year IS NULL. */
export function songNeedsYearEnrichment(song: {
  year?: number | string | null
}): boolean {
  return parseSongYear(song.year) == null
}

/**
 * Build a partial update: fill year when null.
 * Never overwrites an existing year.
 */
export function buildEnrichmentUpdate(
  song: SongEnrichCandidate,
  mb: MusicBrainzEnrichment
): { year?: number } | null {
  if (song.year == null && mb.year != null) {
    return { year: mb.year }
  }
  return null
}
