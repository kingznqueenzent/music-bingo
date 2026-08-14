/**
 * Generates a unique N×N bingo card by shuffling a subset of playlist song IDs.
 * gridSize 5 = 5×5 (25 cells), gridSize 4 = 4×4 (16 cells). Each card is random.
 */
import type { GridData } from '@/types/database-extras'

const MIN_SONGS_5X5 = 45
const MIN_SONGS_4X4 = 32

/** Minimum playlist size to deal unique cards (variety across players). */
export function minSongsForGrid(gridSize: 4 | 5): number {
  return gridSize === 5 ? MIN_SONGS_5X5 : MIN_SONGS_4X4
}

/** Fisher–Yates shuffle (non-mutating). Used for playlist queue order and card layout. */
export function shuffleArray<T>(array: T[]): T[] {
  const out = [...array]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function shuffle<T>(array: T[]): T[] {
  return shuffleArray(array)
}

function pickGridIds(ids: string[], gridSize: 4 | 5): string[] {
  const cellCount = gridSize * gridSize
  const minSongs = minSongsForGrid(gridSize)
  if (ids.length < minSongs) {
    throw new Error(
      `Need at least ${minSongs} songs for ${gridSize}×${gridSize} grid, got ${ids.length}`
    )
  }
  return shuffle(ids).slice(0, cellCount)
}

export function generateCardLayout(
  songIds: string[],
  gridSize: 4 | 5 = 5
): { position: number; playlistSongId: string }[] {
  return pickGridIds(songIds, gridSize).map((playlistSongId, index) => ({
    position: index,
    playlistSongId,
  }))
}

export type TrackPoolEntry = {
  trackId: string
  title: string
  artist?: string | null
  playlistSongId?: string
}

/** Choice A: build cards.grid_data from bingo_game_tracks (jsonb). */
export function generateGridFromTrackPool(entries: TrackPoolEntry[], gridSize: 4 | 5 = 5): GridData {
  const ids = entries.map((e) => e.trackId)
  const byId = new Map(entries.map((e) => [e.trackId, e]))
  return pickGridIds(ids, gridSize).map((trackId, position) => {
    const row = byId.get(trackId)!
    return {
      position,
      track_id: trackId,
      title: row.title,
      artist: row.artist ?? null,
      playlist_song_id: row.playlistSongId,
      marked: false,
    }
  })
}
