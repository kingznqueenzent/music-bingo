/**
 * ============================================================================
 * KINGZ & QUEENZ — EXTERNAL INTEGRATION LINKS
 * ============================================================================
 * Source of truth: config/site-config.js
 * This module re-exports for existing components (no visual changes).
 *
 * FUTURE store connections (Printify / Printful / Shopify / Stripe):
 * Paste URLs in config/site-config.js → merch — do not hard-code checkout.
 * ============================================================================
 */

import siteConfig from '@/config/site-config'

/** PRINTIFY — FUTURE: paste in config/site-config.js → merch.printify */
export const PRINTIFY_STORE_URL = siteConfig.merch.printify

/** PRINTFUL — FUTURE: paste in config/site-config.js → merch.printful */
export const PRINTFUL_STORE_URL = siteConfig.merch.printful

/** BUY ME A COFFEE — paste in config/site-config.js → support.buyMeACoffee */
export const BUY_ME_A_COFFEE_URL = siteConfig.support.buyMeACoffee

/** PATREON — paste in config/site-config.js → support.patreon */
export const PATREON_URL = siteConfig.support.patreon

/** STRIPE — FUTURE: paste in config/site-config.js → merch.stripe */
export const STRIPE_LINKS = siteConfig.merch.stripe

/** SHOPIFY — FUTURE: paste in config/site-config.js → merch.shopify */
export const SHOPIFY_LINKS = {
  storefront: siteConfig.merch.shopify,
  crownTee: siteConfig.merch.shopify,
  royalHoodie: siteConfig.merch.shopify,
  tourShirt: siteConfig.merch.shopify,
  vipBundle: siteConfig.merch.shopify,
} as const

/** YOUTUBE — paste embed URLs when ready */
export const YOUTUBE_EMBEDS = {
  weddingHighlight: '#paste-youtube-embed-wedding-highlight',
  corporateGala: '#paste-youtube-embed-corporate-gala',
  livestreamSet: '#paste-youtube-embed-livestream-set',
  behindTheScenes: '#paste-youtube-embed-behind-the-scenes',
} as const

/** INSTAGRAM — paste in config/site-config.js → social.instagram */
export const INSTAGRAM_LINKS = {
  profile: siteConfig.social.instagram,
  merchReel: siteConfig.social.instagram,
  eventHighlight: siteConfig.social.instagram,
} as const

/** TIKTOK — paste in config/site-config.js → social.tiktok */
export const TIKTOK_LINKS = {
  profile: siteConfig.social.tiktok,
  djSetClip: siteConfig.social.tiktok,
} as const

export function isIntegrationPlaceholder(url: string): boolean {
  return !url || url.startsWith('#paste-')
}

export function integrationHref(url: string): string | undefined {
  return isIntegrationPlaceholder(url) ? undefined : url
}
