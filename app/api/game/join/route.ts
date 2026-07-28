import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { joinGame } from '@/lib/game-session'

/** Base44 joinGame — POST /api/game/join */
export async function POST(req: NextRequest) {
  let body: { gameCode?: string; playerName?: string; playerIdentifier?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const supabase = createClient()
  const result = await joinGame(
    supabase,
    body.gameCode ?? '',
    body.playerName ?? '',
    body.playerIdentifier
  )

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status ?? 400 })
  }

  return NextResponse.json({
    ok: true,
    cardId: result.cardId,
    gameId: result.gameId,
    playerId: result.playerId,
    alreadyJoined: result.alreadyJoined ?? false,
  })
}
