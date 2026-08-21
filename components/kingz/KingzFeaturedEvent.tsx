'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { ExternalLink, X } from 'lucide-react'
import {
  getFeaturedUpcomingEvent,
  getPastEvents,
  getUpcomingEvents,
  type KingzEvent,
} from '@/lib/kingz/events'
import { useKingzReveal } from './useKingzGsap'

function FlyerLightbox({
  event,
  open,
  onClose,
}: {
  event: KingzEvent
  open: boolean
  onClose: () => void
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050505]/90 backdrop-blur-sm p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`${event.title} flyer`}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-[#D4AF37]/40 bg-[#050505]/90 text-[#D4AF37] touch-manipulation"
        aria-label="Close flyer"
      >
        <X className="h-5 w-5" />
      </button>
      <div
        className="relative max-h-[92dvh] w-full max-w-lg overflow-auto rounded-lg border border-[#D4AF37]/30 bg-[#0a0a0a] shadow-[0_0_40px_rgba(90,45,145,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={event.image}
          alt={event.imageAlt}
          width={1080}
          height={1350}
          className="h-auto w-full"
          quality={90}
          sizes="(max-width: 640px) 100vw, 512px"
          priority
        />
      </div>
    </div>
  )
}

function FeaturedEventCard({
  event,
  onOpenFlyer,
}: {
  event: KingzEvent
  onOpenFlyer: () => void
}) {
  return (
    <article
      data-kingz-reveal
      className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/35 bg-gradient-to-br from-[#1a1028] via-[#0d0d0d] to-[#1a0a12] shadow-[0_0_48px_rgba(90,45,145,0.22)]"
      aria-labelledby="featured-event-title"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(ellipse at 20% 0%, rgba(212,175,55,0.18), transparent 55%), radial-gradient(ellipse at 90% 80%, rgba(90,45,145,0.28), transparent 50%)',
        }}
        aria-hidden
      />

      <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-10 lg:p-10">
        <button
          type="button"
          onClick={onOpenFlyer}
          className="group relative mx-auto w-full max-w-sm overflow-hidden rounded-xl border border-[#D4AF37]/25 bg-[#050505] text-left touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
          aria-label={`Enlarge ${event.title} flyer`}
        >
          <Image
            src={event.image}
            alt={event.imageAlt}
            width={1080}
            height={1350}
            className="h-auto w-full transition-transform duration-500 group-hover:scale-[1.02]"
            sizes="(max-width: 1024px) 90vw, 380px"
            quality={80}
            priority
          />
          <span className="absolute inset-x-0 bottom-0 bg-[#050505]/80 px-3 py-2 text-center text-[11px] uppercase tracking-[0.18em] text-[#f5d276]">
            Tap to enlarge
          </span>
        </button>

        <div className="flex flex-col justify-center text-center lg:text-left">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.28em] text-[#8b5cb8]">
            Upcoming Featured Event
          </p>
          <span className="mb-4 inline-flex self-center rounded border border-[#D4AF37]/50 bg-[#D4AF37]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#D4AF37] lg:self-start">
            {event.badge}
          </span>
          <h3
            id="featured-event-title"
            className="kingz-heading mb-4 text-2xl font-bold leading-tight text-[#D4AF37] sm:text-3xl lg:text-4xl"
          >
            {event.displayTitle}
          </h3>
          <p className="mb-5 text-sm leading-relaxed text-[#d4d4d4] sm:text-base">{event.copy}</p>
          <p className="mb-6 text-sm leading-relaxed text-[#b0b0b0]">{event.tagline}</p>
          <p className="mb-8 text-xs font-medium uppercase tracking-[0.12em] text-[#f5d276] sm:text-sm sm:tracking-[0.14em]">
            {event.highlights.join(' | ')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <a
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              className="kingz-btn-gold inline-flex min-h-[44px] items-center gap-2 touch-manipulation"
            >
              Festival Details
              <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
            <p className="w-full text-xs text-[#888] lg:w-auto">
              {event.role} · {event.venue}, {event.city}
            </p>
          </div>
        </div>
      </div>
    </article>
  )
}

