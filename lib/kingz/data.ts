/**
 * Kingz content — images from /assets/images only (never /assets/raw)
 * Links from config/site-config.js
 */

import siteConfig from '@/config/site-config'

export const KINGZ_CONTACT = {
  phone: siteConfig.contact.phone,
  phoneHref: siteConfig.contact.phoneHref,
  email: siteConfig.contact.bookingEmail || siteConfig.contact.email,
  location: siteConfig.brand.location,
  address: siteConfig.contact.address || siteConfig.contact.businessAddress,
  googleMapsEmbed: siteConfig.contact.googleMapsEmbed,
  twitch: siteConfig.social.twitch,
  kick: siteConfig.social.kick,
  instagram: siteConfig.social.instagram,
  facebook: siteConfig.social.facebook,
  tiktok: siteConfig.social.tiktok,
  youtube: siteConfig.social.youtube,
  mixcloud: siteConfig.social.mixcloud,
  soundcloud: siteConfig.social.soundcloud,
} as const

export const NAV_LINKS = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'team', label: 'DJs' },
  { id: 'services', label: 'Services' },
  { id: 'videos', label: 'Videos' },
  { id: 'merch', label: 'Royal Collection' },
  { id: 'support', label: 'Support' },
  { id: 'booking', label: 'Book Us' },
  { id: 'contact', label: 'Contact' },
] as const

/** Atmosphere labels only — no invented stats or ratings */
export const TRUST_METRICS = [
  { value: 'Weddings', label: 'Celebrations' },
  { value: 'Corporate', label: 'Events' },
  { value: 'Live', label: 'Entertainment' },
] as const

export const SERVICES = [
  {
    icon: '🎧',
    title: 'Event DJing',
    description: 'Premium sound, seamless transitions, and energy tailored to your crowd from first track to last call.',
  },
  {
    icon: '💍',
    title: 'Wedding DJ',
    description: 'Ceremony through reception — curated playlists, MC services, and moments your guests will remember.',
  },
  {
    icon: '🏢',
    title: 'Corporate Events',
    description: 'Polished, professional entertainment for galas, conferences, and brand activations.',
  },
  {
    icon: '📺',
    title: 'Livestreaming',
    description: 'Broadcast-quality virtual events on Twitch and Kick with interactive audience engagement.',
  },
  {
    icon: '🎵',
    title: 'Custom Playlists',
    description: 'Bespoke music curation built around your vision, vibe, and must-play list.',
  },
  {
    icon: '🎉',
    title: 'Party Entertainment',
    description: 'High-energy celebration DJing with lighting cues and crowd-reading expertise.',
  },
] as const

/** Gallery — event atmosphere / equipment only (no DJ portraits or stock performers) */
export const GALLERY_IMAGES = [
  {
    // Atmosphere art — replace with real Kingz event photography when available
    src: siteConfig.assets.images.gallery.wedding,
    alt: 'Black and gold stage lighting with DJ controller silhouette',
    caption: 'Event Lighting',
  },
  {
    src: siteConfig.assets.images.gallery.liveEvent,
    alt: 'Live event stage lighting and crowd from behind',
    caption: 'Live Atmosphere',
  },
  {
    src: siteConfig.assets.images.gallery.corporate,
    alt: 'Empty corporate event venue setup',
    caption: 'Corporate Events',
  },
  {
    src: siteConfig.assets.images.gallery.nightlife,
    alt: 'Nightlife dance floor and club lighting from the crowd',
    caption: 'Nightlife',
  },
  {
    src: siteConfig.assets.images.gallery.privateParty,
    alt: 'Celebration lighting atmosphere over a festival crowd',
    caption: 'Celebrations',
  },
] as const

export const VIDEO_GALLERY = [
  {
    id: 'wedding-highlight',
    title: 'Wedding Highlight Reel',
    // Atmosphere thumbnail only until real Kingz video + photography is supplied
    thumbnail: siteConfig.assets.images.events.weddingCeremony,
    embedUrl: '',
    duration: '',
  },
  {
    id: 'corporate-gala',
    title: 'Corporate Events',
    thumbnail: siteConfig.assets.images.events.corporateGala,
    embedUrl: '',
    duration: '',
  },
  {
    id: 'club-set',
    title: 'Club Performance',
    thumbnail: siteConfig.assets.images.events.club01,
    embedUrl: '',
    duration: '',
  },
] as const

/**
 * Real mix URLs only — leave empty until official audio is supplied.
 * Do not attribute sample/demo files to the DJs.
 */
export type KingzTrack = {
  id: string
  title: string
  artist: string
  src: string
  duration?: string
}

export const MUSIC_PLAYLIST: KingzTrack[] = []

export const BOOKING_AVAILABILITY = {
  availableDays: [3, 4, 5, 6, 0] as number[],
  blockedDates: [] as string[],
}

export const HERO_BACKGROUND = siteConfig.assets.images.heroBg
