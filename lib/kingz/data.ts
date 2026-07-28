/**
 * Kingz & Queenz — content & media paths
 *
 * Contact / social / store URLs: edit config/site-config.js
 * Images: always from /assets/images/... (never /assets/raw)
 */

import siteConfig from '@/config/site-config'

export const KINGZ_CONTACT = {
  phone: siteConfig.contact.phone,
  phoneHref: siteConfig.contact.phoneHref,
  email: siteConfig.contact.email ?? siteConfig.contact.bookingEmail,
  location: siteConfig.brand.location,
  address: siteConfig.contact.address ?? siteConfig.contact.businessAddress,
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
  { id: 'services', label: 'Services' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'team', label: 'Team' },
  { id: 'merch', label: 'Merch' },
  { id: 'support', label: 'Support' },
  { id: 'livestreams', label: 'Livestreams' },
  { id: 'booking', label: 'Booking' },
  { id: 'contact', label: 'Contact' },
] as const

export const TRUST_METRICS = [
  { value: '500+', label: 'Events Hosted' },
  { value: '4.9★', label: 'Rating' },
  { value: '10+', label: 'Years Experience' },
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

/** Gallery — files under public/assets/images/gallery/ (never /assets/raw) */
export const GALLERY_IMAGES = [
  {
    // Replace with Professional Wedding Event Photo
    src: siteConfig.assets.images.gallery.wedding,
    alt: 'Wedding reception dance floor with premium lighting',
    caption: 'Wedding Reception',
  },
  {
    // Replace with Professional Club / Live Event Photo
    src: siteConfig.assets.images.gallery.liveEvent,
    alt: 'Live concert crowd with stage lights',
    caption: 'Live Event',
  },
  {
    // Replace with Professional Corporate Event Photo
    src: siteConfig.assets.images.gallery.corporate,
    alt: 'Corporate gala with elegant lighting',
    caption: 'Corporate Gala',
  },
  {
    // Replace with Professional Nightlife Photo
    src: siteConfig.assets.images.gallery.nightlife,
    alt: 'DJ performing at a nightclub',
    caption: 'Nightlife',
  },
  {
    // Replace with Professional Birthday / Private Party Photo
    src: siteConfig.assets.images.gallery.privateParty,
    alt: 'Party celebration with gold ambient lighting',
    caption: 'Private Party',
  },
] as const

export const VIDEO_GALLERY = [
  {
    id: 'wedding-highlight',
    title: 'Wedding Highlight Reel',
    // Replace with Wedding Highlight Reel thumbnail
    thumbnail: siteConfig.assets.images.events.weddingCeremony,
    // FUTURE: siteConfig.assets.videos.weddingHighlights or YouTube embed
    embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    duration: '2:34',
  },
  {
    id: 'corporate-gala',
    title: 'Corporate Gala Night',
    // Replace with Corporate Event Reel thumbnail
    thumbnail: siteConfig.assets.images.events.corporateGala,
    // FUTURE: siteConfig.assets.videos.corporateEvents
    embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    duration: '3:12',
  },
  {
    id: 'livestream-set',
    title: 'Livestream DJ Set',
    // Replace with Club Performance Reel thumbnail
    thumbnail: siteConfig.assets.images.events.club01,
    // FUTURE: siteConfig.assets.videos.clubPerformances
    embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    duration: '45:00',
  },
] as const

export const TEAM = [
  {
    name: 'DJ Liz',
    title: 'Co-Founder & Lead DJ',
    // Replace with Professional Photo of DJ Liz
    image: siteConfig.assets.images.djLiz.profile,
    bio: 'With a decade of wedding and corporate experience, DJ Liz brings impeccable taste and flawless timing to every set. Her ability to read a room and elevate the energy is unmatched.',
    tags: ['Weddings', 'Corporate', 'R&B / Pop'],
  },
  {
    name: 'DJ Merci',
    title: 'Co-Founder & Livestream Director',
    // Replace with Professional Photo of DJ Merci
    image: siteConfig.assets.images.djMerci.profile,
    bio: 'DJ Merci specializes in high-energy party sets and broadcast production. From Twitch takeovers to festival stages, he delivers cinematic sound and showmanship.',
    tags: ['Parties', 'Livestreaming', 'Hip-Hop / EDM'],
  },
] as const

export const TESTIMONIALS = [
  {
    quote: 'Kingz & Queenz made our wedding absolutely magical. Every song was perfect, and the dance floor was packed all night.',
    name: 'Sarah & Michael',
    event: 'Wedding',
    rating: 5,
  },
  {
    quote: 'Professional, punctual, and incredibly talented. Our corporate gala felt like a Vegas nightclub — our clients are still talking about it.',
    name: 'Jennifer Walsh',
    event: 'Corporate',
    rating: 5,
  },
  {
    quote: 'The livestream production quality blew us away. DJ Merci engaged our virtual audience better than any vendor we have used.',
    name: 'Marcus Chen',
    event: 'Livestream',
    rating: 5,
  },
  {
    quote: 'From the first consultation to the last song, everything was seamless. Worth every penny for a premium experience.',
    name: 'Amanda & David',
    event: 'Wedding',
    rating: 5,
  },
] as const

export const MUSIC_PLAYLIST = [
  {
    id: 'track-1',
    title: 'Golden Hour',
    artist: 'DJ Liz',
    src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    duration: '3:42',
  },
  {
    id: 'track-2',
    title: 'Midnight Crown',
    artist: 'DJ Merci',
    src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    duration: '4:15',
  },
  {
    id: 'track-3',
    title: 'Brantford Nights',
    artist: 'Kingz & Queenz',
    src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    duration: '3:58',
  },
] as const

export const BOOKING_AVAILABILITY = {
  availableDays: [3, 4, 5, 6, 0] as number[],
  blockedDates: ['2026-07-04', '2026-12-25', '2026-12-31'],
}

/** Hero background — replace public/assets/images/backgrounds/hero-bg.jpg */
export const HERO_BACKGROUND = siteConfig.assets.images.heroBg
