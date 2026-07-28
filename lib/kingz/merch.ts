import type { LucideIcon } from 'lucide-react'
import {
  PRINTIFY_STORE_URL,
  PRINTFUL_STORE_URL,
  BUY_ME_A_COFFEE_URL,
  PATREON_URL,
  STRIPE_LINKS,
  SHOPIFY_LINKS,
} from './integrations'

export type MerchCategory =
  | 'apparel'
  | 'headwear'
  | 'digital'
  | 'bundle'
  | 'dj-liz'
  | 'dj-merci'
  | 'limited'

export type FeaturedMerchItem = {
  id: string
  name: string
  priceLabel: string
  description: string
  image: string
  category: MerchCategory
  badge?: string
  /** Printify product URL, Shopify product URL, or Stripe payment link */
  storeUrl: string
  storeLabel: string
}

export type MerchDrop = {
  id: string
  name: string
  priceLabel: string
  description: string
  image: string
  type: 'apparel' | 'headwear' | 'hoodie' | 'digital' | 'bundle'
  limited: boolean
  unitsLeft?: string
  storeUrl: string
  storeLabel: string
}

export type SupportTier = {
  id: string
  name: string
  priceLabel: string
  perks: string[]
  storeUrl: string
  storeLabel: string
  dj?: 'liz' | 'merci' | 'both'
}

export type EventPackage = {
  id: string
  name: string
  priceLabel: string
  description: string
  features: string[]
  featured?: boolean
  stripeUrl: string
}

export type DigitalProduct = {
  id: string
  name: string
  priceLabel: string
  description: string
  format: string
  image: string
  storeUrl: string
  storeLabel: string
}

/** Featured merchandise — links to Printify, Printful, Shopify, or Stripe */
/** FUTURE: replace /assets/merch/placeholder.jpg with product shots in public/assets/merch/ */
export const FEATURED_MERCH: FeaturedMerchItem[] = [
  {
    id: 'crown-tee',
    name: 'Royal Crown Tee',
    priceLabel: 'From $35',
    description: 'Premium cotton with gold embroidered crown. Unisex fit.',
    image: '/assets/merch/placeholder.jpg',
    category: 'apparel',
    badge: 'Bestseller',
    storeUrl: SHOPIFY_LINKS.crownTee,
    storeLabel: 'Shop on Shopify',
  },
  {
    id: 'nightlife-hoodie',
    name: 'Nightlife Hoodie',
    priceLabel: 'From $65',
    description: 'Heavyweight black hoodie with gold foil logo. Limited run.',
    image: '/assets/merch/placeholder.jpg',
    category: 'apparel',
    storeUrl: PRINTIFY_STORE_URL,
    storeLabel: 'Shop on Printify',
  },
  {
    id: 'crown-cap',
    name: 'Crown Snapback',
    priceLabel: 'From $32',
    description: 'Structured cap with 3D gold crown emblem.',
    image: '/assets/merch/placeholder.jpg',
    category: 'headwear',
    storeUrl: PRINTFUL_STORE_URL,
    storeLabel: 'Shop on Printful',
  },
  {
    id: 'liz-signature-tee',
    name: 'DJ Liz Signature Tee',
    priceLabel: 'From $38',
    description: 'Exclusive design celebrating DJ Liz — weddings & elegance.',
    image: '/assets/images/dj-liz/dj-liz-live-stage.jpg',
    category: 'dj-liz',
    storeUrl: PRINTIFY_STORE_URL,
    storeLabel: 'DJ Liz Merch',
  },
  {
    id: 'merci-signature-tee',
    name: 'DJ Merci Signature Tee',
    priceLabel: 'From $38',
    description: 'Bold streetwear drop from DJ Merci — parties & livestreams.',
    image: '/assets/images/dj-merci/dj-merci-live-stage.jpg',
    category: 'dj-merci',
    storeUrl: PRINTFUL_STORE_URL,
    storeLabel: 'DJ Merci Merch',
  },
  {
    id: 'mix-vol1',
    name: 'Exclusive Mix Vol. 1',
    priceLabel: '$12',
    description: 'Digital download — curated party mix. MP3 + FLAC.',
    image: '/assets/merch/placeholder.jpg',
    category: 'digital',
    storeUrl: STRIPE_LINKS.mixtapeVol1,
    storeLabel: 'Buy on Stripe',
  },
]

