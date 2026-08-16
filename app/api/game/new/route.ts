import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ADMIN_COOKIE, isAdminCookieValue } from '@/lib/admin-access'
import { startNewGameFromExisting } from '@/lib/game-lifecycle'

/** Host: start a fresh lobby from the current game (new id when live, reset when LYRIC). */
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
    const result = await startNewGameFromExisting(supabase, gameId)
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 200 })
    }
    return NextResponse.json({
      ok: true,
      gameId: result.gameId,
      roomCode: result.roomCode,
      reusedSameGame: result.reusedSameGame,
    })
  } catch (e) {
    console.error('[game/new]', e)
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
