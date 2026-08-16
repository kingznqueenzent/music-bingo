import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ADMIN_COOKIE, isAdminCookieValue } from '@/lib/admin-access'
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

const CHUNK = 100

/** Batch assign theme_id to many songs (admin cookie + service role). Moves storage when theme is in path. */
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
  const access = await checkMediaLibraryAccessForClient(supabase)
  if (!access.allowed) {
    return mediaLibraryBlockedResponse(access.tier)
  }

  let updated = 0
  let storageMoved = 0
  const storageWarnings: string[] = []

  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK)
    const { data: rows, error: fetchError } = await supabase
      .from('songs')
      .select('id, storage_path, media_url, artist, theme_id')
      .in('id', chunk)

    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })

    for (const row of rows ?? []) {
      const movePlan = await planSongStorageMove(supabase, row, { theme_id: themeId })
      const updatePayload: Record<string, string | null> = { theme_id: themeId }

      if (movePlan) {
        try {
          const copied = await executeStorageCopy(supabase, movePlan)
          updatePayload.storage_path = copied.storage_path
          updatePayload.media_url = copied.media_url

          const { error: updateError } = await supabase
            .from('songs')
            .update(updatePayload)
            .eq('id', row.id)

          if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 })
          }

          const deleteWarning = await finalizeStorageMove(supabase, movePlan.oldPath)
          if (deleteWarning) storageWarnings.push(deleteWarning)
          storageMoved += 1
          updated += 1
          continue
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Storage move failed'
          return NextResponse.json({ error: `${row.id}: ${message}` }, { status: 500 })
        }
      }

      const { error: updateError } = await supabase
        .from('songs')
        .update(updatePayload)
        .eq('id', row.id)

      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
      updated += 1
    }
  }

  return NextResponse.json({
    ok: true,
    updated,
    theme_id: themeId,
    storageMoved,
    storageWarnings: storageWarnings.length > 0 ? storageWarnings : undefined,
  })
}