/** Limited-edition merch drops */
export const MERCH_DROPS: MerchDrop[] = [
  {
    id: 'drop-royal-collection',
    name: 'Royal Collection Drop',
    priceLabel: 'From $45',
    description: 'Limited Kingz & Queenz apparel — gold on black, Art Deco inspired.',
    image: '/assets/merch/placeholder.jpg',
    type: 'apparel',
    limited: true,
    unitsLeft: '42 left',
    storeUrl: PRINTIFY_STORE_URL,
    storeLabel: 'Printify Drop',
  },
  {
    id: 'drop-tour-shirt',
    name: '2026 Event Tour Shirt',
    priceLabel: '$40',
    description: 'Commemorative tour tee — available at live events & online.',
    image: '/assets/merch/placeholder.jpg',
    type: 'apparel',
    limited: true,
    unitsLeft: '28 left',
    storeUrl: SHOPIFY_LINKS.tourShirt,
    storeLabel: 'Shopify',
  },
  {
    id: 'drop-velvet-hat',
    name: 'Velvet Crown Hat',
    priceLabel: '$36',
    description: 'Premium velvet snapback with metallic crown crest.',
    image: '/assets/merch/placeholder.jpg',
    type: 'headwear',
    limited: true,
    unitsLeft: '15 left',
    storeUrl: PRINTFUL_STORE_URL,
    storeLabel: 'Printful',
  },
  {
    id: 'drop-royal-hoodie',
    name: 'Royal Velvet Hoodie',
    priceLabel: '$72',
    description: 'Ultra-soft interior, gold zipper pull, embroidered crest.',
    image: '/assets/merch/placeholder.jpg',
    type: 'hoodie',
    limited: true,
    unitsLeft: '20 left',
    storeUrl: SHOPIFY_LINKS.royalHoodie,
    storeLabel: 'Shopify',
  },
  {
    id: 'drop-mixtape-bundle',
    name: 'Digital Mixtape Bundle',
    priceLabel: '$25',
    description: 'Vol. 1 + Vol. 2 — instant download, bonus unreleased track.',
    image: '/assets/merch/placeholder.jpg',
    type: 'digital',
    limited: false,
    storeUrl: STRIPE_LINKS.mixtapeVol2,
    storeLabel: 'Stripe Download',
  },
  {
    id: 'drop-vip-bundle',
    name: 'VIP Royal Bundle',
    priceLabel: '$149',
    description: 'Hoodie + tee + hat + digital mix + Patreon 1-month access.',
    image: '/assets/merch/placeholder.jpg',
    type: 'bundle',
    limited: true,
    unitsLeft: '10 left',
    storeUrl: STRIPE_LINKS.vipBundle,
    storeLabel: 'Stripe VIP Bundle',
  },
]

/** Support tiers for Patreon / Stripe memberships */
export const SUPPORT_TIERS: SupportTier[] = [
  {
    id: 'supporter',
    name: 'Royal Supporter',
    priceLabel: '$5/mo',
    perks: ['Exclusive mixes', 'Behind-the-scenes content', 'Community Discord access'],
    storeUrl: PATREON_URL,
    storeLabel: 'Join on Patreon',
    dj: 'both',
  },
  {
    id: 'vip',
    name: 'VIP Member',
    priceLabel: '$15/mo',
    perks: ['All Supporter perks', 'Early event access', 'Monthly live Q&A', 'VIP shoutouts'],
    storeUrl: PATREON_URL,
    storeLabel: 'Join VIP on Patreon',
    dj: 'both',
  },
  {
    id: 'liz-inner-circle',
    name: 'DJ Liz Inner Circle',
    priceLabel: '$10/mo',
    perks: ['Liz-exclusive mixes', 'Wedding playlist templates', 'BTS from events'],
    storeUrl: STRIPE_LINKS.supportDjLiz,
    storeLabel: 'Support DJ Liz',
    dj: 'liz',
  },
  {
    id: 'merci-inner-circle',
    name: 'DJ Merci Inner Circle',
    priceLabel: '$10/mo',
    perks: ['Merci-exclusive mixes', 'Livestream BTS', 'Party set previews'],
    storeUrl: STRIPE_LINKS.supportDjMerci,
    storeLabel: 'Support DJ Merci',
    dj: 'merci',
  },
]

/** Event packages — Stripe payment link placeholders */
export const EVENT_PACKAGES: EventPackage[] = [
  {
    id: 'essential',
    name: 'Essential Package',
    priceLabel: '$899',
    description: '4 hours DJ service, basic sound system, consultation call.',
    features: ['4-hour set', 'Standard PA', 'Playlist consultation'],
    stripeUrl: STRIPE_LINKS.essentialPackage,
  },
  {
    id: 'premium',
    name: 'Premium Package',
    priceLabel: '$1,499',
    description: '6 hours, upgraded sound, MC services, custom playlist.',
    features: ['6-hour set', 'Premium sound', 'MC services', 'Custom playlist'],
    featured: true,
    stripeUrl: STRIPE_LINKS.premiumPackage,
  },
  {
    id: 'royal',
    name: 'Royal Experience',
    priceLabel: '$2,499',
    description: 'Full-day coverage, ceremony + reception, lighting package.',
    features: ['Full-day coverage', 'Ceremony audio', 'Uplighting', 'Dedicated coordinator'],
    stripeUrl: STRIPE_LINKS.royalPackage,
  },
]

