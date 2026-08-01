'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  backfillMissingTrackGenres,
  dedupeLibraryTracks,
  importLibraryTrackLines,
  loadLibraryTracks,
  syncMediaLibraryToTracks,
  type BingoTrackLibraryRow,
} from '@/lib/media/bingo-track-library'
import { insertMediaLibraryRecord, uploadMediaToStorage } from '@/lib/media/supabase-storage-upload'
import { sortThemesChronologicalThenGenre } from '@/lib/sort-themes'
import type { Era, Genre, Theme } from '@/lib/supabase/types'
import type { MediaLibraryItem } from '@/lib/supabase/types'
import type { ThemeOption, TrackUpdatePayload } from '../types'

export function useBingoTrackLibrary() {
  const supabase = useMemo(() => createClient(), [])
  const [tracks, setTracks] = useState<BingoTrackLibraryRow[]>([])
  const [mediaItems, setMediaItems] = useState<MediaLibraryItem[]>([])
  const [themes, setThemes] = useState<ThemeOption[]>([])
  const [themeRows, setThemeRows] = useState<Theme[]>([])
  const [genreRows, setGenreRows] = useState<Genre[]>([])
  const [eraRows, setEraRows] = useState<Era[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(null)
  const [busyAction, setBusyAction] = useState<'dedupe' | 'sync' | 'backfill' | 'import' | null>(null)
  const [error, setError] = useState('')

  const refetchTracks = useCallback(async () => {
    const { tracks: rows, error: trackError } = await loadLibraryTracks(supabase)
    if (trackError) throw new Error(trackError)
    setTracks(rows)
  }, [supabase])

  const refetchMediaItems = useCallback(async () => {
    const { data, error: mediaError } = await supabase
      .from('media_library')
      .select('*')
      .order('created_at', { ascending: false })

    if (mediaError) {
      const isSchemaCache = /theme_id|schema cache|column.*media_library/i.test(mediaError.message)
      if (isSchemaCache) {
        const { data: fallbackData, error: fallbackErr } = await supabase
          .from('media_library')
          .select('id, name, file_path, file_url, storage_bucket, file_type, file_size_bytes, created_at')
          .order('created_at', { ascending: false })
        if (fallbackErr) throw new Error(fallbackErr.message)
        setMediaItems((fallbackData ?? []) as MediaLibraryItem[])
        return
      }
      throw new Error(mediaError.message)
    }
    setMediaItems((data ?? []) as MediaLibraryItem[])
  }, [supabase])

  const refetchThemes = useCallback(async () => {
    const [{ data: themeData }, { data: genreData }, { data: eraData }] = await Promise.all([
      supabase.from('themes').select('id, name, genre_id, era_id'),
      supabase.from('genres').select('id, name, slug, sort_order'),
      supabase.from('eras').select('id, name, start_year, end_year, sort_order'),
    ])

    const themesFull = (themeData ?? []) as Theme[]
    const genresFull = (genreData ?? []) as Genre[]
    const erasFull = (eraData ?? []) as Era[]

    setThemeRows(themesFull)
    setGenreRows(genresFull)
    setEraRows(erasFull)

    const sorted = sortThemesChronologicalThenGenre(themesFull, erasFull, genresFull)
    setThemes(sorted.map((t) => ({ id: t.id, name: t.name })))
  }, [supabase])

  const refetch = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      await Promise.all([refetchTracks(), refetchMediaItems(), refetchThemes()])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load media library')
    } finally {
      setLoading(false)
    }
  }, [refetchTracks, refetchMediaItems, refetchThemes])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const updateTrack = useCallback(
    async (id: string, payload: TrackUpdatePayload): Promise<boolean> => {
      const snapshot = tracks
      const optimistic: BingoTrackLibraryRow = {
        ...(tracks.find((t) => t.id === id) as BingoTrackLibraryRow),
        ...payload,
      }
      setTracks((prev) => prev.map((t) => (t.id === id ? optimistic : t)))

      try {
        const { data, error: updateError } = await supabase
          .from('bingo_game_tracks')
          .update(payload)
          .eq('id', id)
          .select()
          .single()

        if (updateError) throw new Error(updateError.message)
        if (data) setTracks((prev) => prev.map((t) => (t.id === id ? (data as BingoTrackLibraryRow) : t)))
        return true
      } catch (e) {
        setTracks(snapshot)
        setError(e instanceof Error ? e.message : 'Update failed')
        return false
      }
    },
    [tracks, supabase]
  )

  const uploadFile = useCallback(
    async (file: File, themeId?: string | null): Promise<boolean> => {
      setUploading(true)
      setUploadingFileName(file.name)
      setError('')

      try {
        const { path, publicUrl, ext } = await uploadMediaToStorage(supabase, file)
        const row = await insertMediaLibraryRecord(supabase, {
          name: file.name,
          filePath: path,
          fileUrl: publicUrl,
          ext,
          fileSizeBytes: file.size,
          themeId: themeId || null,
        })
        setMediaItems((prev) => [row, ...prev])
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload failed')
        return false
      } finally {
        setUploading(false)
        setUploadingFileName(null)
      }
    },
    [supabase]
  )

  const removeDuplicates = useCallback(async (): Promise<number> => {
    setBusyAction('dedupe')
    setError('')
    const snapshot = tracks
    try {
      const { removed, error: dedupeError } = await dedupeLibraryTracks(supabase)
      if (dedupeError) throw new Error(dedupeError)
      if (removed > 0) await refetchTracks()
      return removed
    } catch (e) {
      setTracks(snapshot)
      setError(e instanceof Error ? e.message : 'Could not remove duplicates')
      return -1
    } finally {
      setBusyAction(null)
    }
  }, [supabase, tracks, refetchTracks])

  const syncFromMediaLibrary = useCallback(async (): Promise<{ inserted: number; skipped: number } | null> => {
    setBusyAction('sync')
    setError('')
    try {
      const result = await syncMediaLibraryToTracks(supabase, themeRows, genreRows, eraRows)
      if (result.error) throw new Error(result.error)
      await refetchTracks()
      return { inserted: result.inserted, skipped: result.skipped }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed')
      return null
    } finally {
      setBusyAction(null)
    }
  }, [supabase, themeRows, genreRows, eraRows, refetchTracks])

  const backfillGenres = useCallback(async (): Promise<number | null> => {
    setBusyAction('backfill')
    setError('')
    try {
      const result = await backfillMissingTrackGenres(supabase, themeRows, genreRows, eraRows)
      if (result.error) throw new Error(result.error)
      if (result.updated > 0) await refetchTracks()
      return result.updated
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Backfill failed')
      return null
    } finally {
      setBusyAction(null)
    }
  }, [supabase, themeRows, genreRows, eraRows, refetchTracks])

  const importTrackLines = useCallback(
    async (lines: string[], themeId: string | null): Promise<{ inserted: number; skipped: number } | null> => {
      setBusyAction('import')
      setError('')
      try {
        const result = await importLibraryTrackLines(supabase, lines, themeId, themeRows, genreRows, eraRows)
        if (result.error) throw new Error(result.error)
        if (result.inserted > 0) await refetchTracks()
        return { inserted: result.inserted, skipped: result.skipped }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Import failed')
        return null
      } finally {
        setBusyAction(null)
      }
    },
    [supabase, themeRows, genreRows, eraRows, refetchTracks]
  )

  return {
    tracks,
    mediaItems,
    themes,
    loading,
    uploading,
    uploadingFileName,
    busyAction,
    error,
    setError,
    refetch,
    updateTrack,
    uploadFile,
    removeDuplicates,
    syncFromMediaLibrary,
    backfillGenres,
    importTrackLines,
  }
}
