import type { SupabaseClient } from '@supabase/supabase-js'
import { FEATURE_FLAG_KEYS, type FeatureFlagKey } from '@/lib/feature-flag-keys'

export type FeatureFlagRow = {
  key: string
  label: string
  enabled: boolean
  description: string
}

/** Server / API: single flag lookup (defaults false if missing). */
export async function isFeatureEnabled(
  supabase: SupabaseClient,
  key: FeatureFlagKey
): Promise<boolean> {
  const { data } = await supabase.from('feature_flags').select('enabled').eq('key', key).maybeSingle()
  return !!(data as { enabled?: boolean } | null)?.enabled
}

/** Load all flags as a map (missing keys = false). */
export async function getFeatureFlagMap(
  supabase: SupabaseClient
): Promise<Record<FeatureFlagKey, boolean>> {
  const { data } = await supabase.from('feature_flags').select('key, enabled')
  const map = {} as Record<FeatureFlagKey, boolean>
  for (const k of FEATURE_FLAG_KEYS) {
    map[k] = false
  }
  for (const row of data ?? []) {
    const r = row as { key: string; enabled: boolean }
    if (r.key in map) {
      map[r.key as FeatureFlagKey] = !!r.enabled
    }
  }
  return map
}
