import type { User } from '@supabase/supabase-js'

/** True when Supabase Auth marks the user as admin (JWT metadata). */
export function isAdminUser(user: User | null | undefined): boolean {
  if (!user) return false
  const app = user.app_metadata as { role?: string; is_admin?: boolean } | undefined
  const userMeta = user.user_metadata as { role?: string; is_admin?: boolean } | undefined
  if (app?.role === 'admin' || userMeta?.role === 'admin') return true
  if (app?.is_admin === true || userMeta?.is_admin === true) return true
  return false
}

export const ADMIN_COOKIE = 'admin_verified'

export function isAdminCookieValue(value: string | undefined | null): boolean {
  return value === '1'
}

export type PlayerProfileRow = {
  id: string
  email?: string | null
  display_name?: string | null
  role?: string | null
  is_admin?: boolean | null
}

/** True when public.player_profiles marks the user as admin. */
export function isPlayerProfileAdmin(profile: PlayerProfileRow | null | undefined): boolean {
  if (!profile) return false
  if (profile.is_admin === true) return true
  return (profile.role ?? '').toLowerCase() === 'admin'
}
