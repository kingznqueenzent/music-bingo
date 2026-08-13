/**
 * External links — all values from config/site-config.js
 * Do not hardcode URLs. Printify/Printful/Shopify/Stripe merch are disabled.
 */

import siteConfig from '@/config/site-config'

export const SITE_URL = siteConfig.siteUrl as string

export const ETSY_STORE_URL = siteConfig.merch.etsyStore as string

export const BUY_ME_A_COFFEE_URL = siteConfig.support.buyMeACoffee as string

export const PATREON_URL = siteConfig.support.patreon as string

export const SOCIAL = siteConfig.social

export const YOUTUBE_EMBEDS = {
  weddingHighlight: '',
  corporateGala: '',
  livestreamSet: '',
  behindTheScenes: '',
} as const

export const INSTAGRAM_LINKS = {
  profile: siteConfig.social.instagram,
  merchReel: siteConfig.social.instagram,
  eventHighlight: siteConfig.social.instagram,
} as const

export const TIKTOK_LINKS = {
  profile: siteConfig.social.tiktok,
  djSetClip: siteConfig.social.tiktok,
} as const

/** True when empty string or #paste- placeholder */
export function isIntegrationPlaceholder(url: string | undefined | null): boolean {
  if (!url || !String(url).trim()) return true
  return String(url).startsWith('#paste-')
}

/** Safe href for external links; undefined when not configured */
export function integrationHref(url: string | undefined | null): string | undefined {
  return isIntegrationPlaceholder(url) ? undefined : String(url)
}
