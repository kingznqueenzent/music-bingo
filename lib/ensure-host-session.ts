'use client'

import { createClient } from '@/lib/supabase/client'
import { refreshAdminAuth } from '@/lib/admin-auth-store'

/**
 * Ensure the httpOnly `admin_verified` cookie is set before navigating to
 * proxy/layout-protected routes (/media-manager, /host, …).
 *
 * useIsAdmin can be true from JWT/profile alone — without this cookie the
 * proxy redirects to /login and LoginForm bounces back → flash loop.
 */
export async function ensureHostSession(): Promise<{ ok: boolean; error?: string }> {
  try {
    const probe = await fetch('/api/admin-session', {
      credentials: 'include',
      cache: 'no-store',
    })
    if (probe.ok) {
      const body = (await probe.json()) as { isAdmin?: boolean }
      if (body.isAdmin) return { ok: true }
    }

    const supabase = createClient()
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    if (!token) {
      return { ok: false, error: 'Not signed in' }
    }

    const res = await fetch('/api/auth/host-session', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
      cache: 'no-store',
    })

    if (!res.ok) {
      let message = 'Could not establish host session'
      try {
        const body = (await res.json()) as { error?: string }
        if (body.error) message = body.error
      } catch {
        /* ignore */
      }
      return { ok: false, error: message }
    }

    refreshAdminAuth()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Host session failed' }
  }
}

const COOKIE_PROTECTED_PREFIXES = [
  '/host',
  '/media-manager',
  '/media',
  '/kingz-control',
  '/sitemap',
  '/playlists',
]

export function isCookieProtectedPath(href: string): boolean {
  const path = href.split('?')[0] || href
  return COOKIE_PROTECTED_PREFIXES.some(
    (p) => path === p || path.startsWith(`${p}/`)
  )
}
