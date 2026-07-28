/**
 * ============================================================================
 * KINGZ & QUEENZ ENTERTAINMENT — SITE CONFIG (single source of truth)
 * ============================================================================
 * Path: /config/site-config.js
 *
 * Update business links HERE only. Never duplicate URLs across pages.
 * Components import via lib/kingz/* wrappers.
 * ============================================================================
 */

const siteConfig = {
  /* ------------------------------------------------------------------ */
  /* BUSINESS                                                           */
  /* ------------------------------------------------------------------ */
  brand: {
    name: 'Kingz & Queenz Entertainment',
    tagline: 'Premium DJ Experience in Brantford',
    location: 'Brantford, ON',
  },

  /* ------------------------------------------------------------------ */
  /* CONTACT                                                            */
  /* ------------------------------------------------------------------ */
  contact: {
    phone: '519-802-7212',
    phoneHref: 'tel:+15198027212',
    email: 'kingzandqueenzentertainment@gmail.com',
    bookingEmail: 'kingzandqueenzentertainment@gmail.com',
    address: 'Brantford, ON, Canada',
    businessAddress: 'Brantford, ON, Canada',
    googleMapsEmbed: 'https://maps.google.com/maps?q=Brantford,ON&output=embed',
    googleMapsUrl: 'https://maps.google.com/?q=Brantford,ON',
  },

  /* ------------------------------------------------------------------ */
  /* SOCIAL — paste live profile URLs                                   */
  /* ------------------------------------------------------------------ */
  social: {
    instagram: '#paste-instagram-url-here',
    facebook: '#paste-facebook-url-here',
    tiktok: '#paste-tiktok-url-here',
    youtube: '#paste-youtube-url-here',
    mixcloud: '#paste-mixcloud-url-here',
    soundcloud: '#paste-soundcloud-url-here',
    twitch: 'https://www.twitch.tv/kingznqueenzent',
    kick: 'https://kick.com/kingznqueenzent',
  },

  /* ------------------------------------------------------------------ */
  /* SUPPORT — Coming Soon until URLs are live                          */
  /* ------------------------------------------------------------------ */
  support: {
    patreon: '#paste-patreon-url-here', // Coming Soon
    buyMeACoffee: '#paste-buy-me-a-coffee-url-here', // Coming Soon
  },

  /* ------------------------------------------------------------------ */
  /* MERCHANDISE — Coming Soon (do NOT activate Printify/Printful/etc.) */
  /* ------------------------------------------------------------------ */
  merch: {
    /** Future Merchandise URL (Royal Collection storefront) */
    storeUrl: '#paste-merch-store-url-here',
    printify: '#paste-printify-store-url-here', // Coming Soon
    printful: '#paste-printful-store-url-here', // Coming Soon
    shopify: '#paste-shopify-storefront-url-here', // Coming Soon
    stripe: {
      essentialPackage: '#paste-stripe-payment-link-essential',
      premiumPackage: '#paste-stripe-payment-link-premium',
      royalPackage: '#paste-stripe-payment-link-royal',
      mixtapeVol1: '#paste-stripe-payment-link-mixtape-vol1',
      mixtapeVol2: '#paste-stripe-payment-link-mixtape-vol2',
      vipBundle: '#paste-stripe-payment-link-vip-bundle',
      supportDjLiz: '#paste-stripe-payment-link-support-liz',
      supportDjMerci: '#paste-stripe-payment-link-support-merci',
      deposit: '#paste-stripe-deposit-link-here', // Coming Soon — Stripe Deposits
    },
  },

  /* ------------------------------------------------------------------ */
  /* SEO DEFAULTS                                                       */
  /* ------------------------------------------------------------------ */
  seo: {
    title: 'Kingz & Queenz Entertainment | Premium DJ Service — Brantford, ON',
    metaDescription:
      'Premium DJ entertainment for weddings, corporate events, and parties in Brantford, ON. DJ Liz & DJ Merci.',
    keywords: [
      'DJ Brantford',
      'wedding DJ Ontario',
      'Kingz Queenz Entertainment',
      'corporate event DJ',
    ],
    openGraphImage: '/assets/images/social/og-image.jpg', // Coming Soon — add file
    twitterCardImage: '/assets/images/social/twitter-card.jpg', // Coming Soon — add file
    canonicalUrl: process.env.NEXT_PUBLIC_KINGZ_SITE_URL || 'https://kingzqueenz-g5vpu6na.manus.space',
  },

  /* ------------------------------------------------------------------ */
  /* ANALYTICS & MARKETING — Coming Soon (do not activate yet)          */
  /* ------------------------------------------------------------------ */
  analytics: {
    /** Google Analytics 4 measurement ID — e.g. G-XXXXXXXX */
    googleAnalyticsId: '#paste-ga4-measurement-id-here', // Coming Soon
    /** Meta (Facebook) Pixel ID */
    metaPixelId: '#paste-meta-pixel-id-here', // Coming Soon
  },

  /* ------------------------------------------------------------------ */
  /* NEWSLETTER — Coming Soon                                           */
  /* ------------------------------------------------------------------ */
  newsletter: {
    provider: 'none', // future: 'mailchimp' | 'convertkit' | 'klaviyo'
    signupUrl: '#paste-newsletter-signup-url-here', // Coming Soon
    embedFormId: '#paste-newsletter-form-id-here',
  },

  /* ------------------------------------------------------------------ */
  /* FUTURE INTEGRATIONS — Coming Soon (placeholders only)              */
  /* ------------------------------------------------------------------ */
  futureIntegrations: {
    googleReviews: { enabled: false, status: 'Coming Soon', url: '#paste-google-reviews-url' },
    googleCalendarBooking: { enabled: false, status: 'Coming Soon', url: '#paste-google-calendar-booking' },
    stripeDeposits: { enabled: false, status: 'Coming Soon' },
    youtubeChannel: { enabled: false, status: 'Coming Soon' },
    instagramFeed: { enabled: false, status: 'Coming Soon' },
    tiktokFeed: { enabled: false, status: 'Coming Soon' },
    newsletterSignup: { enabled: false, status: 'Coming Soon' },
    blog: { enabled: false, status: 'Coming Soon' },
    podcast: { enabled: false, status: 'Coming Soon' },
    royalCollectionMerch: { enabled: false, status: 'Coming Soon' },
    patreon: { enabled: false, status: 'Coming Soon' },
    buyMeACoffee: { enabled: false, status: 'Coming Soon' },
    printify: { enabled: false, status: 'Coming Soon' },
    printful: { enabled: false, status: 'Coming Soon' },
  },

  /* ------------------------------------------------------------------ */
  /* ASSET PATHS — only /assets/images (never /assets/raw)              */
  /* ------------------------------------------------------------------ */
  assets: {
    logo: {
      main: '/assets/logo/logo-main.png',
      transparent: '/assets/logo/logo-transparent.png',
      white: '/assets/logo/logo-white.png',
      gold: '/assets/logo/logo-gold.png',
      black: '/assets/logo/logo-black.png',
      horizontal: '/assets/logo/logo-horizontal.png',
      compact: '/assets/logo/logo-compact.png',
      monogram: '/assets/logo/logo-monogram.png', // Coming Soon — official monogram
      crown: '/assets/logo/logo-crown.png', // Coming Soon — crown-only mark
      favicon: '/assets/logo/favicon.ico',
      appleTouchIcon: '/assets/logo/apple-touch-icon.png',
      // FUTURE: logo.svg — vector master when available
    },
    images: {
      heroBg: '/assets/images/backgrounds/hero-bg.jpg',
      nightclub: '/assets/images/backgrounds/nightclub.jpg',
      goldTexture: '/assets/images/backgrounds/gold-texture.jpg',
      djLiz: {
        hero: '/assets/images/dj-liz/dj-liz-hero.jpg',
        profile: '/assets/images/dj-liz/dj-liz-profile.jpg',
        liveStage: '/assets/images/dj-liz/dj-liz-live-stage.jpg',
        event: '/assets/images/dj-liz/dj-liz-event.jpg',
      },
      djMerci: {
        hero: '/assets/images/dj-merci/dj-merci-hero.jpg',
        profile: '/assets/images/dj-merci/dj-merci-profile.jpg',
        liveStage: '/assets/images/dj-merci/dj-merci-live-stage.jpg',
        event: '/assets/images/dj-merci/dj-merci-event.jpg',
      },
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
      // Replace empty placeholders in public/assets/videos/ with real files
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
