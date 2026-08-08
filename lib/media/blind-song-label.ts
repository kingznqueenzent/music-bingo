import { splitSongDisplayParts, type SongDisplayParts } from '@/lib/media-display'

export type BlindSongLabelOptions = {
  hideTitles: boolean
  /** 1-based track / cell index for fallback display */
  trackNumber?: number | null
  label?: string | null
  title?: string | null
  artist?: string | null
}

/** Resolve what players/stage should see for a song under Blind Mode. */
export function resolveBlindSongParts(options: BlindSongLabelOptions): SongDisplayParts {
  const base =
    options.title || options.artist
      ? {
          title: (options.title || options.label || 'Track').trim() || 'Track',
          artist: options.artist?.trim() || null,
          full: options.label || options.title || 'Track',
        }
      : splitSongDisplayParts(options.label)

  if (!options.hideTitles) return base

  const track =
    options.trackNumber != null && options.trackNumber > 0 ? `#${options.trackNumber}` : null

  return {
    title: '???',
    artist: base.artist || track,
    full: base.artist
      ? `??? — ${base.artist}`
      : track
        ? `??? (${track})`
        : '???',
  }
}
