import type { SupabaseClient } from '@supabase/supabase-js'
import type { MediaLibraryItem } from '@/lib/supabase/types'
import { buildSanitizedStoragePath, storageExtension } from '@/lib/media/sanitize-storage-filename'

/**
 * LyricGrid media library bucket (MP3/MP4).
 * Existing production policies and objects use `media`.
 * Override with NEXT_PUBLIC_MEDIA_BUCKET if you provision `audio-tracks`.
 */
export const MEDIA_BUCKET =
  (typeof process !== 'undefined' &&
    process.env.NEXT_PUBLIC_MEDIA_BUCKET?.trim()) ||
  'media'

export const MAX_UPLOAD_MB = 100

/** MIME types accepted by the media bucket / upload path (plus browser variants). */
export const MEDIA_ALLOWED_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/aac',
  'audio/mp4',
  'audio/x-m4a',
  'audio/m4a',
  'video/mp4',
  'application/octet-stream',
] as const

export type ValidMediaFile = {
  ext: 'mp3' | 'mp4'
}

export function validateMediaFile(file: File): ValidMediaFile | { error: string } {
  const ext = storageExtension(file.name)
  if (!ext) {
    return { error: 'Only MP3 and MP4 files are allowed.' }
  }
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    return { error: `File too large. Max ${MAX_UPLOAD_MB} MB.` }
  }
  return { ext }
}

/** Prefer a real Content-Type; browsers often send empty or octet-stream for MP3. */
export function resolveMediaContentType(file: File, ext: 'mp3' | 'mp4'): string {
  const raw = (file.type || '').trim().toLowerCase()
  if (raw && raw !== 'application/octet-stream') {
    return raw
  }
  return ext === 'mp3' ? 'audio/mpeg' : 'video/mp4'
}

export type DirectStorageUploadResult = {
  path: string
  publicUrl: string
  ext: 'mp3' | 'mp4'
  bucket: string
}

/**
 * Upload a file directly from the browser via Supabase JS (no Next.js body proxy).
 * Returns a public URL when the bucket is public, otherwise a long-lived signed URL.
 */
export async function uploadMediaToStorage(
  supabase: SupabaseClient,
  file: File,
  options?: { bucket?: string }
): Promise<DirectStorageUploadResult> {
  const validated = validateMediaFile(file)
  if ('error' in validated) throw new Error(validated.error)

  const bucket = options?.bucket ?? MEDIA_BUCKET
  const path = buildSanitizedStoragePath(file.name, validated.ext)
  const contentType = resolveMediaContentType(file, validated.ext)

  try {
    console.info('[uploadMediaToStorage]', {
      name: file.name,
      size: file.size,
      contentType,
      path,
      bucket,
    })

    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
      contentType,
      upsert: false,
      cacheControl: '3600',
    })

    if (uploadError) {
      console.error('[uploadMediaToStorage] storage error', uploadError)
      throw new Error(uploadError.message || 'Storage upload failed')
    }

    const publicUrl = await resolveStorageUrl(supabase, bucket, path)
    return { path, publicUrl, ext: validated.ext, bucket }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Storage upload failed'
    console.error('[uploadMediaToStorage] failed', { path, bucket, message })
    throw e instanceof Error ? e : new Error(message)
  }
}

/** Prefer public URL; fall back to a 1-year signed URL for private buckets. */
export async function resolveStorageUrl(
  supabase: SupabaseClient,
  bucket: string,
  path: string
): Promise<string> {
  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path)
  if (pub?.publicUrl) {
    // Probe is not required; public buckets return a usable URL immediately.
    return pub.publicUrl
  }

  const { data: signed, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60 * 24 * 365)

  if (error || !signed?.signedUrl) {
    throw new Error(error?.message || 'Could not resolve storage URL after upload')
  }
  return signed.signedUrl
}

/** Replaces Base44 `entities.MediaLibrary.create` — inserts a media_library row. */
export async function insertMediaLibraryRecord(
  supabase: SupabaseClient,
  input: {
    name: string
    filePath: string
    fileUrl: string
    ext: 'mp3' | 'mp4'
    fileSizeBytes: number
    themeId?: string | null
    bucket?: string
  }
): Promise<MediaLibraryItem> {
  const bucket = input.bucket ?? MEDIA_BUCKET
  const insertPayload: Record<string, unknown> = {
    name: input.name,
    file_path: input.filePath,
    file_url: input.fileUrl,
    storage_bucket: bucket,
    file_type: input.ext,
    file_size_bytes: input.fileSizeBytes,
  }
  if (input.themeId) insertPayload.theme_id = input.themeId

  let { data, error: insertError } = await supabase
    .from('media_library')
    .insert(insertPayload)
    .select('*')
    .single()

  if (insertError && /theme_id|schema cache|column/i.test(insertError.message)) {
    delete insertPayload.theme_id
    const retry = await supabase.from('media_library').insert(insertPayload).select('*').single()
    data = retry.data
    insertError = retry.error
  }

  if (insertError) {
    await supabase.storage.from(bucket).remove([input.filePath])
    throw new Error(insertError.message)
  }

  return data as MediaLibraryItem
}
