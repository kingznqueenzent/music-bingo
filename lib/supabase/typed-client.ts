import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

/** Typed Supabase client for new Choice A code paths (`players`, `bingo_game_tracks`, `grid_data`). */
export function createTypedClient(): SupabaseClient<Database> {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || 'https://placeholder.supabase.co'
  const key =
    (typeof window === 'undefined'
      ? process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()) || 'placeholder-key'
  return createSupabaseClient<Database>(url, key)
}
