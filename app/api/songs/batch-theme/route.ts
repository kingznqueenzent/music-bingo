import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ADMIN_COOKIE, isAdminCookieValue } from '@/lib/admin-access'

async function requireHostCookie(): Promise<boolean> {
  const jar = await cookies()
  return isAdminCookieValue(jar.get(ADMIN_COOKIE)?.value)
}

const CHUNK = 100

/** Batch assign theme_id to many songs (admin cookie + service role). */
export async function PATCH(request: NextRequest) {
  if (!(await requireHostCookie())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as { ids?: string[]; theme_id?: string | null }
  const ids = body.ids ?? []
  const themeId = body.theme_id ? String(body.theme_id) : null

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'No song ids provided.' }, { status: 400 })
  }

  const supabase = createClient()
  let updated = 0

  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK)
    const { error } = await supabase.from('songs').update({ theme_id: themeId }).in('id', chunk)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    updated += chunk.length
  }

  return NextResponse.json({ ok: true, updated, theme_id: themeId })
}
