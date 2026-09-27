/** Stable public Meld/OBS slugs. Never map a slug to a hard-coded game UUID. */
export const BROADCAST_SLUGS = ['kingznqueenzent'] as const

export type BroadcastSlug = (typeof BROADCAST_SLUGS)[number]

export const KQ_BROADCAST_SLUG: BroadcastSlug = 'kingznqueenzent'

export function isBroadcastSlug(value: string | null | undefined): value is BroadcastSlug {
  return !!value && (BROADCAST_SLUGS as readonly string[]).includes(value)
}