/** Digital mixtape / download sales */
export const DIGITAL_PRODUCTS: DigitalProduct[] = [
  {
    id: 'mix-vol1',
    name: 'Exclusive Mix Vol. 1',
    priceLabel: '$12',
    description: 'Curated party mix by DJ Liz & DJ Merci.',
    format: 'MP3 + FLAC',
    image: '/assets/merch/placeholder.jpg',
    storeUrl: STRIPE_LINKS.mixtapeVol1,
    storeLabel: 'Stripe Download',
  },
  {
    id: 'mix-vol2',
    name: 'Exclusive Mix Vol. 2 — Nightlife',
    priceLabel: '$12',
    description: 'High-energy club set recorded live in Brantford.',
    format: 'MP3 + FLAC',
    image: '/assets/merch/placeholder.jpg',
    storeUrl: STRIPE_LINKS.mixtapeVol2,
    storeLabel: 'Stripe Download',
  },
  {
    id: 'wedding-playlist-pack',
    name: 'Wedding Playlist Pack',
    priceLabel: '$29',
    description: 'DJ Liz curated templates + timeline guide for your big day.',
    format: 'PDF + Spotify links',
    image: '/assets/merch/placeholder.jpg',
    storeUrl: SHOPIFY_LINKS.storefront,
    storeLabel: 'Shopify Digital',
  },
]

export type StoreIntegration = {
  id: string
  name: string
  description: string
  url: string
  icon: 'printify' | 'printful' | 'coffee' | 'patreon' | 'shopify' | 'stripe'
  cta: string
}

export const STORE_INTEGRATIONS: StoreIntegration[] = [
  {
    id: 'printify',
    name: 'Printify Store',
    description: 'Official Kingz & Queenz apparel — printed on demand, shipped worldwide.',
    url: PRINTIFY_STORE_URL,
    icon: 'printify',
    cta: 'Visit Printify Store',
  },
  {
    id: 'printful',
    name: 'Printful Store',
    description: 'Premium merch fulfillment — hats, hoodies, and tour exclusives.',
    url: PRINTFUL_STORE_URL,
    icon: 'printful',
    cta: 'Visit Printful Store',
  },
  {
    id: 'bmc',
    name: 'Buy Me a Coffee',
    description: 'One-time tips to fuel the next live set, stream, or studio session.',
    url: BUY_ME_A_COFFEE_URL,
    icon: 'coffee',
    cta: 'Buy Us a Coffee',
  },
  {
    id: 'patreon',
    name: 'Patreon',
    description: 'Monthly memberships — exclusive mixes, BTS content, and VIP perks.',
    url: PATREON_URL,
    icon: 'patreon',
    cta: 'Join Patreon',
  },
  {
    id: 'shopify',
    name: 'Shopify Storefront',
    description: 'Full catalog — embed products or link to your Shopify storefront.',
    url: SHOPIFY_LINKS.storefront,
    icon: 'shopify',
    cta: 'Shop on Shopify',
  },
]

/** DJ-specific merch collections */
export const DJ_MERCH_COLLECTIONS = [
  {
    dj: 'DJ Liz' as const,
    slug: 'liz',
    tagline: 'Elegance meets energy',
    image: '/assets/images/dj-liz/dj-liz-profile.jpg',
    items: FEATURED_MERCH.filter((m) => m.category === 'dj-liz'),
    storeUrl: PRINTIFY_STORE_URL,
  },
  {
    dj: 'DJ Merci' as const,
    slug: 'merci',
    tagline: 'Nightlife royalty',
    image: '/assets/images/dj-merci/dj-merci-profile.jpg',
    items: FEATURED_MERCH.filter((m) => m.category === 'dj-merci'),
    storeUrl: PRINTFUL_STORE_URL,
  },
] as const

export type CtaAction = {
  label: string
  href?: string
  scrollTo?: string
  variant: 'gold' | 'outline' | 'purple' | 'glass'
  external?: boolean
}

/** Primary platform CTAs — used in hero, banners, and merch hub */
export function buildPlatformCtas(): CtaAction[] {
  return [
    { label: 'Shop Merch', scrollTo: 'merch', variant: 'gold' },
    { label: 'Support Us', scrollTo: 'support', variant: 'purple' },
    { label: 'Join Patreon', href: PATREON_URL, variant: 'outline', external: true },
    { label: 'Buy Us a Coffee', href: BUY_ME_A_COFFEE_URL, variant: 'glass', external: true },
    { label: 'Book an Event', scrollTo: 'booking', variant: 'gold' },
    { label: 'Request Custom Merch', scrollTo: 'contact', variant: 'outline' },
  ]
}
