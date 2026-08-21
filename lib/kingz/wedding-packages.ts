/**
 * Wedding Entertainment Packages — single source from site-config.
 * Do not hardcode prices or package names in components.
 */

import siteConfig from '@/config/site-config'

export type WeddingPackage = {
  id: string
  name: string
  price: number
  priceLabel: string
  subtitle: string
  featured: boolean
  badge: string | null
  ctaLabel: string
  prefillLabel: string
  features: readonly string[]
}

const raw = (siteConfig as { weddingPackages?: WeddingPackage[] }).weddingPackages ?? []

export const WEDDING_PACKAGES: readonly WeddingPackage[] = raw.map((pkg) => ({
  ...pkg,
  features: [...(pkg.features ?? [])],
}))

export const WEDDING_PACKAGES_SECTION_TITLE = 'Wedding Entertainment Packages'

export const CUSTOM_EVENT_NOTE =
  (siteConfig as { customEventNote?: string }).customEventNote ||
  'Custom packages are available for corporate events, private parties, club nights, and special productions.'

export const CUSTOM_EVENT_PREFILL =
  (siteConfig as { customEventPrefill?: string }).customEventPrefill || 'Custom Event Package'

/** sessionStorage keys shared with KingzContact */
export const KINGZ_PREFILL_MESSAGE_KEY = 'kingz-prefill-message'
export const KINGZ_PREFILL_DATE_KEY = 'kingz-prefill-date'
export const KINGZ_PREFILL_EVENT_TYPE_KEY = 'kingz-prefill-event-type'
export const KINGZ_PREFILL_PACKAGE_KEY = 'kingz-prefill-package'

export const KINGZ_PREFILL_EVENT = 'kingz-contact-prefill'

export function notifyKingzPrefill() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(KINGZ_PREFILL_EVENT))
}

export function scrollToKingzContact() {
  if (typeof document === 'undefined') return
  document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
}

export function prefillWeddingPackage(pkg: WeddingPackage) {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.setItem(KINGZ_PREFILL_PACKAGE_KEY, pkg.prefillLabel)
  sessionStorage.setItem(KINGZ_PREFILL_MESSAGE_KEY, `Interested in: ${pkg.prefillLabel}`)
  sessionStorage.setItem(KINGZ_PREFILL_EVENT_TYPE_KEY, 'Wedding')
  notifyKingzPrefill()
  scrollToKingzContact()
}

export function prefillCustomEventQuote() {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.removeItem(KINGZ_PREFILL_PACKAGE_KEY)
  sessionStorage.setItem(KINGZ_PREFILL_EVENT_TYPE_KEY, CUSTOM_EVENT_PREFILL)
  sessionStorage.setItem(
    KINGZ_PREFILL_MESSAGE_KEY,
    `Inquiry type: ${CUSTOM_EVENT_PREFILL}`
  )
  notifyKingzPrefill()
  scrollToKingzContact()
}
