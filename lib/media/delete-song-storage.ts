import type { SupabaseClient } from '@supabase/supabase-js'
import { MEDIA_BUCKET } from '@/lib/media/supabase-storage-upload'
import { resolveSongStoragePath } from '@/lib/media/resolve-song-storage-path'

type SongStorageFields = {
  storage_path?: string | null
  media_url?: string | null
}

/**
 * Best-effort removal of a song's storage object. Logs but does not throw on failure.
 */
export async function deleteSongStorageObject(
  supabase: SupabaseClient,
  song: SongStorageFields,
  bucket = MEDIA_BUCKET
): Promise<void> {
  const path = resolveSongStoragePath(song, bucket)
  if (!path) return

  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) {
    console.warn(`Could not remove storage object ${bucket}/${path}:`, error.message)
  }
}
