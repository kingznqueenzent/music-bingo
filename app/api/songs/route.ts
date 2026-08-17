import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ADMIN_COOKIE, isAdminCookieValue } from '@/lib/admin-access'
import {
  checkMediaLibraryAccessForClient,
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

/** Host catalog CRUD via service role (admin cookie gate). */
export async function GET() {
  if (!(await requireHostCookie())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient()
  const access = await checkMediaLibraryAccessForClient(supabase)
  if (!access.allowed) {
    return mediaLibraryBlockedResponse(access.tier)
  }

  const pageSize = 1000
  const songs: Record<string, unknown>[] = []
  let page = 0

  while (true) {
    const from = page * pageSize
    const to = from + pageSize - 1
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data?.length) break
    songs.push(...data)
    if (data.length < pageSize) break
    page += 1
  }

  return NextResponse.json({ songs })
}

export async function POST(request: NextRequest) {
  if (!(await requireHostCookie())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as Record<string, unknown>
  const supabase = createClient()
  const access = await checkMediaLibraryAccessForClient(supabase)
  if (!access.allowed) {
    return mediaLibraryBlockedResponse(access.tier)
  }

  const quota = await assertTrackQuotaForInsert(supabase, 1)
  if (!quota.allowed) {
    return NextResponse.json(trackQuotaErrorResponse(quota), { status: 403 })
  }

  const { data, error } = await supabase
    .from('songs')
    .insert([
      {
        title: String(body.title ?? '').trim(),
        artist: body.artist ? String(body.artist).trim() : null,
        year: body.year != null ? Number(body.year) : null,
        theme_id: body.theme_id ? String(body.theme_id) : null,
        genre: body.genre != null && String(body.genre).trim() ? String(body.genre).trim() : null,
        youtube_url: body.youtube_url ? String(body.youtube_url).trim() : null,
        media_url: body.media_url ? String(body.media_url).trim() : null,
        storage_path: body.storage_path ? String(body.storage_path).trim() : null,
        start_time_sec: Number(body.start_time_sec ?? 0),
        duration_sec: Number(body.duration_sec ?? 35),
        file_duration_sec:
          body.file_duration_sec != null && body.file_duration_sec !== ''
            ? Number(body.file_duration_sec)
            : null,
        media_type: body.youtube_url ? 'youtube' : String(body.media_type ?? 'audio'),
      },
    ])
    .select()
    .single()

  if (error) {
    // Soft-fail genre until migration is applied on the project.
    if (body.genre != null && /genre|column|schema cache/i.test(error.message)) {
      const { data: fallback, error: fallbackError } = await supabase
        .from('songs')
        .insert([
          {
            title: String(body.title ?? '').trim(),
            artist: body.artist ? String(body.artist).trim() : null,
            year: body.year != null ? Number(body.year) : null,
            theme_id: body.theme_id ? String(body.theme_id) : null,
            youtube_url: body.youtube_url ? String(body.youtube_url).trim() : null,
            media_url: body.media_url ? String(body.media_url).trim() : null,
            storage_path: body.storage_path ? String(body.storage_path).trim() : null,
            start_time_sec: Number(body.start_time_sec ?? 0),
            duration_sec: Number(body.duration_sec ?? 35),
            file_duration_sec:
              body.file_duration_sec != null && body.file_duration_sec !== ''
                ? Number(body.file_duration_sec)
                : null,
            media_type: body.youtube_url ? 'youtube' : String(body.media_type ?? 'audio'),
          },
        ])
        .select()
        .single()
      if (fallbackError) return NextResponse.json({ error: fallbackError.message }, { status: 500 })
      return NextResponse.json({ song: fallback })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ song: data })
}
