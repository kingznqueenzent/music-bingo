import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ADMIN_COOKIE, isAdminCookieValue } from '@/lib/admin-access'
import {
  checkMediaLibraryAccess,
  mediaLibraryBlockedResponse,
} from '@/lib/media/media-library-access-server'
import {
  assertTrackQuotaForInsert,
  trackQuotaErrorResponse,
} from '@/lib/media/track-quota-server'

async function requireHostCookie(): Promise<boolean> {
  const jar = await cookies()
  return isAdminCookieValue(jar.get(ADMIN_COOKIE)?.value)
}

type BatchSongInput = {
  title?: string
  artist?: string | null
  year?: number | null
  theme_id?: string | null
  youtube_url?: string | null
  media_url?: string | null
  start_time_sec?: number
  duration_sec?: number
  media_type?: string
}

/** Batch insert catalog songs (admin cookie + service role). */
export async function POST(request: NextRequest) {
  if (!(await requireHostCookie())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as { songs?: BatchSongInput[] }
  const rows = body.songs ?? []

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No songs provided.' }, { status: 400 })
  }

  const access = checkMediaLibraryAccess()
  if (!access.allowed) {
    return mediaLibraryBlockedResponse(access.tier)
  }

  const payload = rows.map((row) => ({
    title: String(row.title ?? 'Untitled').trim(),
    artist: row.artist ? String(row.artist).trim() : null,
    year: row.year != null ? Number(row.year) : null,
    theme_id: row.theme_id ? String(row.theme_id) : null,
    youtube_url: row.youtube_url ? String(row.youtube_url).trim() : null,
    media_url: row.media_url ? String(row.media_url).trim() : null,
    start_time_sec: Number(row.start_time_sec ?? 0),
    duration_sec: Number(row.duration_sec ?? 35),
    media_type: row.youtube_url ? 'youtube' : String(row.media_type ?? 'audio'),
  }))

  const supabase = createClient()
  const quota = await assertTrackQuotaForInsert(supabase, payload.length)
  if (!quota.allowed) {
    return NextResponse.json(trackQuotaErrorResponse(quota), { status: 403 })
  }

  const { error } = await supabase.from('songs').insert(payload)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, count: payload.length })
}
