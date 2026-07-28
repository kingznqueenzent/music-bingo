/**
 * Single source of truth for how we interpret `games.mode` from DB / Kingz Control / API.
 * Unknown values safely default to 'line' (any row, col, or diagonal).
 */
export type WinPattern = 'line' | 'x' | 'blackout'

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
  if (s === 'line' || s === 'any_line' || s === 'single_line' || s === 'row' || s === '') {
    return 'line'
  }
  return 'line'
}

/** Player UI: marks on card must match this pattern for BINGO! to enable. */
export function hasWinningPatternFromMarks(
  markedSongIds: Set<string>,
  cells: { position: number; playlist_song_id: string }[],
  size: number,
  mode: WinPattern
): boolean {
  const positionToSong = new Map(cells.map((c) => [c.position, c.playlist_song_id]))
  const isMarked = (pos: number) => {
    const id = positionToSong.get(pos)
    return id != null && markedSongIds.has(id)
  }
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
  if (mode === 'x') {
    return DIAGS.every((line) => isLineComplete(line))
  }
  for (const line of [...ROWS, ...COLS, ...DIAGS]) {
    if (isLineComplete(line)) return true
  }
  return false
}
