import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ADMIN_COOKIE, isAdminCookieValue } from '@/lib/admin-access'
import { deleteSongStorageObject } from '@/lib/media/delete-song-storage'
import {
  executeStorageCopy,
  finalizeStorageMove,
  planSongStorageMove,
} from '@/lib/media/apply-song-storage-move'
import {
  checkMediaLibraryAccessForClient,
  mediaLibraryBlockedResponse,
} from '@/lib/media/media-library-access-server'

async function requireHostCookie(): Promise<boolean> {
  const jar = await cookies()
  return isAdminCookieValue(jar.get(ADMIN_COOKIE)?.value)
}

type RouteContext = { params: Promise<{ id: string }> }

function buildUpdatePayload(body: Record<string, unknown>): Record<string, unknown> {
  return {
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
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!(await requireHostCookie())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  const body = (await request.json()) as Record<string, unknown>
  const supabase = createClient()
  const access = await checkMediaLibraryAccessForClient(supabase)
  if (!access.allowed) {
    return mediaLibraryBlockedResponse(access.tier)
  }

  const { data: existing, error: fetchError } = await supabase
    .from('songs')
    .select('storage_path, media_url, artist, theme_id')
    .eq('id', id)
    .single()

  if (fetchError) {
    return NextResponse.json(
      { error: fetchError.message },
      { status: fetchError.code === 'PGRST116' ? 404 : 500 }
    )
  }

  const storageWarnings: string[] = []
  let storageMoved = false
  let oldPathForCleanup: string | null = null

  const movePlan = await planSongStorageMove(supabase, existing, {
    artist: body.artist !== undefined ? (body.artist ? String(body.artist) : null) : undefined,
    theme_id: body.theme_id !== undefined ? (body.theme_id ? String(body.theme_id) : null) : undefined,
  })

  const updatePayload = buildUpdatePayload(body)

  if (movePlan) {
    try {
      const copied = await executeStorageCopy(supabase, movePlan)
      updatePayload.storage_path = copied.storage_path
      updatePayload.media_url = copied.media_url
      oldPathForCleanup = movePlan.oldPath
      storageMoved = true
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Storage move failed'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }

  const { data, error } = await supabase.from('songs').update(updatePayload).eq('id', id).select().single()

  if (error) {
    if (storageMoved && updatePayload.storage_path) {
      await deleteSongStorageObject(supabase, {
        storage_path: String(updatePayload.storage_path),
        media_url: updatePayload.media_url ? String(updatePayload.media_url) : null,
      })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (oldPathForCleanup) {
    const deleteWarning = await finalizeStorageMove(supabase, oldPathForCleanup)
    if (deleteWarning) storageWarnings.push(deleteWarning)
  }

  return NextResponse.json({
    song: data,
    storageMoved,
    storageWarnings: storageWarnings.length > 0 ? storageWarnings : undefined,
  })
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  if (!(await requireHostCookie())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  const supabase = createClient()
  const access = await checkMediaLibraryAccessForClient(supabase)
  if (!access.allowed) {
    return mediaLibraryBlockedResponse(access.tier)
  }

  const { data: song, error: fetchError } = await supabase
    .from('songs')
    .select('storage_path, media_url')
    .eq('id', id)
    .single()

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: fetchError.code === 'PGRST116' ? 404 : 500 })
  }

  await deleteSongStorageObject(supabase, song)

  const { error } = await supabase.from('songs').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
