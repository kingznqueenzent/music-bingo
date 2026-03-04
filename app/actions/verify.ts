'use server'

import { createClient } from '@/lib/supabase/server'

type WinPattern = 'line' | 'x' | 'blackout'

const ROWS_5 = [
  [0, 1, 2, 3, 4],
  [5, 6, 7, 8, 9],
  [10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24],
]
const COLS_5 = [0, 1, 2, 3, 4].map((c) => [c, c + 5, c + 10, c + 15, c + 20])
const DIAGS_5: [number[], number[]] = [
  [0, 6, 12, 18, 24],
  [4, 8, 12, 16, 20],
]

const ROWS_4 = [
  [0, 1, 2, 3],
  [4, 5, 6, 7],
  [8, 9, 10, 11],
  [12, 13, 14, 15],
]
const COLS_4 = [0, 1, 2, 3].map((c) => [c, c + 4, c + 8, c + 12])
const DIAGS_4: [number[], number[]] = [
  [0, 5, 10, 15],
  [3, 6, 9, 12],
]

/**
 * Check if the card has a winning pattern given the set of played song IDs.
 * mode: 'line' = any single line (row/col/diag), 'x' = both diagonals, 'blackout' = all cells.
 */
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

  const mode = (game.mode as WinPattern) || 'line'
  const gridSize = game.grid_size === 4 ? 4 : 5
  const cellCount = gridSize * gridSize

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

  const playedSet = new Set(played?.map((p) => p.playlist_song_id) ?? [])
  const positionToSong = new Map<number, string>()
  for (const c of cells) {
    positionToSong.set(c.position, c.playlist_song_id)
  }

  const isLineComplete = (positions: number[]) =>
    positions.every((pos) => {
      const songId = positionToSong.get(pos)
      return songId != null && playedSet.has(songId)
    })

  if (mode === 'blackout') {
    const allPositions = Array.from({ length: cellCount }, (_, i) => i)
    return { valid: isLineComplete(allPositions) }
  }

  const ROWS = gridSize === 4 ? ROWS_4 : ROWS_5
  const COLS = gridSize === 4 ? COLS_4 : COLS_5
  const DIAGS = gridSize === 4 ? DIAGS_4 : DIAGS_5

  if (mode === 'x') {
    const bothDiags = DIAGS.every((line) => isLineComplete(line))
    return { valid: bothDiags }
  }

  for (const line of [...ROWS, ...COLS, ...DIAGS]) {
    if (isLineComplete(line)) {
      return { valid: true }
    }
  }
  return { valid: false }
}
