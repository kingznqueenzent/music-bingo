import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { ADMIN_COOKIE, isAdminCookieValue } from '@/lib/admin-access'
import {
  checkMediaLibraryAccessForClient,
  mediaLibraryBlockedResponse,
} from '@/lib/media/media-library-access-server'
import { parseSongYear } from '@/types/song'
import {
  MUSICBRAINZ_SLEEP_MS,
  buildEnrichmentUpdate,
  fetchMusicBrainzSongEnrichment,
  sleep,
  songNeedsYearEnrichment,
  type SongEnrichCandidate,
} from '@/lib/media/musicbrainz-enrich'

async function requireHostCookie(): Promise<boolean> {
  const jar = await cookies()
  return isAdminCookieValue(jar.get(ADMIN_COOKIE)?.value)
}

const DEFAULT_LIMIT = 25
const MAX_LIMIT = 50

type SongRow = {
  id: string
  title: string | null
  artist: string | null
  year: number | string | null
  genre: string | null
}

/**
 * Batch-enrich catalog songs missing year via MusicBrainz recording search.
 * Admin cookie gate + service role. Fills year gaps only — does not overwrite existing years.
 * Respects MusicBrainz ~1 req/s rate limit.
 *
 * POST body (optional): `{ limit?: number }` — songs to process this chunk (default 25, max 50).
 * Returns progress-friendly JSON: `{ ok, processed, updated, failed, remaining }`.
 */
export async function POST(request: NextRequest) {
  if (!(await requireHostCookie())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let supabase: ReturnType<typeof createServiceRoleClient>
  try {
    supabase = createServiceRoleClient()
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Service role client is not configured' },
      { status: 500 }
    )
  }

  const access = await checkMediaLibraryAccessForClient(supabase)
  if (!access.allowed) {
    return mediaLibraryBlockedResponse(access.tier)
  }

  let limit = DEFAULT_LIMIT
  try {
    const body = (await request.json().catch(() => ({}))) as { limit?: number }
    if (typeof body.limit === 'number' && Number.isFinite(body.limit)) {
      limit = Math.min(MAX_LIMIT, Math.max(1, Math.trunc(body.limit)))
    }
  } catch {
    // empty body is fine
  }

  const { data: rows, error: fetchError } = await supabase
    .from('songs')
    .select('id, title, artist, year, genre')
    .is('year', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  const batch: SongEnrichCandidate[] = ((rows ?? []) as SongRow[])
    .filter((row) => row.title?.trim() && songNeedsYearEnrichment(row))
    .map((row) => ({
      id: row.id,
      title: String(row.title).trim(),
      artist: row.artist?.trim() || null,
      year: parseSongYear(row.year),
      genre: row.genre,
    }))

  const { count: nullYearCount } = await supabase
    .from('songs')
    .select('id', { count: 'exact', head: true })
    .is('year', null)

  let processed = 0
  let updated = 0
  let failed = 0

  for (let i = 0; i < batch.length; i++) {
    const song = batch[i]
    if (i > 0) await sleep(MUSICBRAINZ_SLEEP_MS)

    processed += 1
    try {
      const mb = await fetchMusicBrainzSongEnrichment(song.artist, song.title)
      if (!mb) {
        failed += 1
        continue
      }

      const patch = buildEnrichmentUpdate(song, mb)
      if (!patch) {
        failed += 1
        continue
      }

      const { error: updateError } = await supabase.from('songs').update(patch).eq('id', song.id)

      if (updateError) {
        failed += 1
        continue
      }

      updated += 1
    } catch (e) {
      console.warn('[songs/enrich] MusicBrainz lookup failed:', song.id, e)
      failed += 1
    }
  }

  const remaining = Math.max(0, (nullYearCount ?? 0) - updated)

  return NextResponse.json({
    ok: true,
    processed,
    updated,
    failed,
    remaining,
  })
}
