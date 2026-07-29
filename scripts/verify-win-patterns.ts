#!/usr/bin/env node
/**
 * Unit checks for 5×5 win-pattern logic (line, X, blackout).
 * Usage: npx tsx scripts/verify-win-patterns.ts
 */
import { hasWinningPatternFromMarks, normalizeWinPattern } from '../lib/bingo-win-pattern'

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg)
}

function cellsFromPositions(size: number) {
  const count = size * size
  return Array.from({ length: count }, (_, position) => ({
    position,
    playlist_song_id: `song-${position}`,
  }))
}

function marksFromPositions(positions: number[]) {
  return new Set(positions.map((p) => `song-${p}`))
}

function main(): void {
  const size = 5
  const cells = cellsFromPositions(size)

  assert(normalizeWinPattern('any_line') === 'line', 'normalize line')
  assert(normalizeWinPattern('x_pattern') === 'x', 'normalize x')
  assert(normalizeWinPattern('blackout') === 'blackout', 'normalize blackout')

  assert(hasWinningPatternFromMarks(marksFromPositions([0, 1, 2, 3, 4]), cells, size, 'line'), 'horizontal row win')
  assert(hasWinningPatternFromMarks(marksFromPositions([0, 5, 10, 15, 20]), cells, size, 'line'), 'vertical col win')
  assert(hasWinningPatternFromMarks(marksFromPositions([0, 6, 12, 18, 24]), cells, size, 'line'), 'diagonal win')
  assert(!hasWinningPatternFromMarks(marksFromPositions([0, 1, 2, 3]), cells, size, 'line'), 'incomplete line fails')

  assert(
    hasWinningPatternFromMarks(marksFromPositions([0, 4, 6, 8, 12, 16, 18, 20, 24]), cells, size, 'x'),
    'X pattern win'
  )
  assert(!hasWinningPatternFromMarks(marksFromPositions([0, 4, 6, 8, 12]), cells, size, 'x'), 'partial X fails')

  assert(
    hasWinningPatternFromMarks(marksFromPositions(Array.from({ length: 25 }, (_, i) => i)), cells, size, 'blackout'),
    'blackout win'
  )

  console.log('Win-pattern checks: all passed')
}

main()
