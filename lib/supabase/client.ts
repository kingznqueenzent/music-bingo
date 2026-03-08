import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createClient() {
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
  return createSupabaseClient(url, key)
}
