'use client'

import { useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { attachRealtimeAuthSync } from '@/lib/supabase/realtime-auth'

/** Keeps Realtime JWT in sync with Supabase Auth (login/logout/refresh). */
export function SupabaseRealtimeAuth() {
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    return attachRealtimeAuthSync(supabase)
  }, [supabase])

  return null
}
