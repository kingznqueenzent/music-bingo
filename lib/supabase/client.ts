import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseBrowserConfig } from '@/lib/supabase/browser-config'

export { getSupabaseBrowserConfig } from '@/lib/supabase/browser-config'

let browserClient: SupabaseClient | null = null

/** Browser Supabase client (anon key) via @supabase/ssr. */
export function createClient(): SupabaseClient {
  const { url, anonKey, isConfigured } = getSupabaseBrowserConfig()

  const resolvedUrl = url || 'https://placeholder.supabase.co'
  const resolvedKey = anonKey || 'placeholder-key'

  if (!isConfigured && typeof window !== 'undefined') {
    console.error(
      '[LyricGrid] Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    )
  }

  if (typeof window !== 'undefined') {
    if (!browserClient) {
      browserClient = createBrowserClient(resolvedUrl, resolvedKey)
    }
    return browserClient
  }

  return createBrowserClient(resolvedUrl, resolvedKey)
}
