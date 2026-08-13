/**
 * ============================================================================
 * KINGZ & QUEENZ ENTERTAINMENT — SITE CONFIG (single source of truth)
 * ============================================================================
 * Path: /config/site-config.js
 * Never hardcode these URLs in components — import via lib/kingz/*
 * ============================================================================
 */

const SITE_URL = process.env.NEXT_PUBLIC_KINGZ_SITE_URL || 'https://kingznqueenzent.ca'

const siteConfig = {
  /** Official production domain */
  siteUrl: SITE_URL,

  brand: {
    name: 'Kingz & Queenz Entertainment',
    tagline: 'Premium DJ Experience',
    location: 'Brantford, ON',
  },

  contact: {
    /** Leave blank until official values are supplied — do not invent */
    phone: '',
    phoneHref: '',
    bookingPhone: '',
    email: '',
    bookingEmail: '',
    address: '',
    businessAddress: '',
    googleMapsEmbed: '',
    googleMapsUrl: '',
  },

  social: {
    instagram: '',
    facebook: '',
    tiktok: '',
    youtube: '',
    mixcloud: '',
    soundcloud: '',
    /** Existing live channels (confirmed brand handles) */
    twitch: 'https://www.twitch.tv/kingznqueenzent',
    kick: 'https://kick.com/kingznqueenzent',
  },

  support: {
    /**
     * Patreon — leave blank until the official URL is confirmed.
     * Do not invent. When ready, set e.g. the verified kingznqueenzent Patreon page.
     * Monthly memberships will be handled by Patreon (no on-site billing).
     */
    patreon: '',
    /** Live Buy Me a Coffee */
    buyMeACoffee: 'https://buymeacoffee.com/kingznqueenzent',
  },

  merch: {
    /** Live Etsy storefront — THE ROYAL COLLECTION */
    etsyStore: 'https://www.etsy.com/shop/StrictlyShopping',
    storeUrl: 'https://www.etsy.com/shop/StrictlyShopping',
  },

  seo: {
    title: 'Kingz & Queenz Entertainment | DJ Merci & DJ Liz',
    metaDescription:
      'Kingz & Queenz Entertainment — DJ Merci and DJ Liz. Premium DJ services for weddings, private events, parties, and corporate entertainment.',
    keywords: [
      'Kingz & Queenz Entertainment',
      'Kingz and Queenz Entertainment',
      'DJ Merci',
      'DJ Liz',
      'DJ services',
      'wedding DJ',
      'party DJ',
      'corporate event DJ',
      'private event DJ',
      'event DJ',
    ],
    openGraphImage: '/assets/logo/logo-main.png',
    twitterCardImage: '/assets/logo/logo-main.png',
    /** Official crest is 1200×1200 */
    openGraphImageWidth: 1200,
    openGraphImageHeight: 1200,
    canonicalUrl: SITE_URL,
  },

  analytics: {
    googleAnalyticsId: '',
    metaPixelId: '',
  },

  newsletter: {
    provider: 'none',
    signupUrl: '',
    embedFormId: '',
  },

  futureIntegrations: {
    googleReviews: { enabled: false, status: 'Coming Soon' },
    googleCalendarBooking: { enabled: false, status: 'Coming Soon' },
    stripeDeposits: { enabled: false, status: 'Coming Soon' },
    youtubeChannel: { enabled: false, status: 'Coming Soon' },
    instagramFeed: { enabled: false, status: 'Coming Soon' },
    tiktokFeed: { enabled: false, status: 'Coming Soon' },
    newsletterSignup: { enabled: false, status: 'Coming Soon' },
    blog: { enabled: false, status: 'Coming Soon' },
    podcast: { enabled: false, status: 'Coming Soon' },
    patreon: { enabled: false, status: 'Coming Soon' },
  },

  assets: {
    logo: {
      main: '/assets/logo/logo-main.png',
      mainWebp: '/assets/logo/logo-main.webp',
      transparent: '/assets/logo/logo-transparent.png',
      white: '/assets/logo/logo-white.png',
      gold: '/assets/logo/logo-gold.png',
      black: '/assets/logo/logo-black.png',
      horizontal: '/assets/logo/logo-horizontal.png',
      compact: '/assets/logo/logo-compact.png',
      monogram: '/assets/logo/logo-monogram.png',
      crown: '/assets/logo/logo-crown.png',
      favicon: '/assets/logo/favicon.png',
      appleTouchIcon: '/assets/logo/apple-touch-icon.png',
    },
    images: {
      heroBg: '/assets/images/backgrounds/hero-bg.webp',
      heroBgFallback: '/assets/images/backgrounds/hero-bg.jpg',
      nightclub: '/assets/images/backgrounds/nightclub.jpg',
      goldTexture: '/assets/images/backgrounds/gold-texture.jpg',
      gallery: {
        wedding: '/assets/images/gallery/gallery-wedding-dancefloor.jpg',
        liveEvent: '/assets/images/gallery/gallery-live-event.jpg',
        corporate: '/assets/images/gallery/gallery-corporate-gala.jpg',
        nightlife: '/assets/images/gallery/gallery-nightlife.jpg',
        privateParty: '/assets/images/gallery/gallery-private-party.jpg',
      },
      events: {
        weddingDancefloor: '/assets/images/events/weddings/wedding-dancefloor.jpg',
        weddingCeremony: '/assets/images/events/weddings/wedding-ceremony.jpg',
        corporate01: '/assets/images/events/corporate/corporate-event-01.jpg',
        corporateGala: '/assets/images/events/corporate/corporate-gala.jpg',
        club01: '/assets/images/events/clubs/club-performance-01.jpg',
        clubCrowd: '/assets/images/events/clubs/club-crowd.jpg',
        birthday01: '/assets/images/events/birthdays/birthday-party-01.jpg',
      },
    },
    videos: {
      promoReel: '/assets/videos/promo-reel.mp4',
      weddingHighlights: '/assets/videos/wedding-highlights.mp4',
      corporateEvents: '/assets/videos/corporate-events.mp4',
      clubPerformances: '/assets/videos/club-performances.mp4',
      behindTheScenes: '/assets/videos/behind-the-scenes.mp4',
    },
  },

  colors: {
    primaryGold: '#D4AF37',
    royalPurple: '#5A2D91',
    accentBurgundy: '#6B0F1A',
    background: '#050505',
  },
}

module.exports = siteConfig
