import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Server Supabase client (prefers service role).
 * Uses placeholders during Vercel/Next build when env is not yet injected so
 * `npm run build` stays green; runtime requests still need real Production vars.
 */
export function createClient(): SupabaseClient {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || 'https://placeholder.supabase.co'
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    'placeholder-key'

  return createSupabaseClient(url, key)
}

/** Runtime host APIs — service role only (bypasses RLS). Never send this client to the browser. */
export function createServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || url.includes('placeholder.supabase.co')) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured on the server.')
  }
  if (!key || key === 'placeholder-key') {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured on the server.')
  }
  return createSupabaseClient(url, key)
}
