import type { SupabaseClient } from '@supabase/supabase-js'
import { sanitizeStorageSegment } from '@/lib/media/sanitize-storage-filename'
import { resolveStorageUrl } from '@/lib/media/supabase-storage-upload'

export const SFX_BUCKET =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SFX_BUCKET?.trim()) || 'sfx-assets'

export const MAX_SFX_UPLOAD_MB = 10

export type SfxFileType = 'mp3' | 'wav'

export function sfxStorageExtension(fileName: string): SfxFileType | null {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (ext === 'mp3' || ext === 'wav') return ext
  return null
}

export function validateSfxFile(file: File): { ext: SfxFileType } | { error: string } {
  const ext = sfxStorageExtension(file.name)
  if (!ext) return { error: 'Only MP3 and WAV files are allowed.' }
  if (file.size > MAX_SFX_UPLOAD_MB * 1024 * 1024) {
    return { error: `File too large. Max ${MAX_SFX_UPLOAD_MB} MB.` }
  }
  return { ext }
}

/** Host-scoped path: `{gameId}/{ext}/{timestamp}-{slug}.{ext}` */
export function buildSfxStoragePath(gameId: string, fileName: string, ext: SfxFileType): string {
  const slug = sanitizeStorageSegment(fileName)
  const stamp = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 8)
  return `${gameId}/${ext}/${stamp}-${rand}-${slug}.${ext}`
}

export async function uploadSfxToStorage(
  supabase: SupabaseClient,
  gameId: string,
  file: File
): Promise<{ path: string; publicUrl: string; ext: SfxFileType; bucket: string }> {
  const validated = validateSfxFile(file)
  if ('error' in validated) throw new Error(validated.error)

  const bucket = SFX_BUCKET
  const path = buildSfxStoragePath(gameId, file.name, validated.ext)
  const contentType =
    file.type ||
    (validated.ext === 'mp3' ? 'audio/mpeg' : 'audio/wav')

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
    contentType,
    upsert: false,
    cacheControl: '3600',
  })

  if (uploadError) throw new Error(uploadError.message || 'Storage upload failed')

  const publicUrl = await resolveStorageUrl(supabase, bucket, path)
  return { path, publicUrl, ext: validated.ext, bucket }
}
