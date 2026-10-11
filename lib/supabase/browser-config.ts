export type SupabaseBrowserConfig = {
  url: string
  anonKey: string
  isConfigured: boolean
  missing: string[]
}

/** Validates public Supabase env vars for browser auth. */
export function getSupabaseBrowserConfig(): SupabaseBrowserConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? ''
  const missing: string[] = []

  if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!anonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')

  const looksLikeKey =
    anonKey.startsWith('eyJ') ||
    anonKey.startsWith('sb_publishable_') ||
    anonKey.length > 20

  const isConfigured =
    missing.length === 0 &&
    !url.includes('placeholder.supabase.co') &&
    anonKey !== 'placeholder-key' &&
    looksLikeKey

  return { url, anonKey, isConfigured, missing }
}

/** User-facing message when public Supabase env vars are missing or placeholders. */
export function describeMissingSupabaseConfig(
  config: SupabaseBrowserConfig = getSupabaseBrowserConfig()
): string | null {
  if (config.isConfigured) return null
  if (config.missing.length > 0) {
    return `Supabase is not configured. Missing: ${config.missing.join(', ')}.`
  }
  return 'Supabase is not configured. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
}
