import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { awardBingoBonus, computeAccuracy } from '@/lib/game-scoring'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      gameId?: string
      cardId?: string
      playerName?: string
      playerIdentifier?: string
    }

    const gameId = body.gameId?.trim()
    const cardId = body.cardId?.trim()
    if (!gameId || !cardId) {
      return NextResponse.json(
        { ok: false, error: 'gameId and cardId are required' },
        { status: 400 }
      )
    }

    const supabase = createClient()
    const outcome = await awardBingoBonus(supabase, {
      gameId,
      cardId,
      playerName: body.playerName,
      playerIdentifier: body.playerIdentifier,
    })

    if (!outcome.row) {
      return NextResponse.json(
        { ok: false, error: outcome.error ?? 'Failed to award bingo bonus' },
        { status: 500 }
      )
    }

    const row = outcome.row
    return NextResponse.json({
      ok: true,
      awarded: outcome.awarded,
      score: row.score,
      bingoCompletedAt: row.bingo_completed_at,
      accuracy: computeAccuracy(row.correct_taps, row.wrong_taps),
      streakCurrent: row.streak_current,
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
