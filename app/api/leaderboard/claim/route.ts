import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const POINTS_PER_WIN = 10

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

    await supabase.from('wins').update({ claimed_at: new Date().toISOString() }).eq('id', win.id)

    const { data: card } = await supabase
      .from('cards')
      .select('player_identifier')
      .eq('id', cardId)
      .eq('game_id', gameId)
      .single()

    const identifier = (card?.player_identifier ?? cardId).trim() || cardId

    const { data: existing } = await supabase
      .from('leaderboard')
      .select('id, wins, points')
      .eq('identifier', identifier)
      .single()

    const now = new Date().toISOString()
    if (existing) {
      const { error: updateError } = await supabase
        .from('leaderboard')
        .update({
          player_name: playerName.trim(),
          wins: existing.wins + 1,
          points: (existing.points ?? 0) + POINTS_PER_WIN,
          last_played: now,
          updated_at: now,
        })
        .eq('id', existing.id)

      if (updateError) {
        return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 })
      }
    } else {
      const { error: insertError } = await supabase.from('leaderboard').insert({
        player_name: playerName.trim(),
        identifier,
        wins: 1,
        points: POINTS_PER_WIN,
        last_played: now,
        updated_at: now,
      })

      if (insertError) {
        return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
