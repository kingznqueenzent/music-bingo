'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  MEDIA_BUCKET,
  MAX_UPLOAD_MB,
  uploadMediaToStorage,
  validateMediaFile,
} from '@/lib/media/supabase-storage-upload'
import { extractMediaMetadata } from '@/lib/media/extract-media-metadata'
import {
  fetchAutoCategory,
  mapAutoCategoryToFormFields,
} from '@/lib/media/apply-auto-category-to-track'
import {
  detectGenreFromText,
  inferGenreFromThemeName,
  libraryGenreToThemeGenre,
  normalizeGenreLabel,
  type LibraryGenre,
} from '@/lib/media/detect-genre'
import { defaultClipDurationSec, probeMediaDuration } from '@/lib/media/probe-media-duration'
import type { GameTier } from '@/lib/tiers'
import {
  checkTrackQuota,
  MEDIA_LIBRARY_REQUIRES_PRO_CODE,
  TRACK_QUOTA_EXCEEDED_CODE,
} from '@/lib/media/track-quota'
import type { CatalogTheme, SongInsertPayload } from '../types'

export const MAX_UPLOAD_FILES = 20

export type TrackQuotaGate = {
  tier: GameTier
  catalogCount: number
  onQuotaBlocked: (message: string) => void
}

export type UploadItemStatus = 'pending' | 'uploading' | 'completed' | 'error'

export type UploadQueueItem = {
  id: string
  file: File
  status: UploadItemStatus
  error: string | null
  mediaUrl: string | null
  storagePath: string | null
  title: string | null
}

type ThemeLike = Pick<CatalogTheme, 'id' | 'name'>

