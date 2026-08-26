/**
 * Locked Media Manager genre buckets — all dropdowns map over this list.
 * Untagged is the empty/null stored state, not a persisted label.
 */
export const MASTER_GENRES = [
  'Reggae',
  'Dancehall',
  'Afrobeats',
  'Hip-Hop',
  'R&B',
  'Soca',
  'Pop',
  '80s',
  '90s',
  '2000s',
  'Rock',
  'Country',
  'Gospel',
  'Calypso',
  'Chutney',
  'Latin',
  'Untagged',
] as const

export type MasterGenre = (typeof MASTER_GENRES)[number]

/** Persistable tags (everything except Untagged). */
export const TAGGED_GENRES = MASTER_GENRES.filter(
  (g): g is Exclude<MasterGenre, 'Untagged'> => g !== 'Untagged'
)

export type TaggedGenre = (typeof TAGGED_GENRES)[number]

const TAGGED_LOWER = new Map(TAGGED_GENRES.map((g) => [g.toLowerCase(), g]))

export function isTaggedGenre(value: string | null | undefined): value is TaggedGenre {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return false
  return TAGGED_LOWER.has(trimmed.toLowerCase())
}

export function isMasterGenre(value: string | null | undefined): value is MasterGenre {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return false
  return (MASTER_GENRES as readonly string[]).some((g) => g.toLowerCase() === trimmed.toLowerCase())
}

export function canonicalMasterGenre(value: string | null | undefined): MasterGenre | null {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return null
  const tagged = TAGGED_LOWER.get(trimmed.toLowerCase())
  if (tagged) return tagged
  if (trimmed.toLowerCase() === 'untagged') return 'Untagged'
  return null
}
