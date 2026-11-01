import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { recordCorrectTap, recordWrongTap, computeAccuracy } from '@/lib/game-scoring'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      gameId?: string
      cardId?: string
      playerName?: string
      playerIdentifier?: string
      result?: 'correct' | 'wrong'
    }

    const gameId = body.gameId?.trim()
    const cardId = body.cardId?.trim()
    const result = body.result

    if (!gameId || !cardId || (result !== 'correct' && result !== 'wrong')) {
      return NextResponse.json(
        { ok: false, error: 'gameId, cardId, and result (correct|wrong) are required' },
        { status: 400 }
      )
    }

    const supabase = createClient()
    const params = {
      gameId,
      cardId,
      playerName: body.playerName,
      playerIdentifier: body.playerIdentifier,
    }

    const outcome =
      result === 'correct'
        ? await recordCorrectTap(supabase, params)
        : await recordWrongTap(supabase, params)

    if (!outcome.row) {
      return NextResponse.json(
        { ok: false, error: outcome.error ?? 'Failed to update score' },
        { status: 500 }
      )
    }

    const row = outcome.row
    return NextResponse.json({
      ok: true,
      score: row.score,
      correctTaps: row.correct_taps,
      wrongTaps: row.wrong_taps,
      streakCurrent: row.streak_current,
      streakBest: row.streak_best,
      accuracy: computeAccuracy(row.correct_taps, row.wrong_taps),
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
