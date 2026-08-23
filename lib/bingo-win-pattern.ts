/**
 * Single source of truth for how we interpret `games.mode` from DB / Kingz Control / API.
 * Unknown values safely default to 'line' (any row, col, or diagonal).
 */
export type WinPattern = 'line' | 'x' | 'blackout' | 'corners'

export function normalizeWinPattern(raw: string | null | undefined): WinPattern {
  const s = (raw ?? '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')

  if (s === 'blackout' || s === 'full_house' || s === 'fullhouse' || s === 'full' || s === 'black_out') {
    return 'blackout'
  }
  if (
    s === 'x' ||
    s === 'x_pattern' ||
    s === 'double_diagonal' ||
    s === 'cross' ||
    s === 'diagonals' ||
    s === 'two_diagonals'
  ) {
    return 'x'
  }
  if (s === 'corners' || s === 'four_corners' || s === 'corner') {
    return 'corners'
  }
  if (s === 'line' || s === 'any_line' || s === 'single_line' || s === 'row' || s === '') {
    return 'line'
  }
  return 'line'
}

/** Center FREE space on standard 5×5 cards (row 2, col 2). */
export function getFreeCenterPosition(size: number): number | null {
  if (size !== 5) return null
  return 2 * size + 2
}

function isMarkedAt(
  pos: number,
  markedSongIds: Set<string>,
  positionToSong: Map<number, string>,
  size: number
): boolean {
  const free = getFreeCenterPosition(size)
  if (free !== null && pos === free) return true
  const id = positionToSong.get(pos)
  return id != null && markedSongIds.has(id)
}

function buildPatternLines(size: number): {
  rows: number[][]
  cols: number[][]
  diags: number[][]
  corners: number[]
  all: number[]
} {
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
  const corners = [0, size - 1, size * (size - 1), size * size - 1]
  const all = Array.from({ length: size * size }, (_, i) => i)
  return { rows, cols, diags, corners, all }
}

/**
 * Positions that complete the win for `mode` given current marks.
 * Returns null when no winning line/pattern is present.
 * Used by host verification UI to highlight H/V/diagonal (or corners / blackout / X).
 */
export function getWinningPositions(
  markedSongIds: Set<string>,
  cells: { position: number; playlist_song_id: string }[],
  size: number,
  mode: WinPattern
): number[] | null {
  const positionToSong = new Map(cells.map((c) => [c.position, c.playlist_song_id]))
  const isMarked = (pos: number) => isMarkedAt(pos, markedSongIds, positionToSong, size)
  const isLineComplete = (positions: number[]) => positions.every((p) => isMarked(p))
  const { rows, cols, diags, corners, all } = buildPatternLines(size)

  if (mode === 'blackout') {
    return isLineComplete(all) ? all : null
  }
  if (mode === 'corners') {
    return isLineComplete(corners) ? corners : null
  }
  if (mode === 'x') {
    return diags.every((line) => isLineComplete(line)) ? [...new Set(diags.flat())] : null
  }
  for (const line of [...rows, ...cols, ...diags]) {
    if (isLineComplete(line)) return line
  }
  return null
}

/** Player UI: marks on card must match this pattern for BINGO! to enable. */
export function hasWinningPatternFromMarks(
  markedSongIds: Set<string>,
  cells: { position: number; playlist_song_id: string }[],
  size: number,
  mode: WinPattern
): boolean {
  return getWinningPositions(markedSongIds, cells, size, mode) != null
}
