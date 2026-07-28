import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { applyParticipationSession } from '@/lib/player-progress'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cardId, gameId, playerName } = body as {
      cardId?: string
      gameId?: string
      playerName?: string
    }

    if (!cardId || !gameId || !playerName?.trim()) {
      return NextResponse.json(
        { ok: false, error: 'Missing cardId, gameId, or playerName' },
        { status: 400 }
      )
    }

    const supabase = createClient()
    const result = await applyParticipationSession(supabase, {
      gameId,
      cardId,
      playerName: playerName.trim(),
    })

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      xpGained: result.xpGained,
      breakdown: result.breakdown,
      newBadges: result.newBadges,
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
