/** Whether a string looks like a YouTube watch or short link. */
export function isYoutubeUrl(value: string | null | undefined): boolean {
  if (!value?.trim()) return false
  return /(?:youtube\.com|youtu\.be)/i.test(value.trim())
}

/** Extract a YouTube video id from common URL shapes. */
export function extractYoutubeVideoId(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  try {
    const url = new URL(trimmed)
    if (url.hostname.includes('youtube.com')) {
      if (url.pathname === '/watch') {
        const id = url.searchParams.get('v')
        return id?.trim() || null
      }
      const embedMatch = url.pathname.match(/^\/embed\/([^/?#]+)/)
      if (embedMatch?.[1]) return embedMatch[1]
      const shortsMatch = url.pathname.match(/^\/shorts\/([^/?#]+)/)
      if (shortsMatch?.[1]) return shortsMatch[1]
    }
    if (url.hostname === 'youtu.be') {
      const id = url.pathname.replace(/^\//, '').split('/')[0]
      return id || null
    }
  } catch {
    // fall through
  }

  const loose = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/
  )
  return loose?.[1] ?? null
}

/** Canonical watch URL with only the video id (no tracking/query params). */
export function normalizeYoutubeUrl(value: string): string | null {
  const id = extractYoutubeVideoId(value)
  if (!id) return null
  return `https://www.youtube.com/watch?v=${id}`
}

/** Prefer youtube_url, then media_url when detecting misplaced YouTube links. */
export function getSongYoutubeCandidate(song: {
  media_url?: string | null
  youtube_url?: string | null
}): string | null {
  const youtube = song.youtube_url?.trim()
  if (youtube && isYoutubeUrl(youtube)) return youtube
  const media = song.media_url?.trim()
  if (media && isYoutubeUrl(media)) return media
  return null
}
