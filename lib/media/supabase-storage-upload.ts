import type { SupabaseClient } from '@supabase/supabase-js'
import type { MediaLibraryItem } from '@/lib/supabase/types'

export const MEDIA_BUCKET = 'media'
export const MAX_UPLOAD_MB = 100

export type ValidMediaFile = {
  ext: 'mp3' | 'mp4'
}

export function validateMediaFile(file: File): ValidMediaFile | { error: string } {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext !== 'mp3' && ext !== 'mp4') {
    return { error: 'Only MP3 and MP4 files are allowed.' }
  }
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    return { error: `File too large. Max ${MAX_UPLOAD_MB} MB.` }
  }
  return { ext }
}

function safeStoragePath(file: File, ext: 'mp3' | 'mp4'): string {
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  return `${ext}/${safeName}`
}

/** Replaces Base44 `integrations.Core.UploadFile` — uploads to Supabase Storage. */
export async function uploadMediaToStorage(
  supabase: SupabaseClient,
  file: File
): Promise<{ path: string; publicUrl: string; ext: 'mp3' | 'mp4' }> {
  const validated = validateMediaFile(file)
  if ('error' in validated) throw new Error(validated.error)

  const path = safeStoragePath(file, validated.ext)
  const { error: uploadError } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
    contentType: file.type || (validated.ext === 'mp3' ? 'audio/mpeg' : 'video/mp4'),
    upsert: false,
  })

  if (uploadError) {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('name', file.name)
    const res = await fetch('/api/media/upload', { method: 'POST', credentials: 'include', body: fd })
    const body = (await res.json()) as { file_url?: string; file_path?: string; error?: string }
    if (!res.ok || !body.file_url) throw new Error(body.error ?? uploadError.message)
    return {
      path: body.file_path ?? path,
      publicUrl: body.file_url,
      ext: validated.ext,
    }
  }

  const { data: urlData } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path)
  return { path, publicUrl: urlData.publicUrl, ext: validated.ext }
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
  }
): Promise<MediaLibraryItem> {
  const insertPayload: Record<string, unknown> = {
    name: input.name,
    file_path: input.filePath,
    file_url: input.fileUrl,
    storage_bucket: MEDIA_BUCKET,
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
    await supabase.storage.from(MEDIA_BUCKET).remove([input.filePath])
    throw new Error(insertError.message)
  }

  return data as MediaLibraryItem
}
