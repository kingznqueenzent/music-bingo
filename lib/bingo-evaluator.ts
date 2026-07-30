import { getFreeCenterPosition } from '@/lib/bingo-win-pattern'

/** Win patterns supported by the pure evaluator (uppercase API). */
export type EvaluatorPattern = 'LINE' | 'CORNERS' | 'X_PATTERN' | 'BLACKOUT'

export type BoardSong = {
  position: number
  songId: string
}

export type VerifyBingoResult = {
  valid: boolean
  error?: string
  /** Winning cell positions when valid (0-indexed row-major). */
  winningPositions?: number[]
}

function inferGridSize(boardSongs: BoardSong[]): number {
  if (boardSongs.length === 0) return 5
  const maxPos = Math.max(...boardSongs.map((s) => s.position))
  if (maxPos < 16) return 4
  return 5
}

function buildLines(size: number): number[][] {
  const rows = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => r * size + c)
  )
  const cols = Array.from({ length: size }, (_, c) =>
    Array.from({ length: size }, (_, r) => r * size + c)
  )
  const diags = [
    Array.from({ length: size }, (_, i) => i * size + i),
    Array.from({ length: size }, (_, i) => (i + 1) * size - 1 - i),
  ]
  return [...rows, ...cols, ...diags]
}

function cornerPositions(size: number): number[] {
  return [0, size - 1, size * (size - 1), size * size - 1]
}

/** Map DB / UI win mode strings to evaluator pattern enum. */
export function toEvaluatorPattern(raw: string | null | undefined): EvaluatorPattern {
  const s = (raw ?? '')
    .toString()
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

  if (s === 'BLACKOUT' || s === 'FULL_HOUSE' || s === 'FULLHOUSE' || s === 'BLACK_OUT') {
    return 'BLACKOUT'
  }
  if (
    s === 'X' ||
    s === 'X_PATTERN' ||
    s === 'DOUBLE_DIAGONAL' ||
    s === 'CROSS' ||
    s === 'DIAGONALS'
  ) {
    return 'X_PATTERN'
  }
  if (s === 'CORNERS' || s === 'FOUR_CORNERS' || s === 'CORNER') {
    return 'CORNERS'
  }
  return 'LINE'
}

/**
 * Pure bingo verification: marked cells must match `calledSongIds`, form `pattern`,
 * and honor the center FREE space (5×5 position 12) as auto-marked.
 */
export function verifyBingo(
  boardSongs: BoardSong[],
  markedSongs: Iterable<string>,
  calledSongIds: Iterable<string>,
  pattern: EvaluatorPattern,
  gridSize?: number
): VerifyBingoResult {
  const size = gridSize ?? inferGridSize(boardSongs)
  const marked = markedSongs instanceof Set ? markedSongs : new Set(markedSongs)
  const called = calledSongIds instanceof Set ? calledSongIds : new Set(calledSongIds)
  const positionToSong = new Map(boardSongs.map((s) => [s.position, s.songId]))
  const freePos = getFreeCenterPosition(size)

  const isMarked = (pos: number): boolean => {
    if (freePos !== null && pos === freePos) return true
    const songId = positionToSong.get(pos)
    return songId != null && marked.has(songId)
  }

  for (const songId of marked) {
    if (!called.has(songId)) {
      return {
        valid: false,
        error: 'Invalid Bingo – a marked song has not been called by the host yet.',
      }
    }
  }

  const lineComplete = (positions: number[]) => positions.every((p) => isMarked(p))

  if (pattern === 'BLACKOUT') {
    const all = Array.from({ length: size * size }, (_, i) => i)
    const ok = lineComplete(all)
    return ok
      ? { valid: true, winningPositions: all }
      : { valid: false, error: 'Blackout pattern is not complete.' }
  }

  if (pattern === 'CORNERS') {
    const corners = cornerPositions(size)
    const ok = lineComplete(corners)
    return ok
      ? { valid: true, winningPositions: corners }
      : { valid: false, error: 'Four corners are not marked.' }
  }

  if (pattern === 'X_PATTERN') {
    const diags = buildLines(size).slice(size * 2)
    const ok = diags.every((line) => lineComplete(line))
    const winning = [...new Set(diags.flat())]
    return ok
      ? { valid: true, winningPositions: winning }
      : { valid: false, error: 'X pattern (both diagonals) is not complete.' }
  }

  const lines = buildLines(size)
  for (const line of lines) {
    if (lineComplete(line)) {
      return { valid: true, winningPositions: line }
    }
  }

  return { valid: false, error: 'No winning line yet.' }
}

/** Convenience adapter from card cell rows used across the app. */
export function verifyBingoFromCells(
  cells: { position: number; playlist_song_id: string }[],
  markedPlaylistSongIds: Iterable<string>,
  calledPlaylistSongIds: Iterable<string>,
  pattern: EvaluatorPattern,
  gridSize?: number
): VerifyBingoResult {
  return verifyBingo(
    cells.map((c) => ({ position: c.position, songId: c.playlist_song_id })),
    markedPlaylistSongIds,
    calledPlaylistSongIds,
    pattern,
    gridSize
  )
}
