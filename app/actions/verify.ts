'use server'

import { createClient } from '@/lib/supabase/server'
import { toEvaluatorPattern, verifyBingoFromCells } from '@/lib/bingo-evaluator'

/** Check if the card has a winning pattern given the set of played song IDs. */
export async function verifyBingo(
  cardId: string,
  gameId: string
): Promise<{ valid: boolean; error?: string }> {
  const supabase = createClient()

  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('mode, grid_size')
    .eq('id', gameId)
    .single()
  if (gameError || !game) return { valid: false, error: 'Game not found' }

  const gridSize = game.grid_size === 4 ? 4 : 5

  const { data: card, error: cardError } = await supabase
    .from('cards')
    .select('id, game_id')
    .eq('id', cardId)
    .eq('game_id', gameId)
    .single()

  if (cardError || !card) {
    return { valid: false, error: 'Card not found' }
  }

  const { data: cells, error: cellsError } = await supabase
    .from('card_cells')
    .select('position, playlist_song_id')
    .eq('card_id', cardId)

  if (cellsError || !cells?.length) {
    return { valid: false, error: 'Card has no cells' }
  }

  const { data: played, error: playedError } = await supabase
    .from('played_songs')
    .select('playlist_song_id')
    .eq('game_id', gameId)

  if (playedError) {
    return { valid: false, error: playedError.message }
  }

  const calledIds = played?.map((p) => p.playlist_song_id) ?? []
  const markedIds = cells.map((c) => c.playlist_song_id)
  const result = verifyBingoFromCells(
    cells,
    markedIds,
    calledIds,
    toEvaluatorPattern(game.mode),
    gridSize
  )
  return { valid: result.valid, error: result.error }
}

/**
 * Manual tap mode: verify using the player's marked song IDs against the host's master list (played_songs).
 * Every marked song must have been played by the host; marked positions must form a valid winning pattern.
 */
export async function verifyBingoWithMarks(
  cardId: string,
  gameId: string,
  markedPlaylistSongIds: string[]
): Promise<{ valid: boolean; error?: string; playerName?: string }> {
  const supabase = createClient()

  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('mode, grid_size')
    .eq('id', gameId)
    .single()
  if (gameError || !game) return { valid: false, error: 'Game not found' }

  const gridSize = game.grid_size === 4 ? 4 : 5

  const { data: card, error: cardError } = await supabase
    .from('cards')
    .select('id, game_id, player_name')
    .eq('id', cardId)
    .eq('game_id', gameId)
    .single()
  if (cardError || !card) return { valid: false, error: 'Card not found' }

  const { data: cells, error: cellsError } = await supabase
    .from('card_cells')
    .select('position, playlist_song_id')
    .eq('card_id', cardId)
    .order('position')
  if (cellsError || !cells?.length) return { valid: false, error: 'Card has no cells' }

  const { data: played } = await supabase
    .from('played_songs')
    .select('playlist_song_id')
    .eq('game_id', gameId)

  const markedSet = new Set(markedPlaylistSongIds)
  const playerName = (card as { player_name?: string }).player_name

  const result = verifyBingoFromCells(
    cells,
    markedSet,
    played?.map((p) => p.playlist_song_id) ?? [],
    toEvaluatorPattern(game.mode),
    gridSize
  )
  return {
    valid: result.valid,
    error: result.error,
    playerName: result.valid ? playerName : undefined,
  }
}
