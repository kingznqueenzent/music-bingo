'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CatalogSong, CatalogTheme, SongUpdatePayload } from '../types'
import { isUncategorizedSong } from '@/lib/media/is-uncategorized-song'

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

export function useMediaCatalog() {
  const supabase = useMemo(() => createClient(), [])
  const [songs, setSongs] = useState<CatalogSong[]>([])
  const [themes, setThemes] = useState<CatalogTheme[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refetch = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [songData, themeData] = await Promise.all([
        fetchAllRows<CatalogSong>(supabase, 'songs', '*', { column: 'created_at', ascending: false }),
        fetchAllRows<CatalogTheme>(supabase, 'themes', 'id, name, display_order', {
          column: 'display_order',
          ascending: true,
        }),
      ])
      setSongs(songData)
      setThemes(
        themeData.map((t) => ({
          id: t.id,
          name: t.name,
          display_order: (t as { display_order?: number }).display_order ?? 0,
        }))
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load catalog')
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
    async (id: string, payload: SongUpdatePayload): Promise<boolean> => {
      const snapshot = songs
      const optimistic: CatalogSong = {
        ...(songs.find((s) => s.id === id) as CatalogSong),
        ...payload,
      }
      setSongs((prev) => prev.map((s) => (s.id === id ? optimistic : s)))

      try {
        const { data, error: updateError } = await supabase
          .from('songs')
          .update(payload)
          .eq('id', id)
          .select()
          .single()

        if (updateError) {
          const res = await fetch(`/api/songs/${id}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
          const body = (await res.json()) as { song?: CatalogSong; error?: string }
          if (!res.ok) throw new Error(body.error ?? updateError.message)
          if (body.song) setSongs((prev) => prev.map((s) => (s.id === id ? body.song! : s)))
        } else if (data) {
          setSongs((prev) => prev.map((s) => (s.id === id ? (data as CatalogSong) : s)))
        }
        return true
      } catch (e) {
        setSongs(snapshot)
        setError(e instanceof Error ? e.message : 'Update failed')
        return false
      }
    },
    [songs, supabase]
  )

  const deleteSong = useCallback(
    async (id: string): Promise<boolean> => {
      const snapshot = songs
      setSongs((prev) => prev.filter((s) => s.id !== id))

      try {
        const { error: deleteError } = await supabase.from('songs').delete().eq('id', id)
        if (deleteError) {
          const res = await fetch(`/api/songs/${id}`, { method: 'DELETE', credentials: 'include' })
          const body = (await res.json()) as { error?: string }
          if (!res.ok) throw new Error(body.error ?? deleteError.message)
        }
        return true
      } catch (e) {
        setSongs(snapshot)
        setError(e instanceof Error ? e.message : 'Delete failed')
        return false
      }
    },
    [songs, supabase]
  )

  const assignTheme = useCallback(
    async (id: string, themeId: string | null): Promise<boolean> => {
      const song = songs.find((s) => s.id === id)
      if (!song) return false
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
        for (const id of ids) {
          const { error: deleteError } = await supabase.from('songs').delete().eq('id', id)
          if (deleteError) {
            const res = await fetch(`/api/songs/${id}`, { method: 'DELETE', credentials: 'include' })
            if (!res.ok) {
              const body = (await res.json()) as { error?: string }
              throw new Error(body.error ?? deleteError.message)
            }
          }
        }
        return true
      } catch (e) {
        setSongs(snapshot)
        setError(e instanceof Error ? e.message : 'Bulk delete failed')
        return false
      }
    },
    [songs, supabase]
  )

  const deleteUnassignedSongs = useCallback(async (): Promise<number> => {
    const themeNameById = new Map(themes.map((t) => [t.id, t.name]))
    const ids = songs.filter((s) => isUncategorizedSong(s, themeNameById)).map((s) => s.id)
    if (ids.length === 0) return 0
    const ok = await bulkDeleteSongs(ids)
    return ok ? ids.length : -1
  }, [songs, themes, bulkDeleteSongs])

  const bulkAssignTheme = useCallback(
    async (ids: string[], themeId: string | null): Promise<boolean> => {
      if (ids.length === 0) return true
      const idSet = new Set(ids)
      const snapshot = songs
      setSongs((prev) => prev.map((s) => (idSet.has(s.id) ? { ...s, theme_id: themeId } : s)))

      try {
        const CHUNK = 100
        for (let i = 0; i < ids.length; i += CHUNK) {
          const chunk = ids.slice(i, i + CHUNK)
          const { error: updateError } = await supabase
            .from('songs')
            .update({ theme_id: themeId })
            .in('id', chunk)

          if (updateError) {
            const res = await fetch('/api/songs/batch-theme', {
              method: 'PATCH',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ids: chunk, theme_id: themeId }),
            })
            const body = (await res.json()) as { error?: string }
            if (!res.ok) throw new Error(body.error ?? updateError.message)
          }
        }
        return true
      } catch (e) {
        setSongs(snapshot)
        setError(e instanceof Error ? e.message : 'Bulk theme update failed')
        return false
      }
    },
    [songs, supabase]
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
        const { error: deleteError } = await supabase.from('songs').delete().eq('id', id)
        if (deleteError) {
          const res = await fetch(`/api/songs/${id}`, { method: 'DELETE', credentials: 'include' })
          if (!res.ok) {
            const body = (await res.json()) as { error?: string }
            throw new Error(body.error ?? deleteError.message)
          }
        }
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
      fields: Partial<Pick<CatalogSong, 'title' | 'artist' | 'media_url' | 'youtube_url' | 'media_type'>>
    ): Promise<boolean> => {
      const song = songs.find((s) => s.id === id)
      if (!song) return false

      const snapshot = songs
      setSongs((prev) => prev.map((s) => (s.id === id ? { ...s, ...fields } : s)))

      try {
        const { data, error: updateError } = await supabase
          .from('songs')
          .update(fields)
          .eq('id', id)
          .select()
          .single()

        if (updateError) {
          const res = await fetch(`/api/songs/${id}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fields),
          })
          const body = (await res.json()) as { song?: CatalogSong; error?: string }
          if (!res.ok) throw new Error(body.error ?? updateError.message)
          if (body.song) setSongs((prev) => prev.map((s) => (s.id === id ? body.song! : s)))
        } else if (data) {
          setSongs((prev) => prev.map((s) => (s.id === id ? (data as CatalogSong) : s)))
        }
        return true
      } catch (e) {
        setSongs(snapshot)
        setError(e instanceof Error ? e.message : 'Update failed')
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
    setError,
    refetch,
    themeCounts,
    updateSong,
    patchSongFields,
    deleteSong,
    assignTheme,
    bulkDeleteSongs,
    deleteUnassignedSongs,
    bulkAssignTheme,
    removeDuplicates,
  }
}
