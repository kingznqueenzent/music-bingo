const PLACEHOLDER_TITLES = new Set(['unknown track', 'unknown', 'track', 'untitled'])
const YOUTUBE_ID_RE = /^[a-zA-Z0-9_-]{11}$/

/** True when a stored title is missing or a generic / YouTube-id placeholder. */
export function isPlaceholderSongTitle(title: string | null | undefined): boolean {
  const trimmed = title?.trim()
  if (!trimmed) return true
  if (PLACEHOLDER_TITLES.has(trimmed.toLowerCase())) return true
  if (YOUTUBE_ID_RE.test(trimmed)) return true
  return false
}

type PlaylistSongTitleSource = {
  title?: string | null
  youtube_id?: string | null
  file_url?: string | null
  audio_url?: string | null
}

/** Best available title for persistence (bingo_game_tracks, grid_data). */
export function resolvePlaylistSongTitleForStorage(song: PlaylistSongTitleSource): string {
  if (!isPlaceholderSongTitle(song.title)) return song.title!.trim()
  const fileRef = song.file_url?.trim() || song.audio_url?.trim()
  if (fileRef) return mediaDisplayName({ name: fileRef })
  const yt = song.youtube_id?.trim()
  if (yt) return yt
  return 'Track'
}

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
  audio_url?: string | null
}): string {
  const raw =
    (!isPlaceholderSongTitle(song.title) ? song.title?.trim() : null) ||
    song.youtube_id?.trim() ||
    song.file_url?.trim() ||
    song.audio_url?.trim() ||
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
