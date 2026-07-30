import type { WinPattern } from '@/lib/bingo-win-pattern'
import { getFreeCenterPosition } from '@/lib/bingo-win-pattern'

export type PatternDisplayMode = WinPattern | 'corners'

export function getPatternHighlightPositions(mode: PatternDisplayMode, size: number): number[] {
  if (mode === 'blackout') {
    return Array.from({ length: size * size }, (_, i) => i)
  }
  if (mode === 'corners') {
    return [0, size - 1, size * (size - 1), size * size - 1]
  }
  if (mode === 'x') {
    return [
      ...Array.from({ length: size }, (_, i) => i * size + i),
      ...Array.from({ length: size }, (_, i) => (i + 1) * size - 1 - i),
    ]
  }
  // line — highlight center row as the reference pattern
  const mid = Math.floor(size / 2)
  return Array.from({ length: size }, (_, c) => mid * size + c)
}

export function getWinProgress(
  markedSongIds: Set<string>,
  cells: { position: number; playlist_song_id: string }[],
  size: number,
  mode: WinPattern
): { current: number; target: number; label: string } {
  const positionToSong = new Map(cells.map((c) => [c.position, c.playlist_song_id]))
  const isMarked = (pos: number) => {
    const free = getFreeCenterPosition(size)
    if (free !== null && pos === free) return true
    const id = positionToSong.get(pos)
    return id != null && markedSongIds.has(id)
  }

  const rows = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => r * size + c)
  )
  const cols = Array.from({ length: size }, (_, c) =>
    Array.from({ length: size }, (_, r) => r * size + c)
  )
  const diags: number[][] = [
    Array.from({ length: size }, (_, i) => i * size + i),
    Array.from({ length: size }, (_, i) => (i + 1) * size - 1 - i),
  ]

  if (mode === 'blackout') {
    const all = Array.from({ length: size * size }, (_, i) => i)
    const current = all.filter(isMarked).length
    return { current, target: all.length, label: `${current} / ${all.length} marked` }
  }

  if (mode === 'corners') {
    const corners = [0, size - 1, size * (size - 1), size * size - 1]
    const current = corners.filter(isMarked).length
    return { current, target: 4, label: `${current} / 4 marked` }
  }

  if (mode === 'x') {
    const counts = diags.map((line) => line.filter(isMarked).length)
    const current = Math.min(...counts)
    return { current, target: size, label: `${current} / ${size} marked` }
  }

  const lines = [...rows, ...cols, ...diags]
  let best = 0
  for (const line of lines) {
    best = Math.max(best, line.filter(isMarked).length)
  }
  return { current: best, target: size, label: `${best} / ${size} marked` }
}

export function getMarkedPositions(
  markedSongIds: Set<string>,
  cells: { position: number; playlist_song_id: string }[],
  size: number
): Set<number> {
  const positionToSong = new Map(cells.map((c) => [c.position, c.playlist_song_id]))
  const out = new Set<number>()
  const free = getFreeCenterPosition(size)
  if (free !== null) out.add(free)
  for (const cell of cells) {
    if (markedSongIds.has(cell.playlist_song_id)) out.add(cell.position)
  }
  return out
}
