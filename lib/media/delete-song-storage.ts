import type { SupabaseClient } from '@supabase/supabase-js'
import { MEDIA_BUCKET } from '@/lib/media/supabase-storage-upload'
import { resolveSongStoragePath } from '@/lib/media/resolve-song-storage-path'

type SongStorageFields = {
  storage_path?: string | null
  media_url?: string | null
}

const REMOVE_CHUNK = 100

/**
 * Best-effort removal of a song's storage object. Logs but does not throw on failure.
 */
export async function deleteSongStorageObject(
  supabase: SupabaseClient,
  song: SongStorageFields,
  bucket = MEDIA_BUCKET
): Promise<void> {
  await deleteSongStorageObjects(supabase, [song], bucket)
}

/**
 * Best-effort removal of storage objects for many catalog songs (same `media` bucket).
 */
export async function deleteSongStorageObjects(
  supabase: SupabaseClient,
  songs: SongStorageFields[],
  bucket = MEDIA_BUCKET
): Promise<void> {
  const paths = [
    ...new Set(
      songs
        .map((song) => resolveSongStoragePath(song, bucket))
        .filter((path): path is string => Boolean(path))
    ),
  ]
  if (paths.length === 0) return

  for (let i = 0; i < paths.length; i += REMOVE_CHUNK) {
    const chunk = paths.slice(i, i + REMOVE_CHUNK)
    const { error } = await supabase.storage.from(bucket).remove(chunk)
    if (error) {
      console.warn(`Could not remove storage objects from ${bucket}:`, error.message)
    }
  }
}
