const DEFAULT_PROJECT_REF = 'dmcjpkrdivafkqoovyvn'

/** Public Supabase Storage base for pre-cut MP3 hooks. */
export function getAudioClipsPublicBase(): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, '')
  if (supabaseUrl) {
    return `${supabaseUrl}/storage/v1/object/public/audio-clips`
  }
  return `https://${DEFAULT_PROJECT_REF}.supabase.co/storage/v1/object/public/audio-clips`
}

/**
 * Resolve theme_songs / playlist_songs audio_url to a playable HTTPS URL.
 * Accepts full URLs or bucket-relative filenames (e.g. `dancehall/track-01.mp3`).
 */
export function resolveAudioClipUrl(value: string | null | undefined): string | null {
  const raw = value?.trim()
  if (!raw) return null
  if (/^https?:\/\//i.test(raw)) return raw
  const base = getAudioClipsPublicBase().replace(/\/$/, '')
  const path = raw.replace(/^\/+/, '')
  return `${base}/${path}`
}

export function isAudioMediaUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false
  return /\.(mp3|m4a|wav|ogg|aac|flac)(\?|$)/i.test(url) || url.includes('/audio-clips/')
}
