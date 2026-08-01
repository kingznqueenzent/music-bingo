'use client'

import { useCallback, useRef, useState } from 'react'
import { UploadCloud, Loader2, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { MEDIA_BUCKET } from '@/lib/media/supabase-storage-upload'
import {
  fetchAutoCategory,
  mapAutoCategoryToFormFields,
} from '@/lib/media/apply-auto-category-to-track'
import { defaultClipDurationSec, probeMediaDuration } from '@/lib/media/probe-media-duration'
import { cleanSongTitle, parseArtistTitle } from '@/lib/songAutoCategorizer'
import type { CatalogTheme, SongInsertPayload } from './types'

const BG = '#121212'
const SURFACE = '#1E1E1E'
const NEON = '#00FFFF'

export const MAX_UPLOAD_FILES = 20
export const MAX_UPLOAD_MB = 100

/** File picker + drag-drop accept list */
export const BATCH_FILE_ACCEPT = '.mp3,.mp4,audio/mpeg,video/mp4'

export type MediaUploadDropzoneProps = {
  themes: CatalogTheme[]
  uploadThemeId: string
  onUploadThemeIdChange: (id: string) => void
  onUploaded: () => void
  onError: (message: string) => void
}

type BatchProgress = {
  done: number
  total: number
  currentName: string | null
}

function titleFromFilename(name: string): string {
  const cleaned = cleanSongTitle(name)
  const parsed = parseArtistTitle(cleaned)
  return parsed.title || cleaned || name.replace(/\.[^.]+$/, '')
}

function isAllowedMediaFile(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'mp3' || ext === 'mp4') return true
  return file.type === 'audio/mpeg' || file.type === 'video/mp4'
}

function normalizeBatchFiles(fileList: FileList | File[]): File[] {
  const raw = Array.from(fileList)
  const allowed = raw.filter(isAllowedMediaFile)
  if (allowed.length < raw.length && allowed.length > 0) {
    // Non-media files skipped silently when some valid files remain
  }
  return allowed.slice(0, MAX_UPLOAD_FILES)
}

