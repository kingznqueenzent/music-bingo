import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ADMIN_COOKIE, isAdminCookieValue } from '@/lib/admin-access'
import { createClient } from '@/lib/supabase/server'
import { autoCategorizeSong } from '@/lib/songAutoCategorizer'
import {
  checkMediaLibraryAccessForClient,
  mediaLibraryBlockedResponse,
} from '@/lib/media/media-library-access-server'

async function requireHostCookie(): Promise<boolean> {
  const jar = await cookies()
  return isAdminCookieValue(jar.get(ADMIN_COOKIE)?.value)
}

/** Auto-categorize one or many song titles (keywords + MusicBrainz). */
export async function POST(request: NextRequest) {
  if (!(await requireHostCookie())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as { titles?: string[]; title?: string }
  const titles = body.titles ?? (body.title ? [body.title] : [])

  if (titles.length === 0) {
    return NextResponse.json({ error: 'No titles provided.' }, { status: 400 })
  }

  const access = await checkMediaLibraryAccessForClient(createClient())
  if (!access.allowed) {
    return mediaLibraryBlockedResponse(access.tier)
  }

  const results = []
  for (let i = 0; i < titles.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 1100))
    results.push(await autoCategorizeSong(titles[i]))
  }

  return NextResponse.json({ results })
}
