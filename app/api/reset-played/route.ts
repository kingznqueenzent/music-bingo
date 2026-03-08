import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** Host: reset played list for a game – clear played_songs and current song so "Up next" is full again. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { gameId } = body as { gameId?: string }
    if (!gameId) {
      return NextResponse.json({ ok: false, error: 'Missing gameId' }, { status: 400 })
    }

    const supabase = createClient()
    const { error: deleteError } = await supabase
      .from('played_songs')
      .delete()
      .eq('game_id', gameId)
    if (deleteError) {
      const msg = [deleteError.message, deleteError.details, deleteError.hint].filter(Boolean).join(' ')
      return NextResponse.json({ ok: false, error: msg || deleteError.message }, { status: 200 })
    }
    await supabase
      .from('games')
      .update({ current_song_id: null })
      .eq('id', gameId)
    return NextResponse.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
