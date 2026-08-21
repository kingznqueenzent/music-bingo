/**
 * Royal Collection (Etsy) + support CTAs.
 * Support tips → Buy Me a Coffee. Monthly memberships → Patreon.
 * No on-site recurring billing. No invented Patreon tiers or prices.
 */

import { ETSY_STORE_URL, BUY_ME_A_COFFEE_URL, PATREON_URL } from './integrations'

/**
 * Featured products — add ONLY verified Etsy listings with real images.
 * Do not invent names, prices, reviews, ratings, inventory, or discounts.
 */
export type FeaturedMerchProduct = {
  id: string
  name: string
  /** Optimized image under /assets/merch/ */
  image: string
  /** Direct Etsy listing URL (must be a real product page) */
  etsyUrl: string
}

/** Empty until real Etsy product shots + listing URLs are supplied */
export const FEATURED_MERCH_PRODUCTS: FeaturedMerchProduct[] = []

export type CtaAction = {
  label: string
  href?: string
  scrollTo?: string
  variant: 'gold' | 'outline' | 'purple' | 'glass'
  external?: boolean
}

export function buildPlatformCtas(): CtaAction[] {
  return [
    { label: 'Shop Merch', href: ETSY_STORE_URL, variant: 'gold', external: true },
    { label: 'Shop the Royal Collection', href: ETSY_STORE_URL, variant: 'purple', external: true },
    { label: 'View All Merch', href: ETSY_STORE_URL, variant: 'outline', external: true },
    { label: 'Support Us', scrollTo: 'support', variant: 'outline' },
    {
      label: 'Support Kingz & Queenz',
      href: BUY_ME_A_COFFEE_URL,
      variant: 'glass',
      external: true,
    },
    { label: 'Buy Us a Coffee', href: BUY_ME_A_COFFEE_URL, variant: 'glass', external: true },
    { label: 'Book Now', scrollTo: 'booking', variant: 'gold' },
    { label: 'Book an Event', scrollTo: 'booking', variant: 'gold' },
    {
      label: 'Become Royalty',
      href: PATREON_URL,
      variant: 'purple',
      external: true,
    },
  ]
}

export { ETSY_STORE_URL, BUY_ME_A_COFFEE_URL, PATREON_URL }
