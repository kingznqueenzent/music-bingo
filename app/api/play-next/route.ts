import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** Host: play next song – add to played_songs and set as current. Called by host dashboard Play button. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { gameId, playlistSongId } = body as { gameId?: string; playlistSongId?: string }
    if (!gameId || !playlistSongId) {
      return NextResponse.json({ ok: false, error: 'Missing gameId or playlistSongId' }, { status: 400 })
    }

    const supabase = createClient()
    const { error: playedError } = await supabase.from('played_songs').insert({
      game_id: gameId,
      playlist_song_id: playlistSongId,
    })
    if (playedError) {
      const msg = [playedError.message, playedError.details, playedError.hint].filter(Boolean).join(' ')
      return NextResponse.json({ ok: false, error: msg || playedError.message }, { status: 200 })
    }
    const { error: updateError } = await supabase
      .from('games')
      .update({ current_song_id: playlistSongId, status: 'playing' })
      .eq('id', gameId)
    if (updateError) {
      const msg = [updateError.message, updateError.details, updateError.hint].filter(Boolean).join(' ')
      return NextResponse.json({ ok: false, error: msg || updateError.message }, { status: 200 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
