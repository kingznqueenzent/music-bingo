/**
 * Future integrations registry — Coming Soon only.
 * Do NOT activate until URLs/IDs are live in config/site-config.js.
 */
import siteConfig from '@/config/site-config'

export type FutureIntegrationKey = keyof typeof siteConfig.futureIntegrations

export function getFutureIntegrations() {
  return siteConfig.futureIntegrations
}

/** True when an integration is still Coming Soon / not enabled */
export function isComingSoon(key: FutureIntegrationKey): boolean {
  const item = siteConfig.futureIntegrations[key]
  return !item.enabled
}

export const COMING_SOON_LABEL = 'Coming Soon' as const
