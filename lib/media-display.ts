/**
 * Friendly display name for a media library item (song/track).
 * Strips extension, cleans URL/path to show the actual file/track name.
 */
export function mediaDisplayName(item: { name: string; file_type?: string }): string {
  let raw = item.name?.trim() || 'Untitled'
  // If it looks like a URL or path, take the last segment
  if (raw.startsWith('http') || raw.includes('/')) {
    const last = raw.split('/').pop()?.trim()
    if (last) raw = last
  }
  // Strip common audio/video extensions
  raw = raw.replace(/\.(mp3|mp4|m4a|wav|flac|ogg|webm)$/i, '').trim()
  if (!raw) return 'Untitled'
  // Replace separators with spaces for readability
  return raw.replace(/[-_.]+/g, ' ').trim()
}

/**
 * Label for a playlist song in the host panel (Up next / Played).
 * Prefers title; if missing or looks like a URL, shows a friendly name.
 */
export function playlistSongLabel(song: {
  title?: string | null
  youtube_id?: string | null
  file_url?: string | null
}): string {
  const raw =
    song.title?.trim() ||
    song.youtube_id?.trim() ||
    song.file_url?.trim() ||
    ''
  if (!raw) return 'Track'
  // If it already looks like a short title (no URL, no long path), use it
  if (!raw.startsWith('http') && !raw.includes('/') && raw.length < 80) {
    const cleaned = raw.replace(/\.(mp3|mp4|m4a|wav|flac|ogg|webm)$/i, '').trim()
    if (cleaned) return cleaned.replace(/[-_.]+/g, ' ').trim()
  }
  return mediaDisplayName({ name: raw })
}

export type SongDisplayParts = {
  title: string
  artist: string | null
  /** Combined label for tooltips / aria */
  full: string
}

/** Split "Title — Artist" / "Title - Artist" style labels for responsive bingo/stage UI. */
export function splitSongDisplayParts(label: string | null | undefined): SongDisplayParts {
  const full = (label ?? '').trim() || 'Track'
  const emDash = full.match(/^(.*?)\s+[—–]\s+(.+)$/)
  if (emDash?.[1]?.trim() && emDash[2]?.trim()) {
    return { title: emDash[1].trim(), artist: emDash[2].trim(), full }
  }
  const hyphen = full.match(/^(.*?)\s+-\s+(.+)$/)
  if (hyphen?.[1]?.trim() && hyphen[2]?.trim() && hyphen[1].trim().length >= 2) {
    return { title: hyphen[1].trim(), artist: hyphen[2].trim(), full }
  }
  return { title: full, artist: null, full }
}

export function playlistSongDisplayParts(song: {
  title?: string | null
  youtube_id?: string | null
  file_url?: string | null
}): SongDisplayParts {
  return splitSongDisplayParts(playlistSongLabel(song))
}
