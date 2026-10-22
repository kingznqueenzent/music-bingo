import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { ADMIN_COOKIE, isAdminCookieValue } from '@/lib/admin-access'
import {
  checkMediaLibraryAccessForClient,
  mediaLibraryBlockedResponse,
} from '@/lib/media/media-library-access-server'
import { isUntaggedStoredGenre } from '@/lib/media/detect-genre'
import { parseSongYear } from '@/types/song'
import {
  ITUNES_SLEEP_MS,
  buildEnrichmentUpdate,
  fetchItunesSongEnrichment,
  sleep,
  songNeedsEnrichment,
  type SongEnrichCandidate,
} from '@/lib/media/itunes-enrich'

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
 * Batch-enrich catalog songs missing year and/or genre via public iTunes Search API.
 * Admin cookie gate + service role. Fills gaps only — does not overwrite tagged genres.
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

  // Prefer year-null first; also include untagged genres. Fetch a page then filter in-memory
  // so we don't fight PostgREST OR quirks on null/empty genre.
  const pageSize = Math.max(limit * 4, 100)
  const { data: rows, error: fetchError } = await supabase
    .from('songs')
    .select('id, title, artist, year, genre')
    .order('created_at', { ascending: false })
    .limit(pageSize)

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  const candidates: SongEnrichCandidate[] = ((rows ?? []) as SongRow[])
    .filter((row) => row.title?.trim() && songNeedsEnrichment(row))
    .map((row) => ({
      id: row.id,
      title: String(row.title).trim(),
      artist: row.artist?.trim() || null,
      year: parseSongYear(row.year),
      genre: row.genre,
    }))

  const batch = candidates.slice(0, limit)

  // Approximate remaining after this chunk (candidates beyond batch + any not in this page).
  // A second count query keeps the UI progress counter honest for large catalogs.
  const { count: nullYearCount } = await supabase
    .from('songs')
    .select('id', { count: 'exact', head: true })
    .is('year', null)

  let processed = 0
  let updated = 0
  let failed = 0

  for (let i = 0; i < batch.length; i++) {
    const song = batch[i]
    if (i > 0) await sleep(ITUNES_SLEEP_MS)

    processed += 1
    try {
      const itunes = await fetchItunesSongEnrichment(song.artist, song.title)
      if (!itunes) {
        failed += 1
        continue
      }

      const patch = buildEnrichmentUpdate(song, itunes)
      if (!patch) {
        // iTunes returned data but nothing usable for gaps
        failed += 1
        continue
      }

      // Soft-fail genre column if migration not applied yet
      const { error: updateError } = await supabase.from('songs').update(patch).eq('id', song.id)

      if (updateError) {
        if (patch.genre !== undefined && /genre|column|schema cache/i.test(updateError.message)) {
          const yearOnly = patch.year !== undefined ? { year: patch.year } : null
          if (yearOnly) {
            const { error: yearError } = await supabase
              .from('songs')
              .update(yearOnly)
              .eq('id', song.id)
            if (yearError) {
              failed += 1
              continue
            }
            updated += 1
            continue
          }
        }
        failed += 1
        continue
      }

      updated += 1
    } catch (e) {
      console.warn('[songs/enrich] iTunes lookup failed:', song.id, e)
      failed += 1
    }
  }

  // Remaining ≈ songs still needing year (primary signal) minus what we just fixed,
  // plus any untagged-with-year that may remain in this page.
  const stillNeedInPage = candidates.length - batch.length
  const untaggedWithYearLeft = candidates.filter(
    (c) => c.year != null && isUntaggedStoredGenre(c.genre) && !batch.some((b) => b.id === c.id)
  ).length
  const remaining = Math.max(
    0,
    (nullYearCount ?? 0) - updated + stillNeedInPage + untaggedWithYearLeft
  )

  return NextResponse.json({
    ok: true,
    processed,
    updated,
    failed,
    remaining,
  })
}
