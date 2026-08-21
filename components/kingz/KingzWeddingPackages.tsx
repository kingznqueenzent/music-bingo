'use client'

import { SERVICE_AREA } from '@/lib/kingz/service-area'
import {
  WEDDING_PACKAGES,
  WEDDING_PACKAGES_SECTION_TITLE,
  CUSTOM_EVENT_NOTE,
  prefillWeddingPackage,
  prefillCustomEventQuote,
  type WeddingPackage,
} from '@/lib/kingz/wedding-packages'
import { useKingzReveal } from './useKingzGsap'

function PackageCard({ pkg }: { pkg: WeddingPackage }) {
  const featured = pkg.featured

  return (
    <article
      data-kingz-reveal
      className={`relative flex flex-col rounded-2xl p-6 sm:p-8 transition-all duration-300 ${
        featured
          ? 'bg-gradient-to-b from-[#1a1028]/95 via-[#0c0c0c]/98 to-[#050505] border-2 border-[#D4AF37]/55 shadow-[0_0_40px_rgba(212,175,55,0.18),0_0_80px_rgba(90,45,145,0.12)] lg:-translate-y-3 lg:scale-[1.03] z-10'
          : 'kingz-card bg-[#0c0c0c]/90 border border-[rgba(212,175,55,0.22)]'
      }`}
      aria-labelledby={`wedding-pkg-${pkg.id}`}
    >
      {pkg.badge ? (
        <span
          className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-sm bg-gradient-to-r from-[#5A2D91] via-[#D4AF37] to-[#5A2D91] px-3 py-1 text-[10px] sm:text-xs font-bold tracking-[0.14em] text-[#050505] shadow-[0_0_20px_rgba(212,175,55,0.35)]"
          aria-label={pkg.badge}
        >
          {pkg.badge}
        </span>
      ) : null}

      <div className={`text-center ${pkg.badge ? 'mt-3 sm:mt-2' : ''}`}>
        <h3
          id={`wedding-pkg-${pkg.id}`}
          className="kingz-heading text-xl sm:text-2xl text-[#f5d276] mb-2"
        >
          {pkg.name}
        </h3>
        <p
          className={`kingz-heading font-semibold tracking-tight text-[#D4AF37] mb-2 ${
            featured ? 'text-4xl sm:text-5xl' : 'text-3xl sm:text-4xl'
          }`}
        >
          {pkg.priceLabel}
        </p>
        <p className="text-[#b0b0b0] text-sm mb-6">{pkg.subtitle}</p>
      </div>

      <ul className="flex-1 space-y-3 mb-8 text-left" role="list">
        {pkg.features.map((feature) => (
          <li key={feature} className="flex gap-3 text-sm text-[#d4d4d4] leading-snug">
            <span
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.6)]"
              aria-hidden
            />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className={`w-full min-h-12 touch-manipulation ${
          featured ? 'kingz-btn-gold' : 'kingz-btn-outline'
        }`}
        onClick={() => prefillWeddingPackage(pkg)}
      >
        {pkg.ctaLabel}
      </button>
    </article>
  )
}

export function KingzWeddingPackages() {
  const ref = useKingzReveal<HTMLElement>()

  return (
    <section
      id="packages"
      ref={ref}
      className="kingz-section relative overflow-hidden"
      aria-labelledby="wedding-packages-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(90,45,145,0.22), transparent 70%), radial-gradient(ellipse 40% 30% at 80% 60%, rgba(212,175,55,0.08), transparent 65%)',
        }}
      />

      <div className="kingz-container relative z-[1]">
        <div className="text-center mb-12 sm:mb-14">
          <div className="kingz-deco-bar mx-auto mb-6" aria-hidden />
          <h2
            id="wedding-packages-heading"
            className="kingz-heading text-3xl lg:text-4xl font-semibold text-[#D4AF37] mb-4"
          >
            {WEDDING_PACKAGES_SECTION_TITLE}
          </h2>
          <div className="kingz-deco-divider max-w-xs mx-auto" aria-hidden />
          <p className="mt-6 text-[#b0b0b0] max-w-2xl mx-auto text-sm sm:text-base">
            Confirmed wedding entertainment packages — select a package to begin your booking inquiry.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-6 xl:gap-8 items-stretch max-w-6xl mx-auto">
          {WEDDING_PACKAGES.map((pkg) => (
            <PackageCard key={pkg.id} pkg={pkg} />
          ))}
        </div>

        {/* Custom packages note — premium extension, not a pricing tier */}
        <div
          data-kingz-reveal
          className="mt-10 sm:mt-12 max-w-3xl mx-auto rounded-xl border border-[rgba(212,175,55,0.28)] bg-[rgba(12,12,12,0.72)] backdrop-blur-md px-6 py-7 sm:px-8 sm:py-8 text-center shadow-[inset_0_1px_0_rgba(212,175,55,0.12),0_0_32px_rgba(90,45,145,0.1)]"
        >
          <div
            className="mx-auto mb-5 h-px w-16 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent"
            aria-hidden
          />
          <p className="text-[#d4d4d4] text-sm sm:text-base leading-relaxed mb-4">
            {CUSTOM_EVENT_NOTE}
          </p>
          <p className="text-[#b0b0b0] text-xs sm:text-sm leading-relaxed mb-6">
            {SERVICE_AREA.travelDiscussNote}
          </p>
          <button
            type="button"
            className="kingz-btn-outline w-full sm:w-auto min-h-12 touch-manipulation tracking-[0.08em] text-xs sm:text-sm"
            onClick={() => prefillCustomEventQuote()}
          >
            REQUEST A CUSTOM QUOTE
          </button>
        </div>
      </div>
    </section>
  )
}
