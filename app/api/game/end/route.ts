import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ADMIN_COOKIE, isAdminCookieValue } from '@/lib/admin-access'
import { endGameSession } from '@/lib/game-lifecycle'

/** Host: end the current game session (status → ended). */
export async function POST(request: NextRequest) {
  const jar = await cookies()
  if (!isAdminCookieValue(jar.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await request.json()) as { gameId?: string }
    const gameId = body.gameId?.trim()
    if (!gameId) {
      return NextResponse.json({ ok: false, error: 'Missing gameId' }, { status: 400 })
    }

    const supabase = createClient()
    const result = await endGameSession(supabase, gameId)
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 200 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[game/end]', e)
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
