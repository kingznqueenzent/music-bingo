import { createClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'
import type { User } from '@supabase/supabase-js'

/** Resolve Supabase user from `Authorization: Bearer <access_token>` (browser session). */
export async function getUserFromBearer(req: NextRequest): Promise<User | null> {
  const auth = req.headers.get('authorization')
  if (!auth?.toLowerCase().startsWith('bearer ')) return null
  const token = auth.slice(7).trim()
  if (!token) return null

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null

  const supabase = createClient(url, key)
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) return null
  return data.user
}

export function isAppAdmin(user: User | null): boolean {
  if (!user) return false
  const role = (user.app_metadata as { role?: string } | undefined)?.role
  return role === 'admin'
}
