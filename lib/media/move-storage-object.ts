import type { SupabaseClient } from '@supabase/supabase-js'
import { MEDIA_BUCKET, resolveStorageUrl } from '@/lib/media/supabase-storage-upload'

export type MoveStorageResult = {
  newPath: string
  publicUrl: string
  moved: boolean
  warnings: string[]
}

/**
 * Copy a storage object to a new key and optionally remove the source.
 * Order for callers that update DB: copy → update DB → delete old (pass deleteOld: false on copy, then delete separately).
 */
export async function moveStorageObject(
  supabase: SupabaseClient,
  oldPath: string,
  newPath: string,
  options?: { bucket?: string; deleteOld?: boolean }
): Promise<MoveStorageResult> {
  const bucket = options?.bucket ?? MEDIA_BUCKET
  const deleteOld = options?.deleteOld ?? true
  const warnings: string[] = []

  const normalizedOld = oldPath?.trim() ?? ''
  const normalizedNew = newPath?.trim() ?? ''

  if (!normalizedOld) {
    throw new Error('Missing source storage path')
  }
  if (!normalizedNew) {
    throw new Error('Missing destination storage path')
  }

  if (normalizedOld === normalizedNew) {
    const publicUrl = await resolveStorageUrl(supabase, bucket, normalizedNew)
    return { newPath: normalizedNew, publicUrl, moved: false, warnings }
  }

  const { error: copyError } = await supabase.storage.from(bucket).copy(normalizedOld, normalizedNew)
  if (copyError) {
    throw new Error(`Storage copy failed: ${copyError.message}`)
  }

  const publicUrl = await resolveStorageUrl(supabase, bucket, normalizedNew)

  if (deleteOld) {
    const { error: deleteError } = await supabase.storage.from(bucket).remove([normalizedOld])
    if (deleteError) {
      const msg = `Copied to ${normalizedNew} but could not remove ${normalizedOld}: ${deleteError.message}`
      warnings.push(msg)
      console.warn(msg)
    }
  }

  return { newPath: normalizedNew, publicUrl, moved: true, warnings }
}

/** Best-effort removal after DB has been updated to point at the new object. */
export async function removeStorageObjectBestEffort(
  supabase: SupabaseClient,
  objectPath: string,
  bucket = MEDIA_BUCKET
): Promise<string | null> {
  const path = objectPath?.trim()
  if (!path) return null

  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) {
    const msg = `Could not remove old storage object ${bucket}/${path}: ${error.message}`
    console.warn(msg)
    return msg
  }
  return null
}
