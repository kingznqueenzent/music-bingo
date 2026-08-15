import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveSongStoragePath } from '@/lib/media/resolve-song-storage-path'
import {
  computeTargetStoragePath,
  type SongPathMetadata,
  storagePathWouldChange,
} from '@/lib/media/song-storage-path'
import { moveStorageObject, removeStorageObjectBestEffort } from '@/lib/media/move-storage-object'

type SongRow = {
  storage_path?: string | null
  media_url?: string | null
  artist?: string | null
  theme_id?: string | null
}

export type StorageMovePlan = {
  oldPath: string
  storage_path: string
  media_url: string
}

const DEFAULT_THEME = 'Uncategorized'

async function resolveThemeName(
  supabase: SupabaseClient,
  themeId: string | null | undefined
): Promise<string> {
  if (!themeId) return DEFAULT_THEME
  const { data } = await supabase.from('themes').select('name').eq('id', themeId).maybeSingle()
  return data?.name?.trim() || DEFAULT_THEME
}

/** Returns a copy plan when theme/artist changes affect a hierarchical storage path. */
export async function planSongStorageMove(
  supabase: SupabaseClient,
  song: SongRow,
  updates: { artist?: string | null; theme_id?: string | null }
): Promise<StorageMovePlan | null> {
  const currentPath = resolveSongStoragePath(song)
  if (!currentPath) return null

  const themeId =
    updates.theme_id !== undefined ? (updates.theme_id ? String(updates.theme_id) : null) : song.theme_id ?? null
  const artist =
    updates.artist !== undefined
      ? updates.artist
        ? String(updates.artist).trim()
        : null
      : song.artist ?? null

  const themeName = await resolveThemeName(supabase, themeId)
  const meta: SongPathMetadata = { themeName, artist }

  if (!storagePathWouldChange(currentPath, meta)) return null

  const targetPath = computeTargetStoragePath(currentPath, meta)
  if (!targetPath) return null

  return { oldPath: currentPath, storage_path: targetPath, media_url: '' }
}

/** Copy object to the planned destination (no delete). */
export async function executeStorageCopy(
  supabase: SupabaseClient,
  plan: StorageMovePlan
): Promise<{ storage_path: string; media_url: string }> {
  const result = await moveStorageObject(supabase, plan.oldPath, plan.storage_path, { deleteOld: false })
  return { storage_path: result.newPath, media_url: result.publicUrl }
}

/** Remove the source object after DB points at the new key. */
export async function finalizeStorageMove(
  supabase: SupabaseClient,
  oldPath: string
): Promise<string | null> {
  return removeStorageObjectBestEffort(supabase, oldPath)
}