function newItemId(): string {
  return `up-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

async function insertSongRow(
  supabase: SupabaseClient,
  payload: SongInsertPayload
): Promise<void> {
  const res = await fetch('/api/songs', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const body = (await res.json()) as { error?: string; code?: string }
  if (res.ok) return
  if (res.status === 403 && (body.code === MEDIA_LIBRARY_REQUIRES_PRO_CODE || body.code === TRACK_QUOTA_EXCEEDED_CODE)) {
    throw new Error(body.error ?? 'Media Library requires Pro+.')
  }

  const { error: insertError } = await supabase.from('songs').insert([payload])
  if (!insertError) return

  // Pre-migration: songs.genre may not exist yet.
  if (payload.genre != null && /genre|column|schema cache/i.test(insertError.message)) {
    const { genre: _genre, ...withoutGenre } = payload
    const retry = await supabase.from('songs').insert([withoutGenre])
    if (!retry.error) return
    if (!res.ok) throw new Error(body.error ?? retry.error.message)
    throw new Error(retry.error.message)
  }

  if (!res.ok) throw new Error(body.error ?? insertError.message)
  throw new Error(insertError.message)
}

async function insertMediaLibraryBestEffort(
  supabase: SupabaseClient,
  input: {
    name: string
    filePath: string
    fileUrl: string
    ext: 'mp3' | 'mp4'
    fileSizeBytes: number
    themeId: string | null
    bucket: string
  }
): Promise<void> {
  const row: Record<string, unknown> = {
    name: input.name,
    file_path: input.filePath,
    file_url: input.fileUrl,
    storage_bucket: input.bucket,
    file_type: input.ext,
    file_size_bytes: input.fileSizeBytes,
  }
  if (input.themeId) row.theme_id = input.themeId

  const { error } = await supabase.from('media_library').insert(row)
  if (error && !/theme_id|schema cache|column/i.test(error.message)) {
    console.warn('media_library insert skipped:', error.message)
  }
}

async function buildSongPayload(
  file: File,
  mediaUrl: string,
  storagePath: string,
  ext: 'mp3' | 'mp4',
  uploadThemeId: string,
  uploadGenre: string,
  themes: ThemeLike[]
): Promise<SongInsertPayload> {
  const selectedThemeId = uploadThemeId.trim() || null
  const selectedGenre =
    uploadGenre.trim() && uploadGenre !== 'auto'
      ? normalizeGenreLabel(uploadGenre)
      : null
  const meta = await extractMediaMetadata(file)
  let title = meta.title
  let artist = meta.artist
  let year = meta.year
  let themeId = selectedThemeId
  let genre: string | null =
    selectedGenre && selectedGenre !== 'Other'
      ? selectedGenre
      : meta.genre && meta.genre !== 'Other'
        ? meta.genre
        : detectGenreFromText(file.name, meta.title, meta.artist)

  if (!selectedThemeId) {
    const auto = await fetchAutoCategory(file.name)
    if (auto) {
      const filled = mapAutoCategoryToFormFields(auto, themes)
      if (!meta.fromTags || !title) title = filled.title || title
      if (!artist) artist = filled.artist || null
      if (!year) year = filled.year || null
      themeId = filled.theme_id || null
      if (!genre && filled.theme_name) {
        genre = inferGenreFromThemeName(filled.theme_name)
      }
    }
  } else if (!genre) {
    const themeName = themes.find((t) => t.id === selectedThemeId)?.name
    genre = inferGenreFromThemeName(themeName)
  }

  // When host picked a genre but no theme, try to land on a matching decade theme.
  if (!themeId && genre && genre !== 'Other' && year) {
    const auto = await fetchAutoCategory(
      `${file.name} ${libraryGenreToThemeGenre(genre as LibraryGenre)}`
    )
    if (auto) {
      const filled = mapAutoCategoryToFormFields(auto, themes)
      themeId = filled.theme_id || null
    }
  }

  if (!genre) genre = 'Other'

  const fileDurationSec = await probeMediaDuration(file)

  return {
    title,
    artist,
    year,
    theme_id: themeId,
    genre,
    media_url: mediaUrl,
    storage_path: storagePath,
    media_type: ext === 'mp4' ? 'video' : 'audio',
    start_time_sec: 0,
    duration_sec: defaultClipDurationSec(fileDurationSec),
    file_duration_sec: fileDurationSec,
  }
}

/**
 * Per-file upload queue: pending → uploading → completed | error, with single-file retry.
 * Storage upload is direct via Supabase JS; songs insert follows immediately after.
 */
export function useMediaUploadQueue({
  supabase,
  themes,
  uploadThemeId,
  uploadGenre = 'auto',
  onBatchComplete,
  onError,
  trackQuota,
}: {
  supabase: SupabaseClient
  themes: ThemeLike[]
  uploadThemeId: string
  /** `auto` = detect from metadata/filename; otherwise a library genre label. */
  uploadGenre?: string
  onBatchComplete: () => void
  onError: (message: string) => void
  trackQuota?: TrackQuotaGate
}) {
  const [items, setItems] = useState<UploadQueueItem[]>([])
  const [running, setRunning] = useState(false)
  /** Ids in the active batch — progress UI ignores leftover completed/error rows. */
  const [activeBatchIds, setActiveBatchIds] = useState<string[]>([])
  const itemsRef = useRef(items)
  itemsRef.current = items
  const themeIdRef = useRef(uploadThemeId)
  themeIdRef.current = uploadThemeId
  const genreRef = useRef(uploadGenre)
  genreRef.current = uploadGenre
  const themesRef = useRef(themes)
  themesRef.current = themes
  const trackQuotaRef = useRef(trackQuota)
  trackQuotaRef.current = trackQuota
  const effectiveCatalogCountRef = useRef(trackQuota?.catalogCount ?? 0)
  useEffect(() => {
    if (trackQuota) effectiveCatalogCountRef.current = trackQuota.catalogCount
  }, [trackQuota?.catalogCount])

  const patchItem = useCallback((id: string, patch: Partial<UploadQueueItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  }, [])

  const processItem = useCallback(
    async (item: UploadQueueItem): Promise<boolean> => {
      const validated = validateMediaFile(item.file)
      if ('error' in validated) {
        patchItem(item.id, { status: 'error', error: validated.error })
        return false
      }

      const quota = trackQuotaRef.current
      if (quota) {
        const gate = checkTrackQuota(quota.tier, effectiveCatalogCountRef.current, 1)
        if (!gate.allowed) {
          quota.onQuotaBlocked(gate.reason)
          patchItem(item.id, { status: 'error', error: gate.reason })
          return false
        }
      }

      patchItem(item.id, { status: 'uploading', error: null })

      let uploadedPath: string | null = null
      let uploadedBucket = MEDIA_BUCKET
      try {
        const uploaded = await uploadMediaToStorage(supabase, item.file)
        uploadedPath = uploaded.path
        uploadedBucket = uploaded.bucket

        const payload = await buildSongPayload(
          item.file,
          uploaded.publicUrl,
          uploaded.path,
          uploaded.ext,
          themeIdRef.current,
          genreRef.current,
          themesRef.current
        )

        await insertMediaLibraryBestEffort(supabase, {
          name: item.file.name,
          filePath: uploaded.path,
          fileUrl: uploaded.publicUrl,
          ext: uploaded.ext,
          fileSizeBytes: item.file.size,
          themeId: payload.theme_id,
          bucket: uploaded.bucket,
        })

        // Catalog row immediately after storage; roll back object if DB insert fails
        try {
          await insertSongRow(supabase, payload)
        } catch (dbErr) {
          await supabase.storage.from(uploaded.bucket).remove([uploaded.path])
          throw dbErr
        }

        patchItem(item.id, {
          status: 'completed',
          error: null,
          mediaUrl: uploaded.publicUrl,
          storagePath: uploaded.path,
          title: payload.title,
        })
        effectiveCatalogCountRef.current += 1
        return true
      } catch (e) {
        if (uploadedPath) {
          await supabase.storage
            .from(uploadedBucket)
            .remove([uploadedPath])
            .catch(() => undefined)
        }
        patchItem(item.id, {
          status: 'error',
          error: e instanceof Error ? e.message : 'Upload failed',
        })
        return false
      }
    },
    [supabase, patchItem]
  )

  const enqueueFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const raw = Array.from(fileList)
      const next: UploadQueueItem[] = []
      const rejected: string[] = []

      for (const file of raw.slice(0, MAX_UPLOAD_FILES)) {
        const validated = validateMediaFile(file)
        if ('error' in validated) {
          rejected.push(`${file.name}: ${validated.error}`)
          continue
        }
        if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
          rejected.push(`${file.name}: exceeds ${MAX_UPLOAD_MB} MB`)
          continue
        }
        next.push({
          id: newItemId(),
          file,
          status: 'pending',
          error: null,
          mediaUrl: null,
          storagePath: null,
          title: null,
        })
      }

      if (raw.length > MAX_UPLOAD_FILES) {
        onError(`Only the first ${MAX_UPLOAD_FILES} files were queued.`)
      } else if (rejected.length > 0 && next.length === 0) {
        onError(rejected[0])
        return
      } else if (rejected.length > 0) {
        onError(`${rejected.length} file(s) skipped. ${rejected[0]}`)
      } else {
        onError('')
      }

      if (next.length === 0) return

      const quota = trackQuotaRef.current
      if (quota) {
        const gate = checkTrackQuota(quota.tier, effectiveCatalogCountRef.current, next.length)
        if (!gate.allowed) {
          quota.onQuotaBlocked(gate.reason)
          onError(gate.reason)
          return
        }
      }

      const batchIds = next.map((it) => it.id)
      setActiveBatchIds(batchIds)
      setItems((prev) => {
        const keep = prev.filter((it) => it.status === 'error' || it.status === 'completed')
        const merged = [...keep, ...next]
        itemsRef.current = merged
        return merged
      })
      setRunning(true)

      let anyOk = false
      let failCount = 0
      try {
        for (const item of next) {
          const ok = await processItem(item)
          if (ok) anyOk = true
          else failCount += 1
        }
      } finally {
        setRunning(false)
      }

      if (failCount > 0) {
        const firstFailed = itemsRef.current.find(
          (it) => batchIds.includes(it.id) && it.status === 'error'
        )
        const detail = firstFailed?.error ? ` ${firstFailed.error}` : ''
        onError(
          failCount === next.length
            ? `All ${failCount} upload(s) failed.${detail}`
            : `${failCount} of ${next.length} upload(s) failed.${detail}`
        )
      } else if (anyOk) {
        onError('')
      }

      if (anyOk) onBatchComplete()
    },
    [onError, onBatchComplete, processItem]
  )

  const retryItem = useCallback(
    async (id: string) => {
      const item = itemsRef.current.find((it) => it.id === id)
      if (!item || item.status !== 'error') return
      if (running) {
        onError('Wait for the current batch to finish, then retry.')
        return
      }

      setRunning(true)
      onError('')
      const pending = { ...item, status: 'pending' as const, error: null }
      patchItem(id, { status: 'pending', error: null })
      let ok = false
      try {
        ok = await processItem(pending)
      } finally {
        setRunning(false)
      }
      if (!ok) {
        const err =
          itemsRef.current.find((it) => it.id === id)?.error ?? 'Upload failed'
        onError(err)
        return
      }
      onBatchComplete()
    },
    [running, onError, onBatchComplete, patchItem, processItem]
  )

  const retryAllFailed = useCallback(async () => {
    const failed = itemsRef.current.filter((it) => it.status === 'error')
    if (failed.length === 0 || running) return
    setRunning(true)
    onError('')
    let anyOk = false
    let failCount = 0
    try {
      for (const item of failed) {
        const pending = { ...item, status: 'pending' as const, error: null }
        patchItem(item.id, { status: 'pending', error: null })
        const ok = await processItem(pending)
        if (ok) anyOk = true
        else failCount += 1
      }
    } finally {
      setRunning(false)
    }
    if (failCount > 0) {
      onError(`${failCount} retry(ies) still failed. Check the queue for details.`)
    }
    if (anyOk) onBatchComplete()
  }, [running, onError, onBatchComplete, patchItem, processItem])

  const clearFinished = useCallback(() => {
    setItems((prev) => prev.filter((it) => it.status !== 'completed'))
  }, [])

  const stats = useMemo(() => {
    const pending = items.filter((i) => i.status === 'pending').length
    const uploading = items.filter((i) => i.status === 'uploading').length
    const completed = items.filter((i) => i.status === 'completed').length
    const error = items.filter((i) => i.status === 'error').length
    return { pending, uploading, completed, error, total: items.length }
  }, [items])

  const batchStats = useMemo(() => {
    const idSet = new Set(activeBatchIds)
    const batch = idSet.size > 0 ? items.filter((i) => idSet.has(i.id)) : items
    const pending = batch.filter((i) => i.status === 'pending').length
    const uploading = batch.filter((i) => i.status === 'uploading').length
    const completed = batch.filter((i) => i.status === 'completed').length
    const error = batch.filter((i) => i.status === 'error').length
    return { pending, uploading, completed, error, total: batch.length }
  }, [items, activeBatchIds])

  return {
    items,
    stats,
    batchStats,
    running,
    enqueueFiles,
    retryItem,
    retryAllFailed,
    clearFinished,
    bucket: MEDIA_BUCKET,
  }
}
