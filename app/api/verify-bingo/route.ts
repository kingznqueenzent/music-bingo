import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyBingo } from '@/app/actions/verify'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { gameId, playerIdentifier, cardId } = body as {
      gameId?: string
      playerIdentifier?: string
      cardId?: string
    }

    const supabase = createClient()
    let targetCardId = cardId

    if (!targetCardId && gameId && playerIdentifier) {
      const { data: card } = await supabase
        .from('cards')
        .select('id')
        .eq('game_id', gameId)
        .eq('player_identifier', playerIdentifier.trim())
        .single()
      targetCardId = card?.id ?? null
    }

    if (!targetCardId || !gameId) {
      return NextResponse.json(
        { valid: false, error: 'Missing cardId or (gameId + playerIdentifier)' },
        { status: 400 }
      )
    }

    const result = await verifyBingo(targetCardId, gameId)
    if (result.valid) {
      const { data: card } = await supabase
        .from('cards')
        .select('player_identifier')
        .eq('id', targetCardId)
        .single()
      const { data: game } = await supabase
        .from('games')
        .select('mode')
        .eq('id', gameId)
        .single()
      await supabase.from('wins').upsert(
        {
          game_id: gameId,
          card_id: targetCardId,
          player_identifier: card?.player_identifier ?? null,
          mode: game?.mode ?? 'line',
          round: 1,
        },
        { onConflict: 'game_id,card_id,round', ignoreDuplicates: true }
      )
    }
    return NextResponse.json({ valid: result.valid, error: result.error })
  } catch (e) {
    return NextResponse.json({ valid: false, error: String(e) }, { status: 500 })
  }
}
