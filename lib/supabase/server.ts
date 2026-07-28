import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'

/** Server Supabase client (service role). For typed queries see `@/types/database.types`. */
export function createClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createSupabaseClient(url, key)
}