function EventDayRow({ event, day }: { event: KingzEvent; day: KingzEvent['calendarDays'][number] }) {
  return (
    <li className="flex flex-col gap-2 border-b border-[#D4AF37]/15 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0 text-left">
        <p className="kingz-heading text-lg text-[#f5d276]">
          {day.weekday}, {day.label}
        </p>
        <p className="mt-1 text-sm text-[#f5f5f5]">{event.title}</p>
        <p className="mt-1 text-sm text-[#b0b0b0]">
          {event.venue} · {event.city}, {event.province}
        </p>
      </div>
      <div className="shrink-0 text-left sm:text-right">
        <p className="text-xs uppercase tracking-[0.14em] text-[#8b5cb8]">{event.role}</p>
        <p className="mt-1 text-sm text-[#d4d4d4]">{event.timeShort}</p>
      </div>
    </li>
  )
}

export function KingzFeaturedEvent() {
  const ref = useKingzReveal<HTMLElement>()
  const featured = getFeaturedUpcomingEvent()
  const upcoming = getUpcomingEvents()
  const past = getPastEvents()
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const closeLightbox = useCallback(() => setLightboxOpen(false), [])

  if (!featured && upcoming.length === 0 && past.length === 0) {
    return null
  }

  return (
    <section
      id="events"
      ref={ref}
      className="kingz-section bg-[#120c18]"
      aria-labelledby="events-heading"
    >
      <div className="kingz-container">
        <div className="mb-10 text-center sm:mb-12" data-kingz-reveal>
          <div className="kingz-deco-bar mx-auto mb-6" aria-hidden />
          <h2 id="events-heading" className="kingz-heading mb-3 text-3xl font-semibold text-[#D4AF37] lg:text-4xl">
            Upcoming Events
          </h2>
          <p className="mx-auto max-w-2xl text-sm text-[#b0b0b0] sm:text-base">
            Catch Kingz &amp; Queenz Entertainment live at festivals and special appearances.
          </p>
        </div>

        {featured ? (
          <div className="mb-12">
            <FeaturedEventCard event={featured} onOpenFlyer={() => setLightboxOpen(true)} />
          </div>
        ) : null}

        {upcoming.length > 0 ? (
          <div data-kingz-reveal className="kingz-card mx-auto max-w-3xl p-6 sm:p-8">
            <h3 className="kingz-heading mb-2 text-center text-xl text-[#D4AF37]">Event Calendar</h3>
            <p className="mb-4 text-center text-xs uppercase tracking-[0.16em] text-[#8b5cb8]">
              Confirmed appearances
            </p>
            <ul className="divide-y-0">
              {upcoming.flatMap((event) =>
                event.calendarDays.map((day) => (
                  <EventDayRow key={`${event.id}-${day.date}`} event={event} day={day} />
                ))
              )}
            </ul>
          </div>
        ) : null}

        {past.length > 0 ? (
          <div data-kingz-reveal className="mx-auto mt-12 max-w-3xl">
            <h3 className="kingz-heading mb-4 text-center text-xl text-[#D4AF37]">Past Highlights</h3>
            <ul className="space-y-3">
              {past.map((event) => (
                <li
                  key={event.id}
                  className="rounded-xl border border-[#D4AF37]/15 bg-[#0a0a0a]/60 px-5 py-4 text-center sm:text-left"
                >
                  <p className="kingz-heading text-[#f5d276]">{event.title}</p>
                  <p className="mt-1 text-sm text-[#b0b0b0]">
                    {event.startDate === event.endDate
                      ? event.startDate
                      : `${event.startDate} – ${event.endDate}`}{' '}
                    · {event.venue}, {event.city}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {featured ? (
        <FlyerLightbox event={featured} open={lightboxOpen} onClose={closeLightbox} />
      ) : null}
    </section>
  )
}
