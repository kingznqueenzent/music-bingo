'use client'

import { SERVICE_AREA } from '@/lib/kingz/service-area'
import { useKingzReveal } from './useKingzGsap'

export function KingzServiceArea() {
  const ref = useKingzReveal<HTMLElement>()

  return (
    <section
      id="service-area"
      ref={ref}
      className="kingz-section relative overflow-hidden bg-[#0a0710]"
      aria-labelledby="service-area-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 55% 45% at 20% 20%, rgba(90,45,145,0.2), transparent 70%), radial-gradient(ellipse 40% 35% at 85% 75%, rgba(212,175,55,0.08), transparent 65%)',
        }}
      />

      <div className="kingz-container relative z-[1] max-w-4xl mx-auto text-center">
        <div className="kingz-deco-bar mx-auto mb-6" aria-hidden />
        <h2
          id="service-area-heading"
          className="kingz-heading text-2xl sm:text-3xl lg:text-4xl font-semibold text-[#D4AF37] mb-4 tracking-[0.06em] sm:tracking-[0.1em]"
        >
          {SERVICE_AREA.sectionHeading}
        </h2>
        <div className="kingz-deco-divider max-w-xs mx-auto" aria-hidden />
        <p className="mt-6 text-[#d4d4d4] text-sm sm:text-base leading-relaxed max-w-3xl mx-auto">
          {SERVICE_AREA.sectionCopy}
        </p>
        <p className="mt-5 text-[#b0b0b0] text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
          {SERVICE_AREA.travelInquiryCopy}
        </p>

        <ul
          className="mt-8 flex flex-wrap justify-center gap-2 sm:gap-2.5"
          aria-label={`DJ service areas in ${SERVICE_AREA.regionLabel}`}
        >
          {SERVICE_AREA.cities.map((city) => (
            <li
              key={city}
              className="rounded-full border border-[rgba(212,175,55,0.28)] bg-[#050505]/60 px-3 py-1.5 text-[11px] sm:text-xs tracking-[0.06em] text-[#f5d276]"
            >
              {city}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
