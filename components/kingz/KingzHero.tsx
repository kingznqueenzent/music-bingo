'use client'

import Image from 'next/image'
import { KINGZ_CONTACT, TRUST_METRICS, HERO_BACKGROUND } from '@/lib/kingz/data'
import { buildPlatformCtas } from '@/lib/kingz/merch'
import { KingzCtaAction } from './KingzIntegrationLink'
import { KingzLogo } from './KingzLogo'
import { useKingzHeroAnimation } from './useKingzGsap'

const PRIMARY_CTAS = ['Book Now', 'Shop Merch', 'Support Us'] as const
const SECONDARY_CTAS = ['Buy Us a Coffee', 'Become Royalty'] as const

export function KingzHero() {
  const ref = useKingzHeroAnimation<HTMLElement>()
  const all = buildPlatformCtas()
  const primary = PRIMARY_CTAS.map((label) => all.find((c) => c.label === label)).filter(Boolean)
  const secondary = SECONDARY_CTAS.map((label) => all.find((c) => c.label === label)).filter(Boolean)

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
        fetchPriority="high"
        quality={75}
        sizes="100vw"
        className="object-cover"
        aria-hidden
      />
      <div className="absolute inset-0 bg-[#050505]/75" aria-hidden />
      <div
        className="absolute inset-0 bg-gradient-to-b from-[#5A2D91]/25 via-transparent to-[#6B0F1A]/35"
        aria-hidden
      />

      <div className="relative z-10 kingz-container px-4 sm:px-6 py-24 sm:py-28 md:py-32 text-center md:text-left md:pl-[8%]">
        <div data-hero-headline className="mb-6 sm:mb-8 flex justify-center md:justify-start">
          <KingzLogo size="hero" variant="full" priority />
        </div>

        <p
          data-hero-headline
          className="text-[#D4AF37] text-xs sm:text-sm uppercase tracking-[0.25em] sm:tracking-[0.3em] mb-3 sm:mb-4 font-medium"
        >
          Brantford&apos;s Premier DJ Experience
        </p>
        <h1
          id="hero-heading"
          data-hero-headline
          className="kingz-heading text-[1.75rem] leading-snug sm:text-4xl sm:leading-tight lg:text-6xl font-bold kingz-gold-gradient max-w-3xl mb-6 sm:mb-8"
          style={{ letterSpacing: '1px' }}
        >
          Premium DJ Experience in Brantford
        </h1>

        <div
          data-hero-banner
          className="kingz-pulse-banner inline-flex flex-wrap items-center justify-center md:justify-start gap-x-2 gap-y-1 px-4 py-2 sm:px-5 sm:py-3 mb-8 sm:mb-10 rounded-lg border border-[#D4AF37]/40 bg-[#050505]/80 text-sm text-[#f5d276] max-w-full"
        >
          <span className="w-full sm:w-auto">Catch us LIVE on</span>
          <a
            href={KINGZ_CONTACT.kick}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center min-h-11 px-1 font-semibold underline hover:text-[#f9e8b0] transition-colors touch-manipulation"
          >
            Kick.com/kingznqueenzent
          </a>
          <span className="hidden sm:inline" aria-hidden>
            ·
          </span>
          <a
            href={KINGZ_CONTACT.twitch}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center min-h-11 px-1 font-semibold underline hover:text-[#f9e8b0] transition-colors touch-manipulation"
          >
            Twitch.tv/kingznqueenzent
          </a>
        </div>

        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 sm:gap-6 mb-8 sm:mb-10">
          {TRUST_METRICS.map(({ value, label }) => (
            <div key={label} data-hero-metric className="text-center md:text-left min-w-[5.5rem]">
              <p className="text-[#D4AF37] text-lg sm:text-xl font-bold">{value}</p>
              <p className="text-[#b0b0b0] text-xs sm:text-sm">{label}</p>
            </div>
          ))}
        </div>

        {/* Primary mobile CTAs — full-width stack for easy taps */}
        <div
          data-hero-cta
          className="kingz-hero-cta-primary flex flex-col sm:flex-row flex-wrap gap-3 justify-center md:justify-start w-full max-w-md sm:max-w-3xl mx-auto md:mx-0"
        >
          {primary.map((cta) =>
            cta ? (
              <KingzCtaAction
                key={cta.label}
                {...cta}
                className="w-full sm:w-auto justify-center text-sm touch-manipulation"
              />
            ) : null
          )}
        </div>
        <div
          data-hero-cta
          className="mt-3 flex flex-col sm:flex-row flex-wrap gap-3 justify-center md:justify-start w-full max-w-md sm:max-w-3xl mx-auto md:mx-0"
        >
          {secondary.map((cta) =>
            cta ? (
              <KingzCtaAction
                key={cta.label}
                {...cta}
                className="w-full sm:w-auto justify-center text-sm touch-manipulation"
              />
            ) : null
          )}
        </div>
      </div>

      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 w-px h-16 bg-gradient-to-b from-[#D4AF37] via-[#5A2D91] to-transparent opacity-60"
        aria-hidden
      />
    </section>
  )
}