export function MediaUploadDropzone({
  themes,
  uploadThemeId,
  onUploadThemeIdChange,
  onUploaded,
  onError,
}: MediaUploadDropzoneProps) {
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<BatchProgress | null>(null)
  const [lastSuccess, setLastSuccess] = useState<string | null>(null)

  const insertSong = useCallback(
    async (payload: SongInsertPayload) => {
      const { error: insertError } = await supabase.from('songs').insert([payload])
      if (insertError) {
        const res = await fetch('/api/songs', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const body = (await res.json()) as { error?: string }
        if (!res.ok) throw new Error(body.error ?? insertError.message)
      }
    },
    [supabase]
  )

  const insertMediaLibraryRow = useCallback(
    async (input: {
      name: string
      filePath: string
      fileUrl: string
      ext: 'mp3' | 'mp4'
      fileSizeBytes: number
      themeId: string | null
    }) => {
      const row: Record<string, unknown> = {
        name: input.name,
        file_path: input.filePath,
        file_url: input.fileUrl,
        storage_bucket: MEDIA_BUCKET,
        file_type: input.ext,
        file_size_bytes: input.fileSizeBytes,
      }
      if (input.themeId) row.theme_id = input.themeId

      const { error } = await supabase.from('media_library').insert(row)
      if (error && !/theme_id|schema cache|column/i.test(error.message)) {
        // media_library is supplementary; songs row is canonical for the catalog
        console.warn('media_library insert skipped:', error.message)
      }
    },
    [supabase]
  )

  const buildPayload = useCallback(
    async (
      file: File,
      mediaUrl: string,
      storagePath: string,
      ext: 'mp3' | 'mp4'
    ): Promise<SongInsertPayload> => {
      const selectedThemeId = uploadThemeId.trim() || null
      let title = titleFromFilename(file.name)
      let artist: string | null = null
      let year: number | null = null
      let themeId = selectedThemeId

      if (!selectedThemeId) {
        const auto = await fetchAutoCategory(file.name)
        if (auto) {
          const filled = mapAutoCategoryToFormFields(auto, themes)
          title = filled.title || title
          artist = filled.artist || null
          year = filled.year || null
          themeId = filled.theme_id || null
        } else {
          artist = parseArtistTitle(cleanSongTitle(file.name)).artist
        }
      } else {
        artist = parseArtistTitle(cleanSongTitle(file.name)).artist
      }

      const fileDurationSec = await probeMediaDuration(file)

      return {
        title,
        artist,
        year,
        theme_id: themeId,
        media_url: mediaUrl,
        storage_path: storagePath,
        media_type: ext === 'mp4' ? 'video' : 'audio',
        start_time_sec: 0,
        duration_sec: defaultClipDurationSec(fileDurationSec),
        file_duration_sec: fileDurationSec,
      }
    },
    [themes, uploadThemeId]
  )

  const uploadSingleFile = useCallback(
    async (file: File): Promise<void> => {
      const ext = file.name.split('.').pop()?.toLowerCase() as 'mp3' | 'mp4'
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const storagePath = `${ext}/${safeName}`

      const { error: uploadError } = await supabase.storage.from(MEDIA_BUCKET).upload(storagePath, file, {
        contentType: file.type || (ext === 'mp3' ? 'audio/mpeg' : 'video/mp4'),
        upsert: false,
      })

      let mediaUrl: string
      let finalPath = storagePath
      if (uploadError) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('name', titleFromFilename(file.name))
        const res = await fetch('/api/media/upload', { method: 'POST', credentials: 'include', body: fd })
        const body = (await res.json()) as { file_url?: string; file_path?: string; error?: string }
        if (!res.ok || !body.file_url) throw new Error(body.error ?? uploadError.message)
        mediaUrl = body.file_url
        finalPath = body.file_path ?? storagePath
      } else {
        mediaUrl = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(storagePath).data.publicUrl
      }

      const payload = await buildPayload(file, mediaUrl, finalPath, ext)
      await insertMediaLibraryRow({
        name: file.name,
        filePath: finalPath,
        fileUrl: mediaUrl,
        ext,
        fileSizeBytes: file.size,
        themeId: payload.theme_id,
      })
      await insertSong(payload)
    },
    [supabase, buildPayload, insertMediaLibraryRow, insertSong]
  )

  const uploadFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const rawCount = Array.from(fileList).length
      const files = normalizeBatchFiles(fileList)

      if (files.length === 0) {
        onError('Select or drop MP3 / MP4 files only.')
        return
      }
      if (rawCount > MAX_UPLOAD_FILES) {
        onError(`Only the first ${MAX_UPLOAD_FILES} files will be uploaded.`)
      }

      for (const f of files) {
        if (f.size > MAX_UPLOAD_MB * 1024 * 1024) {
          onError(`${f.name} exceeds ${MAX_UPLOAD_MB} MB limit.`)
          return
        }
      }

      setUploading(true)
      setProgress({ done: 0, total: files.length, currentName: files[0]?.name ?? null })
      setLastSuccess(null)
      onError('')

      let uploaded = 0
      const failures: string[] = []

      for (const file of files) {
        setProgress({ done: uploaded, total: files.length, currentName: file.name })
        try {
          await uploadSingleFile(file)
          uploaded += 1
          setProgress({ done: uploaded, total: files.length, currentName: file.name })
        } catch (e) {
          failures.push(`${file.name}: ${e instanceof Error ? e.message : 'Upload failed'}`)
        }
      }

      setUploading(false)
      setProgress(null)

      if (uploaded > 0) {
        setLastSuccess(
          `Uploaded ${uploaded} of ${files.length} file${files.length === 1 ? '' : 's'} to Storage, media_library, and songs.`
        )
        onUploaded()
      }

      if (failures.length > 0) {
        onError(
          failures.length === files.length
            ? failures[0]
            : `${failures.length} file(s) failed. First error: ${failures[0]}`
        )
      }
    },
    [uploadSingleFile, onUploaded, onError]
  )

  const progressPct =
    progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <section className="rounded-xl border border-white/10 p-4 space-y-4" style={{ backgroundColor: SURFACE }}>
      <div>
        <label htmlFor="upload-theme" className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Theme / genre for this batch
        </label>
        <select
          id="upload-theme"
          value={uploadThemeId}
          onChange={(e) => onUploadThemeIdChange(e.target.value)}
          disabled={uploading}
          className="mt-1 w-full border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-[#00FFFF] outline-none text-gray-300"
          style={{ backgroundColor: BG }}
        >
          <option value="">— Auto-tag from filename —</option>
          {themes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div
        role="button"
        tabIndex={0}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          if (!uploading && e.dataTransfer.files.length) {
            void uploadFiles(Array.from(e.dataTransfer.files))
          }
        }}
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
        }}
        className={`relative rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-all ${
          isDragging ? 'border-[#00FFFF] bg-[#00FFFF]/5' : 'border-white/15 hover:border-[#00FFFF]/40 hover:bg-white/[0.02]'
        } ${uploading ? 'pointer-events-none opacity-70' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={BATCH_FILE_ACCEPT}
          multiple
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            const picked = e.target.files
            if (!picked?.length) return
            void uploadFiles(Array.from(picked))
            e.target.value = ''
          }}
        />
        {uploading && progress ? (
          <div className="flex flex-col items-center gap-3 text-gray-300 w-full max-w-md mx-auto">
            <Loader2 className="w-10 h-10 animate-spin" style={{ color: NEON }} />
            <p className="text-sm font-semibold text-white">
              Uploading {progress.done} of {progress.total} file{progress.total === 1 ? '' : 's'}…
            </p>
            {progress.currentName ? (
              <p className="text-xs text-gray-500 truncate max-w-full">{progress.currentName}</p>
            ) : null}
            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%`, backgroundColor: NEON }}
              />
            </div>
            <p className="text-[11px] text-gray-500">
              Storage ({MEDIA_BUCKET}) → media_library → songs catalog
            </p>
          </div>
        ) : (
          <>
            <UploadCloud className="w-10 h-10 mx-auto mb-3 text-gray-500" style={{ color: isDragging ? NEON : undefined }} />
            <p className="text-sm font-semibold text-white">Drag &amp; drop or choose multiple MP3 / MP4 files</p>
            <p className="text-xs text-gray-500 mt-1">
              Batch select up to {MAX_UPLOAD_FILES} files · max {MAX_UPLOAD_MB} MB each
            </p>
          </>
        )}
      </div>

      {lastSuccess ? (
        <p className="text-xs flex items-center gap-1.5 text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {lastSuccess}
        </p>
      ) : null}
    </section>
  )
}
