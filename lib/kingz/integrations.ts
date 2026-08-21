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

/**
 * Selected YouTube embeds — leave empty until official video IDs/URLs are supplied.
 * Do not invent embed URLs. Wire into KingzLivestreams / KingzSocialEmbeds when ready.
 */
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
  /** Specific clip embeds — empty until a confirmed TikTok video URL is supplied */
  djSetClip: '',
} as const

/** OWN — handle from config; profile href only when `social.own` is a confirmed share URL */
export const OWN_PLATFORM = {
  handle: siteConfig.social.ownHandle || 'kingznqueenzent',
  profileUrl: siteConfig.social.own || '',
  platformHome: siteConfig.social.ownPlatformHome || 'https://www.iown.app/',
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
