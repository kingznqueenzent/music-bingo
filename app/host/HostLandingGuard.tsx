'use client'

import { useEffect } from 'react'
import { clearHostGameSession, peekHostLastGameId } from '@/lib/host-session'

/**
 * Landing on /host must stay on the clean dashboard.
 * Clears any remembered game id so nothing auto-navigates into a stale live console.
 */
export function HostLandingGuard() {
  useEffect(() => {
    const last = peekHostLastGameId()
    if (last) {
      // Intentionally do NOT redirect to /host/[last] — host asked for a clean landing.
      clearHostGameSession()
    }
  }, [])

  return null
}
