import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  MEDIA_BUCKET,
  MAX_UPLOAD_MB,
  resolveMediaContentType,
} from '@/lib/media/supabase-storage-upload'
import { buildSanitizedStoragePath, storageExtension } from '@/lib/media/sanitize-storage-filename'

/** Prefer client direct-to-Supabase uploads; this route is one-file-per-request fallback. */
export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_SIZE = MAX_UPLOAD_MB * 1024 * 1024

function jsonError(message: string, status: number, extra?: Record<string, unknown>) {
  console.error('[api/media/upload]', message, extra ?? '')
  return NextResponse.json({ error: message, ...extra }, { status })
}

/**
 * Single-file upload via Next.js → Supabase Storage (`media` bucket).
 * Batch uploads should use the Media Manager client queue (direct storage), not this route,
 * to avoid Vercel request-body size limits.
 */
export async function POST(request: NextRequest) {
  let uploadedPath: string | null = null

  try {
    let formData: FormData
    try {
      formData = await request.formData()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return jsonError(
        `Could not read upload body (file may exceed platform limit). Prefer direct client upload. ${msg}`,
        413
      )
    }

    const file = formData.get('file')
    if (!(file instanceof File) || file.size === 0) {
      return jsonError('No file provided. Send a single file field named "file".', 400)
    }

    // Reject multi-file payloads early — one file per request.
    const allFiles = formData.getAll('file').filter((v): v is File => v instanceof File)
    if (allFiles.length > 1) {
      return jsonError('Only one file per request is supported. Upload sequentially.', 400)
    }

    const name = (formData.get('name') as string)?.trim() || file.name
    const ext = storageExtension(file.name)
    if (!ext) {
      return jsonError('Only MP3 and MP4 files are allowed.', 400)
    }
    if (file.size > MAX_SIZE) {
      return jsonError(`File too large (max ${MAX_UPLOAD_MB} MB).`, 400)
    }

    const supabase = createClient()
    const path = buildSanitizedStoragePath(file.name, ext)
    const contentType = resolveMediaContentType(file, ext)
    uploadedPath = path

    console.info('[api/media/upload] uploading', {
      name: file.name,
      size: file.size,
      contentType,
      path,
      bucket: MEDIA_BUCKET,
    })

    const buf = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await supabase.storage.from(MEDIA_BUCKET).upload(path, buf, {
      contentType,
      upsert: false,
      cacheControl: '3600',
    })

    if (uploadError) {
      uploadedPath = null
      return jsonError(uploadError.message || 'Storage upload failed', 500, {
        code: 'storage_upload_failed',
        bucket: MEDIA_BUCKET,
      })
    }

    const { data: urlData } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path)
    const fileUrl = urlData.publicUrl

    const { data: row, error: insertError } = await supabase
      .from('media_library')
      .insert({
        name,
        file_path: path,
        file_url: fileUrl,
        storage_bucket: MEDIA_BUCKET,
        file_type: ext,
        file_size_bytes: file.size,
      })
      .select('id, name, file_path, file_url, file_type, created_at')
      .single()

    if (insertError) {
      await supabase.storage.from(MEDIA_BUCKET).remove([path]).catch((err) => {
        console.error('[api/media/upload] rollback remove failed', err)
      })
      uploadedPath = null
      return jsonError(insertError.message || 'Database insert failed', 500, {
        code: 'media_library_insert_failed',
      })
    }

    return NextResponse.json({
      ...row,
      file_url: fileUrl,
      storage_bucket: MEDIA_BUCKET,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[api/media/upload] unhandled', e)
    if (uploadedPath) {
      try {
        const supabase = createClient()
        await supabase.storage.from(MEDIA_BUCKET).remove([uploadedPath])
      } catch (rollbackErr) {
        console.error('[api/media/upload] rollback after crash failed', rollbackErr)
      }
    }
    return jsonError(msg || 'Upload failed', 500)
  }
}
