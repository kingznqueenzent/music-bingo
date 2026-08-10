import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { startGameSession } from '@/lib/game-start'

/** Host: start game — set playing, call first random unplayed track. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { gameId } = body as { gameId?: string }
    if (!gameId) {
      return NextResponse.json({ ok: false, error: 'Missing gameId' }, { status: 400 })
    }

    const supabase = createClient()
    const result = await startGameSession(supabase, gameId)
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 200 })
    }
    return NextResponse.json({ ok: true, playlistSongId: result.playlistSongId })
  } catch (e) {
    console.error('[start-game]', e)
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
