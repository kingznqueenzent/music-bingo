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

  /**
   * Confirmed service area — based in Brantford; willing to DJ in listed cities.
   * Do not invent street addresses, local offices, or coverage of every location.
   */
  serviceArea: {
    basedIn: 'Brantford',
    basedInProvince: 'Ontario',
    basedInLabel: 'Brantford, Ontario',
    regionLabel: 'Southern Ontario',
    /** Willing-to-DJ cities (includes home base). Not physical office locations. */
    cities: [
      'Brantford',
      'Hamilton',
      'Cambridge',
      'Kitchener-Waterloo',
      'Burlington',
      'London',
      'Toronto',
      'Niagara Region',
    ],
    /** Cities named in supporting copy after "based in Brantford" */
    travelCities: [
      'Hamilton',
      'Cambridge',
      'Kitchener-Waterloo',
      'Burlington',
      'London',
      'Toronto',
      'Niagara',
    ],
    sectionHeading: 'DJ SERVICES ACROSS SOUTHERN ONTARIO',
    sectionCopy:
      'Based in Brantford, Kingz & Queenz Entertainment brings professional DJ entertainment to weddings, private parties, corporate events and special celebrations throughout Hamilton, Cambridge, Kitchener-Waterloo, Burlington, London, Toronto, Niagara and communities across Ontario.',
    travelInquiryCopy: 'Planning an event outside these areas? Contact us about travel and availability.',
    bookingNote: 'Based in Brantford and available for events throughout Southern Ontario.',
    travelDiscussNote: 'Travel requirements can be discussed when confirming your event.',
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
    /** Confirmed official profiles — leave empty until URL is verified */
    instagram: '',
    facebook: '',
    tiktok: 'https://www.tiktok.com/@kingznqueenzent',
    youtube: 'https://www.youtube.com/@KingznQueenzEntertainment',
    mixcloud: '',
    soundcloud: '',
    twitch: 'https://www.twitch.tv/kingznqueenzent',
    kick: 'https://kick.com/kingznqueenzent',
    /**
     * OWN (iOWN) — official handle confirmed; exact public profile/share URL not verified.
     * Do not invent path formats (e.g. /kingznqueenzent). Paste confirmed share link into `own` when ready.
     */
    own: '',
    ownHandle: 'kingznqueenzent',
    /** Platform home only — not a profile CTA */
    ownPlatformHome: 'https://www.iown.app/',
  },

  support: {
    /**
     * Official Patreon — monthly memberships on Patreon only (no on-site billing).
     * Do not invent tiers, prices, benefits, or statistics.
     */
    patreon: 'https://patreon.com/KingnQueenzEnt',
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
      'Kingz & Queenz Entertainment — Brantford-based DJ for weddings, private parties and corporate events across Southern Ontario. Book DJ Merci & DJ Liz.',
    keywords: [
      'Kingz & Queenz Entertainment',
      'Kingz and Queenz Entertainment',
      'DJ Merci',
      'DJ Liz',
      'Brantford DJ',
      'wedding DJ Brantford',
      'Southern Ontario DJ',
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
    youtubeChannel: { enabled: true, status: 'Live' },
    instagramFeed: { enabled: false, status: 'Coming Soon' },
    tiktokFeed: { enabled: true, status: 'Live' },
    newsletterSignup: { enabled: false, status: 'Coming Soon' },
    blog: { enabled: false, status: 'Coming Soon' },
    podcast: { enabled: false, status: 'Coming Soon' },
    patreon: { enabled: true, status: 'Live' },
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
        afroCaribrant2026: '/assets/images/events/afro-caribrant-2026.webp',
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

  /**
   * Confirmed Wedding Entertainment Packages — do not invent prices or rename.
   * Consumed via lib/kingz/wedding-packages.ts
   */
  weddingPackages: [
    {
      id: 'essential',
      name: 'The Essential',
      price: 1000,
      priceLabel: '$1,000',
      subtitle: 'Perfect for Receptions Only',
      featured: false,
      badge: null,
      ctaLabel: 'Select Essential',
      prefillLabel: 'The Essential — $1,000',
      features: [
        'Up to 4 Hours Reception Coverage',
        'Professional Turntable Setup',
        'High-End Sound System (2 Speakers)',
        'Wireless Microphone for Toasts',
        'Customized Dance Floor Playlist',
      ],
    },
    {
      id: 'signature',
      name: 'The Signature',
      price: 1500,
      priceLabel: '$1,500',
      subtitle: 'Full Wedding Experience',
      featured: true,
      badge: 'MOST POPULAR',
      ctaLabel: 'Select Signature',
      prefillLabel: 'The Signature — $1,500',
      features: [
        'Up to 6 Hours Coverage',
        'Ceremony & Reception Coverage',
        'Separate Secondary Audio Setup',
        'Wireless Mics for Officiant & Toasts',
        'Basic Dance Floor Lighting Package',
      ],
    },
    {
      id: 'premier',
      name: 'The Premier',
      price: 2200,
      priceLabel: '$2,200',
      subtitle: 'The Ultimate Party',
      featured: false,
      badge: null,
      ctaLabel: 'Select Premier',
      prefillLabel: 'The Premier — $2,200',
      features: [
        'Unlimited Day-of Coverage (8+ Hours)',
        'Full Production Sound + Subwoofers',
        'Full Room Uplighting (8–12 Lights)',
        'Master of Ceremonies (MC) Services',
        'Priority Playlist Planning',
      ],
    },
  ],

  customEventNote:
    'Custom packages are available for corporate events, private parties, club nights, and special productions.',
  customEventPrefill: 'Custom Event Package',

  /**
   * Confirmed public appearances — consumed via lib/kingz/events.ts
   * Do not invent set times, ticket prices, attendance, offers, or ratings.
   * After endDate, events surface under Past Highlights automatically.
   */
  events: [
    {
      id: 'afro-caribrant-2026',
      title: 'Afro-CariBrant Festival 2026',
      displayTitle: 'AFRO-CARIBRANT FESTIVAL 2026',
      startDate: '2026-09-05',
      endDate: '2026-09-06',
      time: '12:00 PM – 8:00 PM',
      timeShort: '12 PM – 8 PM',
      venue: 'Paris Lions Park',
      city: 'Paris',
      province: 'Ontario',
      role: 'Featured DJs',
      badge: 'LIVE BOTH DAYS',
      image: '/assets/images/events/afro-caribrant-2026.webp',
      imageAlt:
        'Afro-CariBrant Festival 2026 flyer featuring Kingz & Queenz Entertainment at Paris Lions Park, September 5–6',
      url: 'https://afrocaribrantfestival.org/',
      featured: true,
      copy:
        'Join Kingz & Queenz Entertainment at Afro-CariBrant Festival for a full weekend of music, culture, food, performances and community at Paris Lions Park.',
      tagline: 'Catch Kingz & Queenz Entertainment live throughout the weekend.',
      highlights: [
        'SEPTEMBER 5–6, 2026',
        '12 PM – 8 PM',
        'PARIS LIONS PARK',
        'PARIS, ONTARIO',
      ],
      calendarDays: [
        {
          date: '2026-09-05',
          label: 'September 5, 2026',
          weekday: 'Saturday',
        },
        {
          date: '2026-09-06',
          label: 'September 6, 2026',
          weekday: 'Sunday',
        },
      ],
    },
  ],
}

module.exports = siteConfig
