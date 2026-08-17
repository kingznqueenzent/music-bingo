import {
  decadeLabelFromYear,
  themeNameFromYearAndGenre,
} from '@/lib/decade-theme-catalog'
import {
  detectGenreFromText,
  libraryGenreToThemeGenre,
  type LibraryGenre,
} from '@/lib/media/detect-genre'

export interface AutoCategoryResult {
  theme_name: string | null
  year: number | null
  artist: string | null
  cleanTitle: string
}

const DECADE_KEYWORDS = ['50s', '60s', '70s', '80s', '90s', '2000s', '2010s', '2020s'] as const

const MUSICBRAINZ_USER_AGENT = 'LyricGrid/1.0 (admin@lyricgrid.ca)'

/** Strip extensions and bracketed tags like "(90s Throwback)" from filenames/titles. */
export function cleanSongTitle(raw: string): string {
  return raw
    .replace(/\.(mp3|wav|m4a|flac|mp4|aac)$/gi, '')
    .replace(/\(.*?\)|\[.*?\]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/** Split "Artist - Title" into parts after tag cleanup. */
export function parseArtistTitle(cleanTitle: string): { artist: string | null; title: string } {
  const match = cleanTitle.match(/^(.+?)\s[-–—]\s(.+)$/)
  if (!match) return { artist: null, title: cleanTitle }
  return {
    artist: match[1].trim() || null,
    title: match[2].trim() || cleanTitle,
  }
}

function matchGenreFromKeywords(text: string): string | null {
  const library = detectGenreFromText(text)
  if (!library) return null
  return libraryGenreToThemeGenre(library as LibraryGenre)
}

function matchDecadeFromKeywords(text: string): string | null {
  const lower = text.toLowerCase()
  for (const decade of DECADE_KEYWORDS) {
    if (lower.includes(decade)) return decade
  }
  return null
}

/** @deprecated Use themeNameFromYearAndGenre — kept for callers expecting old name. */
export function themeFromReleaseYear(
  year: number | null,
  genre: string | null = 'R&B',
  decadeOverride?: string | null
): string | null {
  return themeNameFromYearAndGenre(year, genre, decadeOverride)
}

function resolveTheme(rawText: string, year: number | null, genre: string | null): string | null {
  const decadeFromText = matchDecadeFromKeywords(rawText)
  const resolvedGenre = genre ?? matchGenreFromKeywords(rawText) ?? (decadeFromText || year ? 'R&B' : null)
  const decadeFromYear = year != null ? decadeLabelFromYear(year) : null
  const decade = decadeFromYear ?? decadeFromText

  return themeNameFromYearAndGenre(year, resolvedGenre, decade)
}

/** Keyword-only categorization (sync, no network). */
export function autoCategorizeFromKeywords(rawFileNameOrTitle: string): AutoCategoryResult {
  const cleanTitle = cleanSongTitle(rawFileNameOrTitle)
  const parsed = parseArtistTitle(cleanTitle)
  const genre = matchGenreFromKeywords(rawFileNameOrTitle) ?? matchGenreFromKeywords(cleanTitle)
  const theme_name = resolveTheme(rawFileNameOrTitle, null, genre)

  return {
    theme_name,
    year: null,
    artist: parsed.artist,
    cleanTitle: parsed.title,
  }
}

/** MusicBrainz recording lookup for release year + artist. */
export async function lookupMusicBrainz(cleanTitle: string): Promise<AutoCategoryResult> {
  const fallback: AutoCategoryResult = {
    theme_name: null,
    year: null,
    artist: null,
    cleanTitle,
  }

  if (!cleanTitle.trim()) return fallback

  try {
    const response = await fetch(
      `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(cleanTitle)}&fmt=json&limit=1`,
      {
        headers: { 'User-Agent': MUSICBRAINZ_USER_AGENT },
        signal: AbortSignal.timeout(8000),
      }
    )

    if (!response.ok) return fallback

    const data = (await response.json()) as {
      recordings?: Array<{
        title?: string
        'first-release-date'?: string
        releases?: Array<{ date?: string }>
        'artist-credit'?: Array<{ name?: string }>
      }>
    }

    const topMatch = data.recordings?.[0]
    if (!topMatch) return fallback

    const releaseDate = topMatch['first-release-date'] || topMatch.releases?.[0]?.date
    const yearParsed = releaseDate ? parseInt(releaseDate.substring(0, 4), 10) : null
    const year = Number.isFinite(yearParsed) ? yearParsed : null
    const artist = topMatch['artist-credit']?.[0]?.name ?? null
    const mbTitle = topMatch.title || cleanTitle

    return {
      theme_name: null,
      year,
      artist,
      cleanTitle: mbTitle,
    }
  } catch (err) {
    console.warn('[autoCategorizeSong] MusicBrainz lookup skipped:', err)
    return fallback
  }
}

/** Keywords + MusicBrainz — decade theme e.g. 1997 R&B → "90s R&B". */
export async function autoCategorizeSong(rawFileNameOrTitle: string): Promise<AutoCategoryResult> {
  const keywordResult = autoCategorizeFromKeywords(rawFileNameOrTitle)
  const genre =
    matchGenreFromKeywords(rawFileNameOrTitle) ??
    matchGenreFromKeywords(keywordResult.cleanTitle) ??
    'R&B'

  const lookupTitle =
    keywordResult.artist && keywordResult.cleanTitle
      ? `${keywordResult.artist} ${keywordResult.cleanTitle}`
      : keywordResult.cleanTitle

  const mb = await lookupMusicBrainz(lookupTitle)
  const year = mb.year ?? keywordResult.year
  const theme_name =
    resolveTheme(rawFileNameOrTitle, year, genre) ??
    keywordResult.theme_name ??
    themeNameFromYearAndGenre(year, genre)

  const artist = mb.artist ?? keywordResult.artist
  const parsed = parseArtistTitle(mb.cleanTitle || keywordResult.cleanTitle)

  return {
    theme_name,
    year,
    artist: artist ?? parsed.artist,
    cleanTitle: parsed.title || mb.cleanTitle || keywordResult.cleanTitle,
  }
}
