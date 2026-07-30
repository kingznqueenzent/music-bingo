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

/** Player UI: marks on card must match this pattern for BINGO! to enable. */
export function hasWinningPatternFromMarks(
  markedSongIds: Set<string>,
  cells: { position: number; playlist_song_id: string }[],
  size: number,
  mode: WinPattern
): boolean {
  const positionToSong = new Map(cells.map((c) => [c.position, c.playlist_song_id]))
  const isMarked = (pos: number) => isMarkedAt(pos, markedSongIds, positionToSong, size)
  const isLineComplete = (positions: number[]) => positions.every((p) => isMarked(p))

  const cellCount = size * size
  const ROWS = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => r * size + c)
  )
  const COLS = Array.from({ length: size }, (_, c) =>
    Array.from({ length: size }, (_, r) => r * size + c)
  )
  const DIAGS: number[][] = [
    Array.from({ length: size }, (_, i) => i * size + i),
    Array.from({ length: size }, (_, i) => (i + 1) * size - 1 - i),
  ]

  if (mode === 'blackout') {
    return Array.from({ length: cellCount }, (_, i) => i).every((p) => isMarked(p))
  }
  if (mode === 'corners') {
    const corners = [0, size - 1, size * (size - 1), size * size - 1]
    return corners.every((p) => isMarked(p))
  }
  if (mode === 'x') {
    return DIAGS.every((line) => isLineComplete(line))
  }
  for (const line of [...ROWS, ...COLS, ...DIAGS]) {
    if (isLineComplete(line)) return true
  }
  return false
}
