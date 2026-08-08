import { parseBlob } from 'music-metadata'
import { cleanSongTitle, parseArtistTitle } from '@/lib/songAutoCategorizer'

export type ExtractedMediaMeta = {
  title: string
  artist: string | null
  year: number | null
  /** True when title/artist came from ID3 (or container tags), not filename. */
  fromTags: boolean
}

/**
 * Prefer ID3 / container tags; fall back to "Artist - Title" filename parsing.
 */
export async function extractMediaMetadata(file: File): Promise<ExtractedMediaMeta> {
  const fromName = parseArtistTitle(cleanSongTitle(file.name))
  let title = fromName.title || file.name.replace(/\.[^.]+$/, '')
  let artist = fromName.artist
  let year: number | null = null
  let fromTags = false

  try {
    const meta = await parseBlob(file, { duration: false })
    const common = meta.common
    const tagTitle = common.title?.trim()
    const tagArtist =
      common.artist?.trim() ||
      common.albumartist?.trim() ||
      (common.artists?.find((a) => a.trim())?.trim() ?? null)

    if (tagTitle) {
      title = cleanSongTitle(tagTitle) || tagTitle
      fromTags = true
    }
    if (tagArtist) {
      artist = tagArtist
      fromTags = true
    }
    if (common.year && Number.isFinite(common.year)) {
      year = common.year
    } else if (common.date) {
      const y = Number.parseInt(String(common.date).slice(0, 4), 10)
      if (Number.isFinite(y) && y >= 1900 && y <= 2100) year = y
    }
  } catch {
    // Filename fallback already applied
  }

  return { title, artist, year, fromTags }
}
