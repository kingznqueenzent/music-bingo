'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  fetchThemesWithTrackCounts,
  type ThemeWithTrackCount,
} from '@/lib/media/theme-track-counts'

/** Live theme → track counts (catalog + theme_songs), refetches on focus/realtime. */
export function useThemeTrackCounts() {
  const supabase = useMemo(() => createClient(), [])
  const [themes, setThemes] = useState<ThemeWithTrackCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refetch = useCallback(async () => {
    setError('')
    const { themes: next, error: err } = await fetchThemesWithTrackCounts(supabase)
    setThemes(next)
    if (err) setError(err)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    void refetch()
  }, [refetch])

  useEffect(() => {
    const onFocus = () => void refetch()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refetch])

  useEffect(() => {
    const channel = supabase
      .channel('host-theme-track-counts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'songs' },
        () => void refetch()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'theme_songs' },
        () => void refetch()
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [supabase, refetch])

  const countById = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of themes) map.set(t.id, t.trackCount)
    return map
  }, [themes])

  return { themes, countById, loading, error, refetch }
}
