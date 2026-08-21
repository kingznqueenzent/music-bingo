/**
 * Kingz appearance / festival events — single source via config/site-config.js
 * Status is derived from endDate (end of local calendar day).
 */

import siteConfig from '@/config/site-config'

export type KingzEventStatus = 'upcoming' | 'past'

export type KingzEvent = {
  id: string
  title: string
  /** Display title for featured card (may be uppercase styling in UI) */
  displayTitle: string
  startDate: string
  endDate: string
  time: string
  timeShort: string
  venue: string
  city: string
  province: string
  role: string
  badge: string
  image: string
  imageAlt: string
  url: string
  featured: boolean
  copy: string
  tagline: string
  highlights: string[]
  /** Calendar rows — one per festival day when multi-day */
  calendarDays: Array<{
    date: string
    label: string
    weekday: string
  }>
}

type RawEvent = {
  id: string
  title: string
  displayTitle?: string
  startDate: string
  endDate: string
  time: string
  timeShort?: string
  venue: string
  city: string
  province: string
  role: string
  badge?: string
  image: string
  imageAlt?: string
  url: string
  featured?: boolean
  copy: string
  tagline?: string
  highlights?: string[]
  calendarDays?: KingzEvent['calendarDays']
}

function endOfDayMs(isoDate: string): number {
  // Local end-of-day so Sept 6 stays "upcoming" until that calendar day ends
  return new Date(`${isoDate}T23:59:59`).getTime()
}

export function getEventStatus(event: Pick<KingzEvent, 'endDate'>, now = new Date()): KingzEventStatus {
  return now.getTime() > endOfDayMs(event.endDate) ? 'past' : 'upcoming'
}

function normalizeEvent(raw: RawEvent): KingzEvent {
  const start = new Date(`${raw.startDate}T12:00:00`)
  const end = new Date(`${raw.endDate}T12:00:00`)
  const defaultDays: KingzEvent['calendarDays'] = []
  for (let t = start.getTime(); t <= end.getTime(); t += 24 * 60 * 60 * 1000) {
    const d = new Date(t)
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    defaultDays.push({
      date: iso,
      label: d.toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' }),
      weekday: d.toLocaleDateString('en-CA', { weekday: 'long' }),
    })
  }

  return {
    id: raw.id,
    title: raw.title,
    displayTitle: raw.displayTitle || raw.title.toUpperCase(),
    startDate: raw.startDate,
    endDate: raw.endDate,
    time: raw.time,
    timeShort: raw.timeShort || raw.time,
    venue: raw.venue,
    city: raw.city,
    province: raw.province,
    role: raw.role,
    badge: raw.badge || 'FEATURED DJs',
    image: raw.image,
    imageAlt: raw.imageAlt || `${raw.title} flyer`,
    url: raw.url,
    featured: Boolean(raw.featured),
    copy: raw.copy,
    tagline: raw.tagline || 'Catch Kingz & Queenz Entertainment live throughout the weekend.',
    highlights: raw.highlights || [],
    calendarDays: raw.calendarDays?.length ? raw.calendarDays : defaultDays,
  }
}

const rawEvents = ((siteConfig as { events?: RawEvent[] }).events || []) as RawEvent[]

export const KINGZ_EVENTS: KingzEvent[] = rawEvents.map(normalizeEvent)

export function getUpcomingEvents(now = new Date()): KingzEvent[] {
  return KINGZ_EVENTS.filter((e) => getEventStatus(e, now) === 'upcoming').sort((a, b) =>
    a.startDate.localeCompare(b.startDate)
  )
}

export function getPastEvents(now = new Date()): KingzEvent[] {
  return KINGZ_EVENTS.filter((e) => getEventStatus(e, now) === 'past').sort((a, b) =>
    b.endDate.localeCompare(a.endDate)
  )
}

export function getFeaturedUpcomingEvent(now = new Date()): KingzEvent | null {
  const upcoming = getUpcomingEvents(now)
  return upcoming.find((e) => e.featured) || upcoming[0] || null
}

/** Dates Kingz is booked for public appearances — block on the booking calendar */
export function getAppearanceBlockedDates(now = new Date()): string[] {
  const dates: string[] = []
  for (const event of getUpcomingEvents(now)) {
    for (const day of event.calendarDays) {
      dates.push(day.date)
    }
  }
  return dates
}

/** Truthful Event JSON-LD — no offers, prices, ratings, or invented organizer */
export function buildEventJsonLd(event: KingzEvent, siteUrl: string) {
  const base = siteUrl.replace(/\/$/, '')
  return {
    '@type': 'Event',
    '@id': `${base}/#event-${event.id}`,
    name: event.title,
    description: event.copy,
    startDate: event.startDate,
    endDate: event.endDate,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    image: [`${base}${event.image}`],
    url: event.url,
    location: {
      '@type': 'Place',
      name: event.venue,
      address: {
        '@type': 'PostalAddress',
        addressLocality: event.city,
        addressRegion: event.province,
        addressCountry: 'CA',
      },
    },
    performer: {
      '@type': 'PerformingGroup',
      name: 'Kingz & Queenz Entertainment',
      url: base,
    },
  }
}

export function buildUpcomingEventsJsonLd(siteUrl: string, now = new Date()) {
  return getUpcomingEvents(now).map((e) => buildEventJsonLd(e, siteUrl))
}
