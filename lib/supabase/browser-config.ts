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

  const isConfigured =
    missing.length === 0 &&
    !url.includes('placeholder.supabase.co') &&
    anonKey !== 'placeholder-key' &&
    anonKey.length > 20

  return { url, anonKey, isConfigured, missing }
}
