import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyHostPrize, updateLeaderboardStats } from '@/lib/game-session'

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

    const { data: win } = await supabase
      .from('wins')
      .select('id, claimed_at')
      .eq('game_id', gameId)
      .eq('card_id', cardId)
      .limit(1)
      .single()

    if (!win) {
      return NextResponse.json(
        { ok: false, error: 'No verified win found for this card. The host must verify BINGO first.' },
        { status: 403 }
      )
    }

    if ((win as { claimed_at?: string | null }).claimed_at) {
      return NextResponse.json(
        { ok: false, error: 'This win was already claimed for the leaderboard.' },
        { status: 403 }
      )
    }

    const progress = await updateLeaderboardStats(supabase, {
      gameId,
      cardId,
      playerName: playerName.trim(),
    })

    if (!progress.ok) {
      return NextResponse.json({ ok: false, error: progress.error }, { status: 400 })
    }

    const now = new Date().toISOString()
    const { error: claimErr } = await supabase.from('wins').update({ claimed_at: now }).eq('id', win.id)
    if (claimErr) {
      return NextResponse.json({ ok: false, error: claimErr.message }, { status: 500 })
    }

    await notifyHostPrize(supabase, gameId, {
      cardId,
      playerName: playerName.trim(),
      prizeId: 'leaderboard_claim',
    })

    return NextResponse.json({
      ok: true,
      xpGained: progress.xpGained,
      breakdown: progress.breakdown,
      newBadges: progress.newBadges,
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
