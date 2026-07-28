/** Total XP thresholds — Level 1 starts at 0 */
export const LEVEL_THRESHOLDS: { minXp: number; level: number; title: string }[] = [
  { minXp: 0, level: 1, title: 'Rookie' },
  { minXp: 100, level: 2, title: 'Regular' },
  { minXp: 300, level: 3, title: 'Bingo Enthusiast' },
  { minXp: 600, level: 4, title: 'Chart Chaser' },
  { minXp: 1000, level: 5, title: 'Lyric Legend' },
  { minXp: 1500, level: 6, title: 'Hall of Fame' },
]

export function getLevelFromXp(totalXp: number): { level: number; title: string; minXp: number; nextAt: number | null } {
  let level = 1
  let title = LEVEL_THRESHOLDS[0].title
  let minXp = 0
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVEL_THRESHOLDS[i].minXp) {
      level = LEVEL_THRESHOLDS[i].level
      title = LEVEL_THRESHOLDS[i].title
      minXp = LEVEL_THRESHOLDS[i].minXp
      break
    }
  }
  const nextIdx = LEVEL_THRESHOLDS.findIndex((t) => t.level === level + 1)
  const nextAt = nextIdx >= 0 ? LEVEL_THRESHOLDS[nextIdx].minXp : null
  return { level, title, minXp, nextAt }
}
