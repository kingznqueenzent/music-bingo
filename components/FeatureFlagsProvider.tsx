'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createClient } from '@/lib/supabase/client'
import type { FeatureFlagKey } from '@/lib/feature-flag-keys'
import type { FeatureFlagRow } from '@/lib/feature-flags'

type Ctx = {
  rows: FeatureFlagRow[]
  loading: boolean
  isEnabled: (key: FeatureFlagKey) => boolean
  refresh: () => Promise<void>
}

const FeatureFlagsContext = createContext<Ctx | null>(null)

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), [])
  const [rows, setRows] = useState<FeatureFlagRow[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const { data } = await supabase.from('feature_flags').select('key, label, enabled, description').order('key')
    setRows((data ?? []) as FeatureFlagRow[])
  }, [supabase])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      await refresh()
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [refresh])

  useEffect(() => {
    const ch = supabase
      .channel('feature-flags')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feature_flags' },
        () => {
          void refresh()
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [supabase, refresh])

  const enabledSet = useMemo(() => new Set(rows.filter((r) => r.enabled).map((r) => r.key)), [rows])

  const isEnabled = useCallback(
    (key: FeatureFlagKey) => enabledSet.has(key),
    [enabledSet]
  )

  const value = useMemo(
    () => ({ rows, loading, isEnabled, refresh }),
    [rows, loading, isEnabled, refresh]
  )

  return <FeatureFlagsContext.Provider value={value}>{children}</FeatureFlagsContext.Provider>
}

export function useFeatureFlags(): Ctx {
  const ctx = useContext(FeatureFlagsContext)
  if (!ctx) {
    throw new Error('useFeatureFlags must be used within FeatureFlagsProvider')
  }
  return ctx
}

/** Safe when provider missing (e.g. tests): returns false for all. */
export function useFeatureFlagsOptional(): Ctx | null {
  return useContext(FeatureFlagsContext)
}
