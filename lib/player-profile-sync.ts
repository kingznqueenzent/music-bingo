import type { SupabaseClient, User } from '@supabase/supabase-js'

/** SQL run by apply-migration.ts to sync all auth.users → player_profiles. */
export const SYNC_ALL_PLAYER_PROFILES_SQL = `
INSERT INTO public.player_profiles (id, email, display_name, role, is_admin)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'display_name', u.raw_user_meta_data->>'full_name', 'Host / Admin'),
  'admin',
  true
FROM auth.users u
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  display_name = COALESCE(EXCLUDED.display_name, public.player_profiles.display_name),
  role = 'admin',
  is_admin = true;
`

function displayNameFromUser(user: User): string {
  const meta = user.user_metadata as { display_name?: string; full_name?: string } | undefined
  return meta?.display_name?.trim() || meta?.full_name?.trim() || 'Host / Admin'
}

function shouldGrantAdmin(user: User, existingAdmin: boolean | null | undefined): boolean {
  if (existingAdmin === true) return true
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim()
  if (adminEmail && user.email?.toLowerCase().trim() === adminEmail) return true
  return false
}

/** Upsert player_profiles when a user registers or logs in via Supabase Auth. */
export async function syncPlayerProfileOnLogin(
  supabase: SupabaseClient,
  user: User
): Promise<{ ok: boolean; isAdmin: boolean; error?: string }> {
  const { data: existing, error: readError } = await supabase
    .from('player_profiles')
    .select('is_admin, role')
    .eq('id', user.id)
    .maybeSingle()

  if (readError && !/player_profiles|schema cache|does not exist/i.test(readError.message)) {
    return { ok: false, isAdmin: false, error: readError.message }
  }

  const isAdmin =
    shouldGrantAdmin(user, existing?.is_admin) ||
    (existing?.role ?? '').toLowerCase() === 'admin'

  const { error: upsertError } = await supabase.from('player_profiles').upsert(
    {
      id: user.id,
      email: user.email ?? null,
      display_name: displayNameFromUser(user),
      role: isAdmin ? 'admin' : 'player',
      is_admin: isAdmin,
    },
    { onConflict: 'id' }
  )

  if (upsertError) {
    return { ok: false, isAdmin: false, error: upsertError.message }
  }

  return { ok: true, isAdmin }
}
