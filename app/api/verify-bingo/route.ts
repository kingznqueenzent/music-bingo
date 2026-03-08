import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyBingo, verifyBingoWithMarks } from '@/app/actions/verify'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { gameId, playerIdentifier, cardId, markedPlaylistSongIds } = body as {
      gameId?: string
      playerIdentifier?: string
      cardId?: string
      markedPlaylistSongIds?: string[]
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

    const useManualMarks = Array.isArray(markedPlaylistSongIds) && markedPlaylistSongIds.length > 0
    const result = useManualMarks
      ? await verifyBingoWithMarks(targetCardId, gameId, markedPlaylistSongIds)
      : await verifyBingo(targetCardId, gameId)

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

    return NextResponse.json({
      valid: result.valid,
      error: result.error,
      playerName: result.playerName ?? undefined,
    })
  } catch (e) {
    return NextResponse.json({ valid: false, error: String(e) }, { status: 500 })
  }
}
