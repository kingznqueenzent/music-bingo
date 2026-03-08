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
  spotify_track_id?: string | null
}): string {
  const raw =
    song.title?.trim() ||
    song.youtube_id?.trim() ||
    song.file_url?.trim() ||
    song.spotify_track_id?.trim() ||
    ''
  if (!raw) return 'Track'
  // If it already looks like a short title (no URL, no long path), use it
  if (!raw.startsWith('http') && !raw.includes('/') && raw.length < 80) {
    const cleaned = raw.replace(/\.(mp3|mp4|m4a|wav|flac|ogg|webm)$/i, '').trim()
    if (cleaned) return cleaned.replace(/[-_.]+/g, ' ').trim()
  }
  return mediaDisplayName({ name: raw })
}
