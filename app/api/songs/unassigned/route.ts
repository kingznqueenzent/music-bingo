import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ADMIN_COOKIE, isAdminCookieValue } from '@/lib/admin-access'
import { allDecadeThemeNames } from '@/lib/decade-theme-catalog'
import { isDecadeThemeName, titleHasYoutubeArtifact } from '@/lib/media/decade-theme-assignment'
import {
  checkMediaLibraryAccessForClient,
  mediaLibraryBlockedResponse,
} from '@/lib/media/media-library-access-server'

async function requireHostCookie(): Promise<boolean> {
  const jar = await cookies()
  return isAdminCookieValue(jar.get(ADMIN_COOKIE)?.value)
}

type SongRow = {
  id: string
  theme_id: string | null
  title: string
  artist: string | null
}

/** Delete uncategorized/junk catalog songs (not on decade-genre themes). */
export async function DELETE() {
  if (!(await requireHostCookie())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient()
  const access = await checkMediaLibraryAccessForClient(supabase)
  if (!access.allowed) {
    return mediaLibraryBlockedResponse(access.tier)
  }

  const decadeNames = allDecadeThemeNames()

  const { data: decadeThemes, error: themeErr } = await supabase
    .from('themes')
    .select('id, name')
    .in('name', decadeNames)

  if (themeErr) return NextResponse.json({ error: themeErr.message }, { status: 500 })

  const decadeIds = new Set((decadeThemes ?? []).filter((t) => isDecadeThemeName(t.name)).map((t) => t.id))

  const pageSize = 1000
  const deleteIds: string[] = []
  let page = 0

  while (true) {
    const from = page * pageSize
    const to = from + pageSize - 1
    const { data, error } = await supabase
      .from('songs')
      .select('id, theme_id, title, artist')
      .range(from, to)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data?.length) break

    for (const row of data as SongRow[]) {
      const junkArtist = (row.artist ?? '').trim().toLowerCase() === 'unknown artist'
      const uncategorized = !row.theme_id || !decadeIds.has(row.theme_id)
      if (uncategorized || junkArtist || titleHasYoutubeArtifact(row.title)) {
        deleteIds.push(row.id)
      }
    }

    if (data.length < pageSize) break
    page += 1
  }

  if (deleteIds.length === 0) {
    return NextResponse.json({ ok: true, deleted: 0 })
  }

  let deleted = 0
  for (let i = 0; i < deleteIds.length; i += 200) {
    const chunk = deleteIds.slice(i, i + 200)
    const { error, count } = await supabase.from('songs').delete({ count: 'exact' }).in('id', chunk)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    deleted += count ?? chunk.length
  }

  return NextResponse.json({ ok: true, deleted })
}
