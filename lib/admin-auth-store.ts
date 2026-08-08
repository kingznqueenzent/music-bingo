'use client'

import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { isAdminUser, isPlayerProfileAdmin } from '@/lib/admin-access'

export type AdminAuthSnapshot = {
  isAdmin: boolean
  loading: boolean
  /** True after the first settle — used to avoid redirect/UI flashes. */
  ready: boolean
}

type Listener = () => void

let snapshot: AdminAuthSnapshot = { isAdmin: false, loading: true, ready: false }
const listeners = new Set<Listener>()
let bootstrapped = false
let seq = 0
let debounceTimer: ReturnType<typeof setTimeout> | null = null

function publish(next: AdminAuthSnapshot) {
  if (
    snapshot.isAdmin === next.isAdmin &&
    snapshot.loading === next.loading &&
    snapshot.ready === next.ready
  ) {
    return
  }
  snapshot = next
  listeners.forEach((listener) => listener())
}

export function getAdminAuthSnapshot(): AdminAuthSnapshot {
  return snapshot
}

export function subscribeAdminAuth(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

async function fetchCookieAdmin(): Promise<boolean> {
  const res = await fetch('/api/admin-session', {
    credentials: 'include',
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error(`admin-session ${res.status}`)
  }
  const data = (await res.json()) as { isAdmin?: boolean }
  return !!data.isAdmin
}

async function resolveIsAdmin(user: User | null): Promise<boolean> {
  // Cookie is the host-portal source of truth and survives JWT refresh gaps.
  const cookieAdmin = await fetchCookieAdmin()
  if (cookieAdmin) return true
  if (!user) return false
  if (isAdminUser(user)) return true

  const supabase = createClient()
  const { data: profile } = await supabase
    .from('player_profiles')
    .select('id, role, is_admin')
    .eq('id', user.id)
    .maybeSingle()

  return isPlayerProfileAdmin(profile)
}

/**
 * Re-resolve admin access.
 * @param userHint - session user from onAuthStateChange (preferred). `undefined` = look up.
 * @param verifyWithServer - when true, call getUser() (initial boot only).
 */
async function runResolve(
  userHint: User | null | undefined,
  verifyWithServer: boolean
): Promise<void> {
  const mySeq = ++seq
  try {
    let user: User | null
    if (verifyWithServer || userHint === undefined) {
      const { data } = await createClient().auth.getUser()
      user = data.user
    } else {
      user = userHint
    }

    const isAdmin = await resolveIsAdmin(user)
    if (mySeq !== seq) return

    publish({ isAdmin, loading: false, ready: true })
  } catch {
    if (mySeq !== seq) return
    // Sticky: never demote a known admin on transient network/auth blips.
    if (snapshot.ready && snapshot.isAdmin) {
      publish({ isAdmin: true, loading: false, ready: true })
      return
    }
    publish({ isAdmin: false, loading: false, ready: true })
  }
}

function scheduleResolve(
  userHint: User | null | undefined,
  verifyWithServer = false
): void {
  if (debounceTimer) clearTimeout(debounceTimer)
  // Defer out of Supabase's onAuthStateChange stack to avoid getUser/getSession loops.
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    void runResolve(userHint, verifyWithServer)
  }, 40)
}

/** Start the singleton listener once per browser tab. */
export function ensureAdminAuthStore(): void {
  if (bootstrapped || typeof window === 'undefined') return
  bootstrapped = true

  const supabase = createClient()
  scheduleResolve(undefined, true)

  supabase.auth.onAuthStateChange((event, session) => {
    // Do not call getUser()/getSession() inside this callback — that races token refresh
    // and can briefly report logged-out, flashing login ↔ admin UI on mobile.
    if (event === 'TOKEN_REFRESHED') {
      // Refresh already carries a valid session; skip noisy re-checks that demote UI.
      if (snapshot.ready && snapshot.isAdmin && session?.user) return
    }
    scheduleResolve(session?.user ?? null, false)
  })
}

/** Force a fresh check after explicit login/logout flows. */
export function refreshAdminAuth(): void {
  ensureAdminAuthStore()
  scheduleResolve(undefined, true)
}
