import type { Game, WheelSegment } from '@/lib/supabase/types'

export type { WheelSegment }

const DEFAULT_COLORS = [
  '#00FF66',
  '#FFD700',
  '#a78bfa',
  '#f472b6',
  '#34d399',
  '#fb923c',
  '#38bdf8',
  '#facc15',
]

/** Parse `games.wheel_segments` jsonb or build defaults from prize pool. */
export function resolveWheelSegments(game: Pick<Game, 'wheel_segments' | 'prize_pool_cents'> | null): WheelSegment[] {
  const raw = game?.wheel_segments
  if (Array.isArray(raw) && raw.length > 0) {
    const parsed = raw
      .map((s) => {
        const row = s as { label?: string; color?: string; weight?: number }
        const label = row.label?.trim()
        if (!label) return null
        return {
          label,
          color: row.color,
          weight: row.weight ?? 1,
        } satisfies WheelSegment
      })
      .filter(Boolean) as WheelSegment[]
    if (parsed.length > 0) return parsed
  }

  const pool = game?.prize_pool_cents ?? 0
  if (pool > 0) {
    const dollars = (pool / 100).toFixed(0)
    return [
      { label: `$${dollars} Cash`, color: DEFAULT_COLORS[1] },
      { label: 'Free Drink', color: DEFAULT_COLORS[0] },
      { label: 'Merch Bundle', color: DEFAULT_COLORS[2] },
      { label: 'VIP Entry', color: DEFAULT_COLORS[3] },
      { label: 'Song Request', color: DEFAULT_COLORS[4] },
      { label: 'Bonus Round', color: DEFAULT_COLORS[5] },
    ]
  }

  return [
    { label: 'Free Drink', color: DEFAULT_COLORS[0] },
    { label: 'Merch Discount', color: DEFAULT_COLORS[1] },
    { label: 'Song Request', color: DEFAULT_COLORS[2] },
    { label: 'Shoutout', color: DEFAULT_COLORS[3] },
    { label: 'Bonus Round', color: DEFAULT_COLORS[4] },
    { label: 'Mystery Prize', color: DEFAULT_COLORS[5] },
  ]
}

/** Weighted random segment index. */
export function pickWheelSegmentIndex(segments: WheelSegment[]): number {
  if (segments.length === 0) return 0
  const total = segments.reduce((sum, s) => sum + (s.weight ?? 1), 0)
  let roll = Math.random() * total
  for (let i = 0; i < segments.length; i++) {
    roll -= segments[i].weight ?? 1
    if (roll <= 0) return i
  }
  return segments.length - 1
}

/** Rotation degrees so segment `index` lands under the top pointer after `fullSpins`. */
export function wheelRotationForIndex(index: number, segmentCount: number, fullSpins = 5): number {
  const slice = 360 / segmentCount
  const segmentCenter = index * slice + slice / 2
  return fullSpins * 360 + (360 - segmentCenter)
}
