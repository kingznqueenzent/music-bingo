'use client'

import { useMemo, useRef, useState } from 'react'
import {
  UploadCloud,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { MEDIA_BUCKET, MAX_UPLOAD_MB } from '@/lib/media/supabase-storage-upload'
import { ThemeSelect } from './ThemeSelect'
import {
  MAX_UPLOAD_FILES,
  useMediaUploadQueue,
  type UploadQueueItem,
} from './hooks/useMediaUploadQueue'
import type { CatalogTheme } from './types'

const SURFACE = '#1E1E1E'
const NEON = '#00FFFF'

/** File picker + drag-drop accept list */
export const BATCH_FILE_ACCEPT = '.mp3,.mp4,audio/mpeg,video/mp4'

export type MediaUploadDropzoneProps = {
  themes: CatalogTheme[]
  uploadThemeId: string
  onUploadThemeIdChange: (id: string) => void
  onUploaded: () => void
  onError: (message: string) => void
  themeCounts?: Record<string, number>
}

function statusLabel(item: UploadQueueItem): string {
  switch (item.status) {
    case 'pending':
      return 'Pending'
    case 'uploading':
      return 'Uploading…'
    case 'completed':
      return 'Done'
    case 'error':
      return 'Failed'
  }
}

function statusClass(status: UploadQueueItem['status']): string {
  if (status === 'completed') return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
  if (status === 'error') return 'text-red-300 border-red-500/30 bg-red-500/10'
  if (status === 'uploading') return 'text-[#00FFFF] border-[#00FFFF]/30 bg-[#00FFFF]/10'
  return 'text-gray-400 border-white/10 bg-white/5'
}

export function MediaUploadDropzone({
  themes,
  uploadThemeId,
  onUploadThemeIdChange,
  onUploaded,
  onError,
  themeCounts,
}: MediaUploadDropzoneProps) {
  const supabase = useMemo(() => createClient(), [])
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const { items, stats, running, enqueueFiles, retryItem, retryAllFailed, clearFinished, bucket } =
    useMediaUploadQueue({
      supabase,
      themes,
      uploadThemeId,
      onBatchComplete: onUploaded,
      onError,
    })

  const progressPct =
    stats.total > 0 ? Math.round(((stats.completed + stats.error) / stats.total) * 100) : 0

  return (
    <section
      className="rounded-xl border border-white/10 p-3 sm:p-4 space-y-4 overflow-hidden min-w-0"
      style={{ backgroundColor: SURFACE }}
    >
      <div>
        <label
          htmlFor="upload-theme"
          className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2"
        >
          Target Theme for Uploads
        </label>
        <ThemeSelect
          id="upload-theme"
          value={uploadThemeId}
          onChange={onUploadThemeIdChange}
          themes={themes}
          themeCounts={themeCounts}
          emptyLabel="Select theme for incoming tracks…"
          disabled={running}
          aria-label="Target theme for uploads"
        />
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
          if (!running && e.dataTransfer.files.length) {
            void enqueueFiles(Array.from(e.dataTransfer.files))
          }
        }}
        onClick={() => !running && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !running) inputRef.current?.click()
        }}
        className={`relative rounded-xl border-2 border-dashed p-6 sm:p-10 text-center cursor-pointer transition-all touch-manipulation overflow-hidden min-w-0 ${
          isDragging
            ? 'border-[#00FFFF] bg-[#00FFFF]/5'
            : 'border-white/15 hover:border-[#00FFFF]/40 hover:bg-white/[0.02]'
        } ${running ? 'pointer-events-none opacity-70' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={BATCH_FILE_ACCEPT}
          multiple
          className="hidden"
          disabled={running}
          onChange={(e) => {
            const picked = e.target.files
            if (!picked?.length) return
            void enqueueFiles(Array.from(picked))
            e.target.value = ''
          }}
        />
        {running ? (
          <div className="flex flex-col items-center gap-3 text-gray-300 w-full max-w-md mx-auto">
            <Loader2 className="w-10 h-10 animate-spin" style={{ color: NEON }} />
            <p className="text-sm font-semibold text-white">
              Uploading {stats.completed} of {stats.total} file{stats.total === 1 ? '' : 's'}…
            </p>
            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%`, backgroundColor: NEON }}
              />
            </div>
            <p className="text-[11px] text-gray-500">
              Direct upload → {bucket} → songs catalog (ID3 + sanitized paths)
            </p>
          </div>
        ) : (
          <>
            <UploadCloud
              className="w-10 h-10 mx-auto mb-3 text-gray-500"
              style={{ color: isDragging ? NEON : undefined }}
            />
            <p className="text-sm font-semibold text-white">
              Drag &amp; drop or choose multiple MP3 / MP4 files
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Up to {MAX_UPLOAD_FILES} files · max {MAX_UPLOAD_MB} MB each · direct Supabase Storage
            </p>
          </>
        )}
      </div>

      {items.length > 0 ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] uppercase tracking-wider text-gray-500">
              Upload queue · {stats.completed} done
              {stats.error > 0 ? ` · ${stats.error} failed` : ''}
            </p>
            <div className="flex items-center gap-2">
              {stats.error > 0 && !running ? (
                <button
                  type="button"
                  onClick={() => void retryAllFailed()}
                  className="inline-flex items-center gap-1.5 text-xs text-amber-300 hover:text-amber-200 min-h-9 px-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Retry failed
                </button>
              ) : null}
              {stats.completed > 0 && !running ? (
                <button
                  type="button"
                  onClick={clearFinished}
                  className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white min-h-9 px-2"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear done
                </button>
              ) : null}
            </div>
          </div>

          <ul className="max-h-56 overflow-y-auto overscroll-contain space-y-1.5 pr-0.5">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-start gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 min-h-11"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 truncate">
                    {item.title || item.file.name}
                  </p>
                  {item.error ? (
                    <p className="text-[11px] text-red-300/90 mt-0.5 line-clamp-2">{item.error}</p>
                  ) : item.mediaUrl ? (
                    <p className="text-[11px] text-gray-500 truncate mt-0.5">{item.storagePath}</p>
                  ) : (
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {(item.file.size / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  )}
                </div>
                <span
                  className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusClass(item.status)}`}
                >
                  {item.status === 'uploading' ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : item.status === 'completed' ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : item.status === 'error' ? (
                    <AlertCircle className="w-3 h-3" />
                  ) : null}
                  {statusLabel(item)}
                </span>
                {item.status === 'error' && !running ? (
                  <button
                    type="button"
                    onClick={() => void retryItem(item.id)}
                    className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-amber-500/40 px-2 py-1.5 text-[11px] font-semibold text-amber-200 hover:bg-amber-500/10 min-h-9 touch-manipulation"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Retry
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {stats.completed > 0 && !running ? (
        <p className="text-xs flex items-center gap-1.5 text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Uploaded {stats.completed} file{stats.completed === 1 ? '' : 's'} to {MEDIA_BUCKET} and
          songs catalog.
        </p>
      ) : null}
    </section>
  )
}
