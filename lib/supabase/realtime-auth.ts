import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Push the current Auth JWT to the Realtime WebSocket so postgres_changes and
 * private channels evaluate RLS with the signed-in user (or anon when null).
 */
export function setRealtimeAuthToken(supabase: SupabaseClient, accessToken: string | null) {
  void supabase.realtime.setAuth(accessToken ?? null)
}

/**
 * Call once on app load and whenever auth changes. Returns unsubscribe cleanup.
 */
export function attachRealtimeAuthSync(supabase: SupabaseClient): () => void {
  void supabase.auth.getSession().then(({ data: { session } }) => {
    setRealtimeAuthToken(supabase, session?.access_token ?? null)
  })

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    setRealtimeAuthToken(supabase, session?.access_token ?? null)
  })

  return () => {
    data.subscription.unsubscribe()
  }
}
