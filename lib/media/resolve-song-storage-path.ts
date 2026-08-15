import { MEDIA_BUCKET } from '@/lib/media/supabase-storage-upload'

type SongStorageFields = {
  storage_path?: string | null
  media_url?: string | null
}

/**
 * Resolve the Supabase Storage object key for a catalog song.
 * Prefers explicit `storage_path`; falls back to parsing public/signed media URLs.
 */
export function resolveSongStoragePath(
  song: SongStorageFields,
  bucket = MEDIA_BUCKET
): string | null {
  const explicit = song.storage_path?.trim()
  if (explicit) return explicit

  const url = song.media_url?.trim()
  if (!url) return null

  try {
    const parsed = new URL(url)
    const marker = `/storage/v1/object/`
    const idx = parsed.pathname.indexOf(marker)
    if (idx === -1) return null

    const afterObject = parsed.pathname.slice(idx + marker.length)
    // public/{bucket}/{path} or sign/{bucket}/{path}
    const segments = afterObject.split('/').filter(Boolean)
    if (segments.length < 2) return null

    const urlBucket = segments[0] === 'public' || segments[0] === 'sign' ? segments[1] : segments[0]
    const pathStart = segments[0] === 'public' || segments[0] === 'sign' ? 2 : 1
    const objectPath = segments.slice(pathStart).join('/')

    if (!objectPath) return null
    if (urlBucket && urlBucket !== bucket) return null
    return decodeURIComponent(objectPath)
  } catch {
    return null
  }
}
