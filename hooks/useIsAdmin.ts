'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isAdminUser, isPlayerProfileAdmin } from '@/lib/admin-access'

export function useIsAdmin(): { isAdmin: boolean; loading: boolean } {
  const supabase = useMemo(() => createClient(), [])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function resolve() {
      try {
        const [sessionRes, authRes] = await Promise.all([
          fetch('/api/admin-session', { credentials: 'include' }).then((r) => r.json()),
          supabase.auth.getUser(),
        ])
        const cookieAdmin = !!(sessionRes as { isAdmin?: boolean }).isAdmin
        const user = authRes.data.user
        const authAdmin = isAdminUser(user)

        let profileAdmin = false
        if (user?.id) {
          const { data: profile } = await supabase
            .from('player_profiles')
            .select('id, role, is_admin')
            .eq('id', user.id)
            .maybeSingle()
          profileAdmin = isPlayerProfileAdmin(profile)
        }

        if (!cancelled) {
          setIsAdmin(cookieAdmin || authAdmin || profileAdmin)
          setLoading(false)
        }
      } catch {
        if (!cancelled) {
          setIsAdmin(false)
          setLoading(false)
        }
      }
    }

    void resolve()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void resolve()
    })
    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [supabase])

  return { isAdmin, loading }
}
