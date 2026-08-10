'use client'

import { useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import {
  Upload,
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
  type TrackQuotaGate,
  type UploadQueueItem,
} from './hooks/useMediaUploadQueue'
import type { CatalogTheme } from './types'

const SURFACE = 'var(--lg-surface)'
const NEON = 'var(--lg-neon)'

/** File picker + drag-drop accept list */
export const BATCH_FILE_ACCEPT = '.mp3,.mp4,audio/mpeg,video/mp4'

export type MediaUploadDropzoneProps = {
  themes: CatalogTheme[]
  uploadThemeId: string
  onUploadThemeIdChange: (id: string) => void
  onUploaded: () => void
  onError: (message: string) => void
  themeCounts?: Record<string, number>
  trackQuota?: TrackQuotaGate
  quotaLabel?: string
  atQuotaCap?: boolean
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
  trackQuota,
  quotaLabel,
  atQuotaCap,
}: MediaUploadDropzoneProps) {
  const supabase = useMemo(() => createClient(), [])
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const {
    items,
    stats,
    batchStats,
    running,
    enqueueFiles,
    retryItem,
    retryAllFailed,
    clearFinished,
    bucket,
  } = useMediaUploadQueue({
    supabase,
    themes,
    uploadThemeId,
    onBatchComplete: onUploaded,
    onError,
    trackQuota,
  })

  const progressPct =
    batchStats.total > 0
      ? Math.round(((batchStats.completed + batchStats.error) / batchStats.total) * 100)
      : 0

  return (
    <section className="space-y-3 min-w-0">
      {quotaLabel ? (
        <p
          className={`text-xs px-1 tabular-nums ${
            atQuotaCap ? 'text-amber-300 font-medium' : 'text-white/45'
          }`}
        >
          {quotaLabel}
        </p>
      ) : null}
      <div>
        <label
          htmlFor="upload-theme"
          className="block text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-2 px-1"
        >
          Target theme for uploads
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

      <motion.div
        animate={{ scale: isDragging && !running ? 1.01 : 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
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
          if (!running && !atQuotaCap && e.dataTransfer.files.length) {
            void enqueueFiles(Array.from(e.dataTransfer.files))
          }
        }}
        onClick={() => !running && !atQuotaCap && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !running && !atQuotaCap) {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        className={`relative rounded-xl border border-dashed p-8 text-center transition-colors touch-manipulation overflow-hidden min-w-0 ${
          atQuotaCap
            ? 'border-amber-500/30 opacity-70 cursor-not-allowed'
            : 'cursor-pointer'
        } ${
          isDragging
            ? 'lg-upload-drag'
            : 'border-white/10 hover:border-white/20'
        } ${running || atQuotaCap ? 'pointer-events-none opacity-80' : ''}`}
        style={!isDragging && !running ? { backgroundColor: SURFACE } : undefined}
      >
        <input
          ref={inputRef}
          type="file"
          accept={BATCH_FILE_ACCEPT}
          multiple
          className="hidden"
          disabled={running || !!atQuotaCap}
          onChange={(e) => {
            const picked = e.target.files
            if (!picked?.length || atQuotaCap) return
            void enqueueFiles(Array.from(picked))
            e.target.value = ''
          }}
        />
        {running ? (
          <div className="flex flex-col items-center gap-3 text-gray-300 w-full max-w-md mx-auto">
            <Loader2 className="w-10 h-10 animate-spin" style={{ color: NEON }} />
            <p className="text-sm font-medium text-white">
              Uploading {batchStats.completed} of {batchStats.total} file
              {batchStats.total === 1 ? '' : 's'}…
            </p>
            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%`, backgroundColor: NEON }}
              />
            </div>
            <p className="text-[11px] text-white/40">
              Direct upload → {bucket} → songs catalog
            </p>
          </div>
        ) : atQuotaCap ? (
          <>
            <div className="mx-auto w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-300 mb-3">
              <Upload className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-white mb-1">Library limit reached</p>
            <p className="text-xs text-white/40">Upgrade to Pro or Enterprise to upload more tracks.</p>
          </>
        ) : (
          <>
            <div className="mx-auto w-12 h-12 rounded-xl bg-[var(--lg-neon)]/10 flex items-center justify-center text-[var(--lg-neon)] mb-3">
              <Upload className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-white mb-1">
              Drop MP3 / MP4 files or browse
            </p>
            <p className="text-xs text-white/40">
              Up to {MAX_UPLOAD_FILES} files at a time · max {MAX_UPLOAD_MB} MB each
            </p>
          </>
        )}
      </motion.div>

      {items.length > 0 ? (
        <div
          className="rounded-xl border border-white/5 p-3 space-y-2"
          style={{ backgroundColor: SURFACE }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] uppercase tracking-wider text-white/40">
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
                  className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white min-h-9 px-2"
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
                className="flex items-start gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-2 min-h-11"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 truncate">
                    {item.title || item.file.name}
                  </p>
                  {item.error ? (
                    <p className="text-[11px] text-red-300/90 mt-0.5 line-clamp-2">{item.error}</p>
                  ) : item.mediaUrl ? (
                    <p className="text-[11px] text-white/40 truncate mt-0.5">{item.storagePath}</p>
                  ) : (
                    <p className="text-[11px] text-white/40 mt-0.5">
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
        <p className="text-xs flex items-center gap-1.5 text-emerald-400 px-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Uploaded {stats.completed} file{stats.completed === 1 ? '' : 's'} to {MEDIA_BUCKET}.
        </p>
      ) : null}
    </section>
  )
}
