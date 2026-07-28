import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'

let browserClient: SupabaseClient | null = null

/** Browser Supabase client (anon key). For typed queries see `@/types/database.types`. */
export function createClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  // During Vercel build, env vars can be missing; use placeholders so the build succeeds.
  // In Vercel Project Settings → Environment Variables, add all 4 vars and redeploy.
  if (!url || !key) {
    return createSupabaseClient(
      url || 'https://placeholder.supabase.co',
      key || 'placeholder-key'
    )
  }
  if (typeof window !== 'undefined') {
    if (!browserClient) browserClient = createSupabaseClient(url, key)
    return browserClient
  }
  return createSupabaseClient(url, key)
}
