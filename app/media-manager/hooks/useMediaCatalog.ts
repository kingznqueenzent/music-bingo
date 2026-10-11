'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  describeMissingSupabaseConfig,
  getSupabaseBrowserConfig,
} from '@/lib/supabase/browser-config'
import { resolveSongStoragePath } from '@/lib/media/resolve-song-storage-path'
import {
  MEDIA_BUCKET,
  uploadMediaToStorage,
  validateMediaFile,
} from '@/lib/media/supabase-storage-upload'
import { defaultClipDurationSec, probeMediaDuration } from '@/lib/media/probe-media-duration'
import type { CatalogSong, CatalogTheme, SongUpdatePayload } from '../types'
import { isUncategorizedSong } from '@/lib/media/is-uncategorized-song'
import { fetchJson } from '@/lib/media/fetch-json'
import { withSupabaseKeyHint } from '@/lib/supabase-error-hint'

type PatchSongResponse = {
  song?: CatalogSong
  error?: string
  storageMoved?: boolean
  storageWarnings?: string[]
}

async function patchSongViaApi(
  id: string,
  payload: Record<string, unknown>
): Promise<PatchSongResponse> {
  return fetchJson<PatchSongResponse>(`/api/songs/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

async function fetchAllRows<T>(
  supabase: ReturnType<typeof createClient>,
  table: 'songs' | 'themes',
  select: string,
  order: { column: string; ascending: boolean }
): Promise<T[]> {
  const pageSize = 1000
  const rows: T[] = []
  let page = 0

  while (true) {
    const from = page * pageSize
    const to = from + pageSize - 1
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .order(order.column, { ascending: order.ascending })
      .range(from, to)

    if (error) throw new Error(error.message)
    if (!data?.length) break
    rows.push(...(data as T[]))
    if (data.length < pageSize) break
    page += 1
  }

  return rows
}

function catalogEmptyAlert(
  sessionUser: string | null,
  supabaseError: string | null
): string {
  if (supabaseError) return `Supabase error: ${withSupabaseKeyHint(supabaseError)}`
  if (!sessionUser) {
    return 'Not logged in — catalog returned 0 tracks. The host admin cookie is not a Supabase Auth session; public.songs must allow SELECT for the anon role.'
  }
  return 'Catalog returned 0 tracks. Check public.songs RLS (songs_select_all) and that rows exist.'
}

/** Unrestricted catalog read: select * , no genre/theme/playable filters. */
async function fetchSongsUnrestricted(
  supabase: ReturnType<typeof createClient>
): Promise<{ songs: CatalogSong[]; error: string | null }> {
  const pageSize = 1000
  const songs: CatalogSong[] = []

  // Primary initial load — unrestricted select, no extra filters.
  const { data, error } = await supabase
    .from('songs')
    .select('*')
    .order('created_at', { ascending: false })

  console.log('[MediaManager] songs data', data)
  console.log('[MediaManager] songs error', error)

  if (error) return { songs: [], error: error.message }
  if (!data?.length) return { songs: [], error: null }
  songs.push(...(data as CatalogSong[]))

  // PostgREST caps a single response at ~1000; page the rest if needed.
  let page = 1
  while (data.length >= pageSize) {
    const from = page * pageSize
    const to = from + pageSize - 1
    const next = await supabase
      .from('songs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to)
    if (next.error) return { songs, error: next.error.message }
    if (!next.data?.length) break
    songs.push(...(next.data as CatalogSong[]))
    if (next.data.length < pageSize) break
    page += 1
  }

  return { songs, error: null }
}

async function fetchSongsViaHostApi(): Promise<CatalogSong[]> {
  const body = await fetchJson<{ songs?: CatalogSong[]; error?: string }>('/api/songs', {
    credentials: 'include',
    cache: 'no-store',
  })
  return Array.isArray(body.songs) ? body.songs : []
}

export function useMediaCatalog() {
  const supabase = useMemo(() => createClient(), [])
  const [songs, setSongs] = useState<CatalogSong[]>([])
  const [themes, setThemes] = useState<CatalogTheme[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [catalogAlert, setCatalogAlert] = useState('')
  const hasLoadedRef = useRef(false)

  const refetch = useCallback(async () => {
    // Soft refresh: only show the full-page loader on the first load.
    // Blanking the catalog on every refresh caused mobile “flash” when theme dropdowns remounted.
    if (!hasLoadedRef.current) setLoading(true)
    setError('')
    setCatalogAlert('')

    const envProblem = describeMissingSupabaseConfig(getSupabaseBrowserConfig())
    if (envProblem) {
      console.log('[MediaManager] songs data', [])
      console.log('[MediaManager] songs error', envProblem)
      const { data: sessionEnvelope } = await supabase.auth.getSession()
      console.log('[MediaManager] auth session', sessionEnvelope.session)
      setSongs([])
      setCatalogAlert(envProblem)
      setError(envProblem)
      setLoading(false)
      return
    }

    try {
      const { data: sessionEnvelope } = await supabase.auth.getSession()
      console.log('[MediaManager] auth session', sessionEnvelope.session)
      const sessionUser = sessionEnvelope.session?.user?.id ?? null

      // Exact unrestricted query (paginated so catalogs >1000 still load).
      let { songs: songData, error: songError } = await fetchSongsUnrestricted(supabase)

      if (songError || songData.length === 0) {
        try {
          const apiSongs = await fetchSongsViaHostApi()
          console.log('[MediaManager] /api/songs fallback', {
            count: apiSongs.length,
            clientError: songError,
            clientCount: songData.length,
          })
          if (apiSongs.length > 0) {
            songData = apiSongs
            songError = null
          }
        } catch (apiErr) {
          console.log('[MediaManager] /api/songs fallback error', apiErr)
          if (!songError && songData.length === 0) {
            songError = apiErr instanceof Error ? apiErr.message : 'Host catalog API failed'
          }
        }
      }

      let themeData: CatalogTheme[] = []
      try {
        themeData = await fetchAllRows<CatalogTheme>(supabase, 'themes', 'id, name, display_order', {
          column: 'display_order',
          ascending: true,
        })
      } catch (themeErr) {
        console.log('[MediaManager] themes error', themeErr)
        const { data: themeFallback, error: themeFallbackError } = await supabase
          .from('themes')
          .select('id, name')
          .order('name')
        if (themeFallbackError) {
          console.log('[MediaManager] themes fallback error', themeFallbackError)
        } else {
          themeData = (themeFallback ?? []).map((t) => ({
            id: t.id,
            name: t.name,
            display_order: 0,
          }))
        }
      }

      setSongs(songData)
      setThemes(
        themeData.map((t) => ({
          id: t.id,
          name: t.name,
          display_order: (t as { display_order?: number }).display_order ?? 0,
        }))
      )
      hasLoadedRef.current = true

      if (songError || songData.length === 0) {
        const alert = catalogEmptyAlert(sessionUser, songError)
        setCatalogAlert(alert)
        if (songError) setError(alert)
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not load catalog'
      setError(message)
      setCatalogAlert(`Supabase error: ${withSupabaseKeyHint(message)}`)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const themeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    themes.forEach((t) => {
      counts[t.id] = 0
    })
    const themeNameById = new Map(themes.map((t) => [t.id, t.name]))
    let unassigned = 0
    let uncategorized = 0
    songs.forEach((s) => {
      if (s.theme_id && counts[s.theme_id] !== undefined) counts[s.theme_id] += 1
      else unassigned += 1
      if (isUncategorizedSong(s, themeNameById)) uncategorized += 1
    })
    return { counts, unassigned, uncategorized }
  }, [songs, themes])

  const updateSong = useCallback(
    async (
      id: string,
      payload: SongUpdatePayload
    ): Promise<{ ok: boolean; storageMoved?: boolean; storageWarnings?: string[] }> => {
      const snapshot = songs
      const optimistic: CatalogSong = {
        ...(songs.find((s) => s.id === id) as CatalogSong),
        ...payload,
      }
      setSongs((prev) => prev.map((s) => (s.id === id ? optimistic : s)))

      try {
        const body = await patchSongViaApi(id, payload)
        if (body.song) setSongs((prev) => prev.map((s) => (s.id === id ? body.song! : s)))
        return {
          ok: true,
          storageMoved: body.storageMoved,
          storageWarnings: body.storageWarnings,
        }
      } catch (e) {
        setSongs(snapshot)
        setError(e instanceof Error ? e.message : 'Update failed')
        return { ok: false }
      }
    },
    [songs]
  )

  const deleteSong = useCallback(
    async (id: string): Promise<boolean> => {
      const snapshot = songs
      setSongs((prev) => prev.filter((s) => s.id !== id))

      try {
        await fetchJson<{ error?: string }>(`/api/songs/${id}`, {
          method: 'DELETE',
          credentials: 'include',
        })
        return true
      } catch (e) {
        setSongs(snapshot)
        setError(e instanceof Error ? e.message : 'Delete failed')
        return false
      }
    },
    [songs]
  )

  const assignTheme = useCallback(
    async (id: string, themeId: string | null): Promise<{ ok: boolean; storageMoved?: boolean; storageWarnings?: string[] }> => {
      const song = songs.find((s) => s.id === id)
      if (!song) return { ok: false }
      return updateSong(id, {
        title: song.title,
        artist: song.artist,
        year: song.year,
        theme_id: themeId,
        media_url: song.media_url,
        storage_path: song.storage_path,
        youtube_url: song.youtube_url,
        start_time_sec: song.start_time_sec,
        duration_sec: song.duration_sec,
        file_duration_sec: song.file_duration_sec,
        media_type: song.media_type,
      })
    },
    [songs, updateSong]
  )

  const bulkDeleteSongs = useCallback(
    async (ids: string[]): Promise<boolean> => {
      if (ids.length === 0) return true
      const snapshot = songs
      const idSet = new Set(ids)
      setSongs((prev) => prev.filter((s) => !idSet.has(s.id)))

      try {
        const CHUNK = 100
        for (let i = 0; i < ids.length; i += CHUNK) {
          const chunk = ids.slice(i, i + CHUNK)
          await fetchJson<{ error?: string }>('/api/songs/batch', {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: chunk }),
          })
        }
        return true
      } catch (e) {
        setSongs(snapshot)
        setError(e instanceof Error ? e.message : 'Bulk delete failed')
        return false
      }
    },
    [songs]
  )

  const deleteUnassignedSongs = useCallback(async (): Promise<number> => {
    const themeNameById = new Map(themes.map((t) => [t.id, t.name]))
    const ids = songs.filter((s) => isUncategorizedSong(s, themeNameById)).map((s) => s.id)
    if (ids.length === 0) return 0
    const ok = await bulkDeleteSongs(ids)
    return ok ? ids.length : -1
  }, [songs, themes, bulkDeleteSongs])

  const bulkAssignFields = useCallback(
    async (
      ids: string[],
      fields: { genre?: string | null; year?: number | null }
    ): Promise<boolean> => {
      if (ids.length === 0) return true
      const hasGenre = Object.prototype.hasOwnProperty.call(fields, 'genre')
      const hasYear = Object.prototype.hasOwnProperty.call(fields, 'year')
      if (!hasGenre && !hasYear) return true

      const idSet = new Set(ids)
      const snapshot = songs
      setSongs((prev) =>
        prev.map((s) => {
          if (!idSet.has(s.id)) return s
          return {
            ...s,
            ...(hasGenre ? { genre: fields.genre } : {}),
            ...(hasYear ? { year: fields.year ?? null } : {}),
          }
        })
      )

      try {
        const CHUNK = 100
        for (let i = 0; i < ids.length; i += CHUNK) {
          const chunk = ids.slice(i, i + CHUNK)
          const payload: { ids: string[]; genre?: string | null; year?: number | null } = { ids: chunk }
          if (hasGenre) payload.genre = fields.genre ?? null
          if (hasYear) payload.year = fields.year ?? null
          await fetchJson<{ error?: string }>('/api/songs/batch', {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        }
        return true
      } catch (e) {
        setSongs(snapshot)
        setError(e instanceof Error ? e.message : 'Bulk update failed')
        return false
      }
    },
    [songs]
  )

  const bulkAssignGenre = useCallback(
    async (ids: string[], genre: string | null): Promise<boolean> => {
      return bulkAssignFields(ids, { genre })
    },
    [bulkAssignFields]
  )

  const bulkAssignTheme = useCallback(
    async (
      ids: string[],
      themeId: string | null
    ): Promise<{ ok: boolean; storageMoved?: number; storageWarnings?: string[] }> => {
      if (ids.length === 0) return { ok: true }
      const idSet = new Set(ids)
      const snapshot = songs
      setSongs((prev) => prev.map((s) => (idSet.has(s.id) ? { ...s, theme_id: themeId } : s)))

      try {
        const CHUNK = 100
        let storageMoved = 0
        const storageWarnings: string[] = []

        for (let i = 0; i < ids.length; i += CHUNK) {
          const chunk = ids.slice(i, i + CHUNK)
          const body = await fetchJson<{
            error?: string
            storageMoved?: number
            storageWarnings?: string[]
          }>('/api/songs/batch-theme', {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: chunk, theme_id: themeId }),
          })
          storageMoved += body.storageMoved ?? 0
          if (body.storageWarnings?.length) storageWarnings.push(...body.storageWarnings)
        }

        return { ok: true, storageMoved, storageWarnings }
      } catch (e) {
        setSongs(snapshot)
        setError(e instanceof Error ? e.message : 'Bulk theme update failed')
        return { ok: false }
      }
    },
    [songs]
  )

  const removeDuplicates = useCallback(async (): Promise<number> => {
    const seen = new Map<string, string>()
    const duplicateIds: string[] = []

    for (const song of songs) {
      const key = `${normalizeKey(song.title)}|${normalizeKey(song.artist ?? '')}`
      if (seen.has(key)) duplicateIds.push(song.id)
      else seen.set(key, song.id)
    }

    if (duplicateIds.length === 0) return 0

    const snapshot = songs
    setSongs((prev) => prev.filter((s) => !duplicateIds.includes(s.id)))

    try {
      for (const id of duplicateIds) {
        await fetchJson<{ error?: string }>(`/api/songs/${id}`, {
          method: 'DELETE',
          credentials: 'include',
        })
      }
      return duplicateIds.length
    } catch (e) {
      setSongs(snapshot)
      setError(e instanceof Error ? e.message : 'Could not remove duplicates')
      return -1
    }
  }, [songs, supabase])

  const patchSongFields = useCallback(
    async (
      id: string,
      fields: Partial<
        Pick<CatalogSong, 'title' | 'artist' | 'year' | 'genre' | 'media_url' | 'youtube_url' | 'media_type'>
      >
    ): Promise<{ ok: boolean; storageMoved?: boolean; storageWarnings?: string[] }> => {
      const song = songs.find((s) => s.id === id)
      if (!song) return { ok: false }

      const snapshot = songs
      setSongs((prev) => prev.map((s) => (s.id === id ? { ...s, ...fields } : s)))

      try {
        const body = await patchSongViaApi(id, fields)
        if (body.song) setSongs((prev) => prev.map((s) => (s.id === id ? body.song! : s)))
        return {
          ok: true,
          storageMoved: body.storageMoved,
          storageWarnings: body.storageWarnings,
        }
      } catch (e) {
        setSongs(snapshot)
        setError(e instanceof Error ? e.message : 'Update failed')
        return { ok: false }
      }
    },
    [songs]
  )

  const replaceSongFile = useCallback(
    async (id: string, file: File): Promise<boolean> => {
      const validated = validateMediaFile(file)
      if ('error' in validated) {
        setError(validated.error)
        return false
      }

      const song = songs.find((s) => s.id === id)
      if (!song) return false

      const oldPath = resolveSongStoragePath(song)
      const snapshot = songs

      try {
        const uploaded = await uploadMediaToStorage(supabase, file)
        const mediaType = uploaded.ext === 'mp4' ? 'video' : 'audio'
        const fileDurationSec = await probeMediaDuration(file)
        const fields = {
          media_url: uploaded.publicUrl,
          storage_path: uploaded.path,
          media_type: mediaType,
          file_duration_sec: fileDurationSec,
          duration_sec: defaultClipDurationSec(fileDurationSec),
        }

        setSongs((prev) => prev.map((s) => (s.id === id ? { ...s, ...fields } : s)))

        const { data, error: updateError } = await supabase
          .from('songs')
          .update(fields)
          .eq('id', id)
          .select()
          .single()

        if (updateError) {
          const body = await fetchJson<{ song?: CatalogSong; error?: string }>(
            `/api/songs/${id}`,
            {
              method: 'PATCH',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(fields),
            }
          )
          if (body.song) setSongs((prev) => prev.map((s) => (s.id === id ? body.song! : s)))
        } else if (data) {
          setSongs((prev) => prev.map((s) => (s.id === id ? (data as CatalogSong) : s)))
        }

        if (oldPath && oldPath !== uploaded.path) {
          await supabase.storage.from(MEDIA_BUCKET).remove([oldPath])
        }

        return true
      } catch (e) {
        setSongs(snapshot)
        setError(e instanceof Error ? e.message : 'File replacement failed')
        return false
      }
    },
    [songs, supabase]
  )

  return {
    songs,
    themes,
    loading,
    error,
    catalogAlert,
    setError,
    refetch,
    themeCounts,
    updateSong,
    patchSongFields,
    deleteSong,
    assignTheme,
    bulkDeleteSongs,
    deleteUnassignedSongs,
    bulkAssignGenre,
    bulkAssignFields,
    bulkAssignTheme,
    removeDuplicates,
    replaceSongFile,
  }
}
