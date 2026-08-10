import type { SupabaseClient } from '@supabase/supabase-js'

export const START_GAME_EMPTY_PLAYLIST_ERROR = 'Add songs to this theme before starting'

export type StartGameResult =
  | { ok: true; playlistSongId: string }
  | { ok: false; error: string }

/** Host: validate playlist inventory, call first unplayed track, set game to playing. */
export async function startGameSession(
  supabase: SupabaseClient,
  gameId: string
): Promise<StartGameResult> {
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('id, playlist_id')
    .eq('id', gameId)
    .single()

  if (gameError || !game) {
    console.error('[startGameSession] load game', gameError?.message)
    return { ok: false, error: gameError?.message ?? 'Game not found.' }
  }

  if (!game.playlist_id) {
    return { ok: false, error: START_GAME_EMPTY_PLAYLIST_ERROR }
  }

  const { data: songs, error: songsError } = await supabase
    .from('playlist_songs')
    .select('id')
    .eq('playlist_id', game.playlist_id)
    .order('position')

  if (songsError) {
    console.error('[startGameSession] load playlist_songs', songsError.message)
    return { ok: false, error: songsError.message }
  }

  if (!songs?.length) {
    return { ok: false, error: START_GAME_EMPTY_PLAYLIST_ERROR }
  }

  const { data: playedRows, error: playedError } = await supabase
    .from('played_songs')
    .select('playlist_song_id')
    .eq('game_id', gameId)

  if (playedError) {
    console.error('[startGameSession] load played_songs', playedError.message)
    return { ok: false, error: playedError.message }
  }

  const playedIds = new Set(playedRows?.map((row) => row.playlist_song_id) ?? [])
  const upNext = songs.filter((song) => !playedIds.has(song.id))

  if (upNext.length === 0) {
    return {
      ok: false,
      error: 'All tracks have been played. Reset the played list to start again.',
    }
  }

  const pick = upNext[Math.floor(Math.random() * upNext.length)]

  const { error: insertError } = await supabase.from('played_songs').insert({
    game_id: gameId,
    playlist_song_id: pick.id,
  })

  if (insertError) {
    console.error('[startGameSession] insert played_songs', insertError.message)
    const msg = [insertError.message, insertError.details, insertError.hint].filter(Boolean).join(' ')
    return { ok: false, error: msg || insertError.message }
  }

  const { error: updateError } = await supabase
    .from('games')
    .update({ status: 'playing', current_song_id: pick.id })
    .eq('id', gameId)

  if (updateError) {
    console.error('[startGameSession] update games', updateError.message)
    const msg = [updateError.message, updateError.details, updateError.hint].filter(Boolean).join(' ')
    return { ok: false, error: msg || updateError.message }
  }

  return { ok: true, playlistSongId: pick.id }
}
