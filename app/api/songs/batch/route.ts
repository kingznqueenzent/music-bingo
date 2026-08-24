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
import { isBulkGenreTarget, toStoredGenre } from '@/lib/media/detect-genre'
import { deleteSongStorageObjects } from '@/lib/media/delete-song-storage'

async function requireHostCookie(): Promise<boolean> {
  const jar = await cookies()
  return isAdminCookieValue(jar.get(ADMIN_COOKIE)?.value)
}

type BatchSongInput = {
  title?: string
  artist?: string | null
  year?: number | null
  theme_id?: string | null
  genre?: string | null
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

  const supabase = createClient()
  const access = await checkMediaLibraryAccessForClient(supabase)
  if (!access.allowed) {
    return mediaLibraryBlockedResponse(access.tier)
  }

  const payload = rows.map((row) => ({
    title: String(row.title ?? 'Untitled').trim(),
    artist: row.artist ? String(row.artist).trim() : null,
    year: row.year != null ? Number(row.year) : null,
    theme_id: row.theme_id ? String(row.theme_id) : null,
    genre: row.genre != null && String(row.genre).trim() ? String(row.genre).trim() : null,
    youtube_url: row.youtube_url ? String(row.youtube_url).trim() : null,
    media_url: row.media_url ? String(row.media_url).trim() : null,
    start_time_sec: Number(row.start_time_sec ?? 0),
    duration_sec: Number(row.duration_sec ?? 35),
    media_type: row.youtube_url ? 'youtube' : String(row.media_type ?? 'audio'),
  }))

  const quota = await assertTrackQuotaForInsert(supabase, payload.length)
  if (!quota.allowed) {
    return NextResponse.json(trackQuotaErrorResponse(quota), { status: 403 })
  }

  const { error } = await supabase.from('songs').insert(payload)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, count: payload.length })
}

const PATCH_CHUNK = 100

/** Batch UPDATE public.songs.genre for selected catalog ids (admin cookie + service role). */
export async function PATCH(request: NextRequest) {
  if (!(await requireHostCookie())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as { ids?: string[]; genre?: string | null }
  const ids = Array.isArray(body.ids)
    ? body.ids.map((id) => String(id).trim()).filter(Boolean)
    : []

  if (ids.length === 0) {
    return NextResponse.json({ error: 'No song ids provided.' }, { status: 400 })
  }

  const rawGenre = body.genre == null ? 'Untagged' : String(body.genre).trim() || 'Untagged'
  if (!isBulkGenreTarget(rawGenre)) {
    return NextResponse.json({ error: 'Invalid genre.' }, { status: 400 })
  }
  const genre = toStoredGenre(rawGenre)

  const supabase = createClient()
  const access = await checkMediaLibraryAccessForClient(supabase)
  if (!access.allowed) {
    return mediaLibraryBlockedResponse(access.tier)
  }

  let updated = 0
  for (let i = 0; i < ids.length; i += PATCH_CHUNK) {
    const chunk = ids.slice(i, i + PATCH_CHUNK)
    const { data, error } = await supabase.from('songs').update({ genre }).in('id', chunk).select('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    updated += data?.length ?? 0
  }

  return NextResponse.json({ ok: true, updated, genre })
}

const DELETE_CHUNK = 100

/** Batch DELETE public.songs rows and their audio objects in the media bucket. */
export async function DELETE(request: NextRequest) {
  if (!(await requireHostCookie())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as { ids?: string[] }
  const ids = Array.isArray(body.ids)
    ? [...new Set(body.ids.map((id) => String(id).trim()).filter(Boolean))]
    : []

  if (ids.length === 0) {
    return NextResponse.json({ error: 'No song ids provided.' }, { status: 400 })
  }

  const supabase = createClient()
  const access = await checkMediaLibraryAccessForClient(supabase)
  if (!access.allowed) {
    return mediaLibraryBlockedResponse(access.tier)
  }

  const storageRows: { storage_path?: string | null; media_url?: string | null }[] = []
  for (let i = 0; i < ids.length; i += DELETE_CHUNK) {
    const chunk = ids.slice(i, i + DELETE_CHUNK)
    const { data, error } = await supabase
      .from('songs')
      .select('id, storage_path, media_url')
      .in('id', chunk)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (data?.length) storageRows.push(...data)
  }

  await deleteSongStorageObjects(supabase, storageRows)

  let deleted = 0
  for (let i = 0; i < ids.length; i += DELETE_CHUNK) {
    const chunk = ids.slice(i, i + DELETE_CHUNK)
    const { data, error } = await supabase.from('songs').delete().in('id', chunk).select('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    deleted += data?.length ?? 0
  }

  return NextResponse.json({ ok: true, deleted })
}
