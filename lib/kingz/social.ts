/**
 * Kingz social / livestream destinations — single wrapper over site-config.
 * Only confirmed absolute URLs are clickable.
 */

import siteConfig from '@/config/site-config'
import { integrationHref } from '@/lib/kingz/integrations'

export type KingzSocialKey =
  | 'tiktok'
  | 'youtube'
  | 'twitch'
  | 'kick'
  | 'instagram'
  | 'facebook'
  | 'mixcloud'
  | 'soundcloud'
  | 'own'

export type KingzSocialChannel = {
  key: KingzSocialKey
  label: string
  ariaLabel: string
  href?: string
  handle?: string
}

const SOCIAL = siteConfig.social as {
  tiktok?: string
  youtube?: string
  twitch?: string
  kick?: string
  instagram?: string
  facebook?: string
  mixcloud?: string
  soundcloud?: string
  own?: string
  ownHandle?: string
  ownPlatformHome?: string
}

export const KINGZ_OWN_HANDLE = (SOCIAL.ownHandle || 'kingznqueenzent').replace(/^@/, '')

/** Confirmed profile/share URL only — empty until verified */
export const KINGZ_OWN_URL = integrationHref(SOCIAL.own)

/** Platform home (informational) — never use as profile CTA */
export const KINGZ_OWN_PLATFORM_HOME = integrationHref(SOCIAL.ownPlatformHome)

export const KINGZ_SOCIAL_URLS = {
  tiktok: integrationHref(SOCIAL.tiktok),
  youtube: integrationHref(SOCIAL.youtube),
  twitch: integrationHref(SOCIAL.twitch),
  kick: integrationHref(SOCIAL.kick),
  instagram: integrationHref(SOCIAL.instagram),
  facebook: integrationHref(SOCIAL.facebook),
  mixcloud: integrationHref(SOCIAL.mixcloud),
  soundcloud: integrationHref(SOCIAL.soundcloud),
  own: KINGZ_OWN_URL,
} as const

const CHANNEL_META: Array<{
  key: Exclude<KingzSocialKey, 'own'>
  label: string
  ariaLabel: string
}> = [
  { key: 'tiktok', label: 'TikTok', ariaLabel: 'Kingz & Queenz on TikTok' },
  { key: 'youtube', label: 'YouTube', ariaLabel: 'Kingz & Queenz on YouTube' },
  { key: 'twitch', label: 'Twitch', ariaLabel: 'Kingz & Queenz on Twitch' },
  { key: 'kick', label: 'Kick', ariaLabel: 'Kingz & Queenz on Kick' },
  { key: 'instagram', label: 'Instagram', ariaLabel: 'Kingz & Queenz on Instagram' },
  { key: 'facebook', label: 'Facebook', ariaLabel: 'Kingz & Queenz on Facebook' },
  { key: 'mixcloud', label: 'Mixcloud', ariaLabel: 'Kingz & Queenz on Mixcloud' },
  { key: 'soundcloud', label: 'SoundCloud', ariaLabel: 'Kingz & Queenz on SoundCloud' },
]

/** Confirmed channels with absolute URLs (for footer / CTAs) */
export function getConfirmedSocialChannels(): KingzSocialChannel[] {
  const channels: KingzSocialChannel[] = CHANNEL_META.flatMap((meta) => {
    const href = KINGZ_SOCIAL_URLS[meta.key]
    return href ? [{ ...meta, href }] : []
  })

  if (KINGZ_OWN_URL) {
    channels.push({
      key: 'own',
      label: 'OWN',
      ariaLabel: 'Kingz & Queenz on OWN',
      href: KINGZ_OWN_URL,
      handle: KINGZ_OWN_HANDLE,
    })
  }

  return channels
}

/** OWN display state — handle always available; href only when share URL verified */
export function getOwnChannelState(): {
  handle: string
  href?: string
  verified: boolean
} {
  return {
    handle: KINGZ_OWN_HANDLE,
    href: KINGZ_OWN_URL,
    verified: Boolean(KINGZ_OWN_URL),
  }
}
