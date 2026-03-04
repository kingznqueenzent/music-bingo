/**
 * Generates a unique N×N bingo card by shuffling a subset of playlist song IDs.
 * gridSize 5 = 5×5 (25 cells), gridSize 4 = 4×4 (16 cells). Each card is random.
 */
const MIN_SONGS_5X5 = 45
const MIN_SONGS_4X4 = 32

function shuffle<T>(array: T[]): T[] {
  const out = [...array]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Pick N×N random song IDs from the playlist (no duplicates per card).
 * gridSize 5: min 45 songs; gridSize 4: min 32 songs (for variety).
 */
export function generateCardLayout(
  songIds: string[],
  gridSize: 4 | 5 = 5
): { position: number; playlistSongId: string }[] {
  const cellCount = gridSize * gridSize
  const minSongs = gridSize === 5 ? MIN_SONGS_5X5 : MIN_SONGS_4X4
  if (songIds.length < minSongs) {
    throw new Error(
      `Need at least ${minSongs} songs for ${gridSize}×${gridSize} grid, got ${songIds.length}`
    )
  }
  const shuffled = shuffle(songIds)
  return shuffled.slice(0, cellCount).map((playlistSongId, index) => ({
    position: index,
    playlistSongId,
  }))
}
