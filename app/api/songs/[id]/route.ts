import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ADMIN_COOKIE, isAdminCookieValue } from '@/lib/admin-access'
import {
  checkMediaLibraryAccess,
  mediaLibraryBlockedResponse,
} from '@/lib/media/media-library-access-server'

async function requireHostCookie(): Promise<boolean> {
  const jar = await cookies()
  return isAdminCookieValue(jar.get(ADMIN_COOKIE)?.value)
}

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!(await requireHostCookie())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const access = checkMediaLibraryAccess()
  if (!access.allowed) {
    return mediaLibraryBlockedResponse(access.tier)
  }

  const { id } = await context.params
  const body = (await request.json()) as Record<string, unknown>
  const supabase = createClient()

  const { data, error } = await supabase
    .from('songs')
    .update({
      title: body.title != null ? String(body.title) : undefined,
      artist: body.artist !== undefined ? (body.artist ? String(body.artist) : null) : undefined,
      year: body.year !== undefined ? (body.year != null ? Number(body.year) : null) : undefined,
      theme_id: body.theme_id !== undefined ? (body.theme_id ? String(body.theme_id) : null) : undefined,
      media_url: body.media_url !== undefined ? (body.media_url ? String(body.media_url) : null) : undefined,
      storage_path:
        body.storage_path !== undefined ? (body.storage_path ? String(body.storage_path) : null) : undefined,
      youtube_url:
        body.youtube_url !== undefined ? (body.youtube_url ? String(body.youtube_url) : null) : undefined,
      start_time_sec: body.start_time_sec != null ? Number(body.start_time_sec) : undefined,
      duration_sec: body.duration_sec != null ? Number(body.duration_sec) : undefined,
      file_duration_sec:
        body.file_duration_sec !== undefined
          ? body.file_duration_sec != null
            ? Number(body.file_duration_sec)
            : null
          : undefined,
      media_type: body.media_type != null ? String(body.media_type) : undefined,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ song: data })
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  if (!(await requireHostCookie())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const access = checkMediaLibraryAccess()
  if (!access.allowed) {
    return mediaLibraryBlockedResponse(access.tier)
  }

  const { id } = await context.params
  const supabase = createClient()
  const { error } = await supabase.from('songs').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
