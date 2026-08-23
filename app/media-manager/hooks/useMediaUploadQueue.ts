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

/** Empty string in UI = "Select Genre" / Untagged. */
export const UPLOAD_GENRE_UNTAGGED = ''

export type TrackQuotaGate = {
  tier: GameTier
  catalogCount: number
  onQuotaBlocked: (message: string) => void
}

export type UploadItemStatus = 'staged' | 'pending' | 'uploading' | 'completed' | 'error'

export type UploadQueueItem = {
  id: string
  file: File
  status: UploadItemStatus
  error: string | null
  mediaUrl: string | null
  storagePath: string | null
  title: string | null
  artist: string | null
  /** Library genre label, or '' for Select Genre / Untagged. */
  genre: string
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

/**
 * Build songs insert payload. `itemGenre` is the host's per-file picker value
 * ('' = Untagged / leave null unless auto-detect finds something when no explicit pick).
 */
async function buildSongPayload(
  file: File,
  mediaUrl: string,
  storagePath: string,
  ext: 'mp3' | 'mp4',
  uploadThemeId: string,
  itemGenre: string,
  themes: ThemeLike[]
): Promise<SongInsertPayload> {
  const selectedThemeId = uploadThemeId.trim() || null
  const picked =
    itemGenre.trim() && itemGenre !== 'auto'
      ? normalizeGenreLabel(itemGenre)
      : null
  const meta = await extractMediaMetadata(file)
  let title = meta.title
  let artist = meta.artist
  let year = meta.year
  let themeId = selectedThemeId

  // Explicit picker wins; otherwise ID3 / filename detect; empty picker → null (Untagged).
  let genre: string | null = null
  if (picked && picked !== 'Other') {
    genre = picked
  } else if (picked === 'Other') {
    genre = 'Other'
  } else if (!itemGenre.trim()) {
    // Select Genre / Untagged — keep null unless we later infer from theme only for routing.
    genre = null
  } else {
    genre =
      meta.genre && meta.genre !== 'Other'
        ? meta.genre
        : detectGenreFromText(file.name, meta.title, meta.artist)
  }

  if (!selectedThemeId) {
    const auto = await fetchAutoCategory(file.name)
    if (auto) {
      const filled = mapAutoCategoryToFormFields(auto, themes)
      if (!meta.fromTags || !title) title = filled.title || title
      if (!artist) artist = filled.artist || null
      if (!year) year = filled.year || null
      themeId = filled.theme_id || null
      if (!genre && itemGenre.trim() && filled.theme_name) {
        genre = inferGenreFromThemeName(filled.theme_name)
      }
    }
  } else if (!genre && itemGenre.trim()) {
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

  // Persist null for Untagged (missing genre), not forced "Other".
  if (genre === 'Other' && !itemGenre.trim()) genre = null

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
 * Staged preview → Start Upload → per-file upload queue with genre override.
 */
export function useMediaUploadQueue({
  supabase,
  themes,
  uploadThemeId,
  onBatchComplete,
  onError,
  trackQuota,
}: {
  supabase: SupabaseClient
  themes: ThemeLike[]
  uploadThemeId: string
  onBatchComplete: () => void
  onError: (message: string) => void
  trackQuota?: TrackQuotaGate
}) {
  const [items, setItems] = useState<UploadQueueItem[]>([])
  const [running, setRunning] = useState(false)
  const [activeBatchIds, setActiveBatchIds] = useState<string[]>([])
  const itemsRef = useRef(items)
  itemsRef.current = items
  const themeIdRef = useRef(uploadThemeId)
  themeIdRef.current = uploadThemeId
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
          item.genre,
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
          artist: payload.artist,
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

  /** Parse ID3 and stage files for preview — does not upload yet. */
  const enqueueFiles = useCallback(
    async (fileList: FileList | File[]) => {
      if (running) {
        onError('Wait for the current upload to finish.')
        return
      }

      const raw = Array.from(fileList)
      const existingStaged = itemsRef.current.filter((it) => it.status === 'staged').length
      const room = Math.max(0, MAX_UPLOAD_FILES - existingStaged)
      const next: UploadQueueItem[] = []
      const rejected: string[] = []

      for (const file of raw.slice(0, room || MAX_UPLOAD_FILES)) {
        const validated = validateMediaFile(file)
        if ('error' in validated) {
          rejected.push(`${file.name}: ${validated.error}`)
          continue
        }
        if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
          rejected.push(`${file.name}: exceeds ${MAX_UPLOAD_MB} MB`)
          continue
        }

        let title: string | null = file.name.replace(/\.[^.]+$/, '')
        let artist: string | null = null
        let genre = UPLOAD_GENRE_UNTAGGED
        try {
          const meta = await extractMediaMetadata(file)
          title = meta.title || title
          artist = meta.artist
          if (meta.genre && meta.genre !== 'Other') {
            genre = meta.genre
          } else {
            const detected = detectGenreFromText(file.name, meta.title, meta.artist)
            genre = detected ?? UPLOAD_GENRE_UNTAGGED
          }
        } catch {
          // Filename-only fallback already set
        }

        next.push({
          id: newItemId(),
          file,
          status: 'staged',
          error: null,
          mediaUrl: null,
          storagePath: null,
          title,
          artist,
          genre,
        })
      }

      if (raw.length > room && room > 0) {
        onError(`Only ${room} more file(s) can be staged (max ${MAX_UPLOAD_FILES}).`)
      } else if (raw.length > MAX_UPLOAD_FILES && room === 0) {
        onError(`Upload preview is full (max ${MAX_UPLOAD_FILES} files).`)
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
        const stagedCount =
          itemsRef.current.filter((it) => it.status === 'staged').length + next.length
        const gate = checkTrackQuota(quota.tier, effectiveCatalogCountRef.current, stagedCount)
        if (!gate.allowed) {
          quota.onQuotaBlocked(gate.reason)
          onError(gate.reason)
          return
        }
      }

      setItems((prev) => {
        const merged = [...prev, ...next]
        itemsRef.current = merged
        return merged
      })
    },
    [running, onError]
  )

  const setItemGenre = useCallback((id: string, genre: string) => {
    patchItem(id, { genre })
  }, [patchItem])

  const removeStagedItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => !(it.id === id && it.status === 'staged')))
  }, [])

  const clearStaged = useCallback(() => {
    setItems((prev) => prev.filter((it) => it.status !== 'staged'))
  }, [])

  const startUpload = useCallback(async () => {
    if (running) return
    const staged = itemsRef.current.filter((it) => it.status === 'staged')
    if (staged.length === 0) {
      onError('Add files to the preview before starting upload.')
      return
    }

    const quota = trackQuotaRef.current
    if (quota) {
      const gate = checkTrackQuota(quota.tier, effectiveCatalogCountRef.current, staged.length)
      if (!gate.allowed) {
        quota.onQuotaBlocked(gate.reason)
        onError(gate.reason)
        return
      }
    }

    const batchIds = staged.map((it) => it.id)
    setActiveBatchIds(batchIds)
    setItems((prev) =>
      prev.map((it) =>
        batchIds.includes(it.id) ? { ...it, status: 'pending' as const, error: null } : it
      )
    )
    setRunning(true)
    onError('')

    let anyOk = false
    let failCount = 0
    try {
      for (const id of batchIds) {
        const item = itemsRef.current.find((it) => it.id === id)
        if (!item) continue
        const ok = await processItem({ ...item, status: 'pending', error: null })
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
        failCount === staged.length
          ? `All ${failCount} upload(s) failed.${detail}`
          : `${failCount} of ${staged.length} upload(s) failed.${detail}`
      )
    } else if (anyOk) {
      onError('')
    }

    if (anyOk) onBatchComplete()
  }, [running, onError, onBatchComplete, processItem])

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
    const staged = items.filter((i) => i.status === 'staged').length
    const pending = items.filter((i) => i.status === 'pending').length
    const uploading = items.filter((i) => i.status === 'uploading').length
    const completed = items.filter((i) => i.status === 'completed').length
    const error = items.filter((i) => i.status === 'error').length
    return { staged, pending, uploading, completed, error, total: items.length }
  }, [items])

  const batchStats = useMemo(() => {
    const idSet = new Set(activeBatchIds)
    const batch = idSet.size > 0 ? items.filter((i) => idSet.has(i.id)) : items.filter((i) => i.status !== 'staged')
    const pending = batch.filter((i) => i.status === 'pending').length
    const uploading = batch.filter((i) => i.status === 'uploading').length
    const completed = batch.filter((i) => i.status === 'completed').length
    const error = batch.filter((i) => i.status === 'error').length
    return { pending, uploading, completed, error, total: batch.length }
  }, [items, activeBatchIds])

  const stagedItems = useMemo(
    () => items.filter((i) => i.status === 'staged'),
    [items]
  )

  return {
    items,
    stagedItems,
    stats,
    batchStats,
    running,
    enqueueFiles,
    startUpload,
    setItemGenre,
    removeStagedItem,
    clearStaged,
    retryItem,
    retryAllFailed,
    clearFinished,
    bucket: MEDIA_BUCKET,
  }
}
