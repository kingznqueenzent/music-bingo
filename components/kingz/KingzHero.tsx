'use client'

import Image from 'next/image'
import { KINGZ_CONTACT, TRUST_METRICS, HERO_BACKGROUND } from '@/lib/kingz/data'
import { buildPlatformCtas } from '@/lib/kingz/merch'
import { KingzCtaAction } from './KingzIntegrationLink'
import { KingzLogo } from './KingzLogo'
import { useKingzHeroAnimation } from './useKingzGsap'

export function KingzHero() {
  const ref = useKingzHeroAnimation<HTMLElement>()

  return (
    <section
      id="home"
      ref={ref}
      className="relative min-h-dvh flex items-center justify-center overflow-hidden"
      aria-labelledby="hero-heading"
    >
      {/* Replace with Professional Hero Background — /assets/images/backgrounds/hero-bg.jpg */}
      <Image
        src={HERO_BACKGROUND}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
        aria-hidden
      />
      {/* Logo-matched overlay: deep black + burgundy/purple wash */}
      <div
        className="absolute inset-0 bg-[#050505]/75"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-[#5A2D91]/25 via-transparent to-[#6B0F1A]/35"
        aria-hidden
      />

      <div className="relative z-10 kingz-container px-6 py-28 md:py-32 text-center md:text-left md:pl-[8%]">
        {/* Official full-color logo — brand-first hero */}
        <div data-hero-headline className="mb-8 flex justify-center md:justify-start">
          <KingzLogo size="hero" variant="full" priority className="max-md:hidden" />
          <KingzLogo size="mobile-hero" variant="full" priority className="md:hidden" />
        </div>

        <p
          data-hero-headline
          className="text-[#D4AF37] text-sm uppercase tracking-[0.3em] mb-4 font-medium"
        >
          Brantford&apos;s Premier DJ Experience
        </p>
        <h1
          id="hero-heading"
          data-hero-headline
          className="kingz-heading text-4xl sm:text-5xl lg:text-6xl font-bold kingz-gold-gradient max-w-3xl leading-tight mb-8"
          style={{ letterSpacing: '1px' }}
        >
          Premium DJ Experience in Brantford
        </h1>

        <div
          data-hero-banner
          className="kingz-pulse-banner inline-flex flex-wrap items-center justify-center md:justify-start gap-2 px-5 py-3 mb-10 rounded-lg border border-[#D4AF37]/40 bg-[#050505]/80 text-sm text-[#f5d276]"
        >
          <span>Catch us LIVE on</span>
          <a
            href={KINGZ_CONTACT.kick}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline hover:text-[#f9e8b0] transition-colors"
          >
            Kick.com/kingznqueenzent
          </a>
          <span aria-hidden>·</span>
          <a
            href={KINGZ_CONTACT.twitch}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline hover:text-[#f9e8b0] transition-colors"
          >
            Twitch.tv/kingznqueenzent
          </a>
        </div>

        <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 mb-10">
          {TRUST_METRICS.map(({ value, label }) => (
            <div key={label} data-hero-metric className="text-center md:text-left">
              <p className="text-[#D4AF37] text-xl font-bold">{value}</p>
              <p className="text-[#b0b0b0] text-sm">{label}</p>
            </div>
          ))}
        </div>

        <div data-hero-cta className="flex flex-wrap gap-3 justify-center md:justify-start max-w-3xl">
          {buildPlatformCtas()
            .filter((c) =>
              ['Shop Merch', 'Support Us', 'Book an Event', 'Join Patreon', 'Buy Us a Coffee'].includes(c.label)
            )
            .map((cta) => (
              <span key={cta.label} data-hero-cta>
                <KingzCtaAction {...cta} className="text-sm" />
              </span>
            ))}
        </div>
      </div>

      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 w-px h-16 bg-gradient-to-b from-[#D4AF37] via-[#5A2D91] to-transparent opacity-60"
        aria-hidden
      />
    </section>
  )
}
