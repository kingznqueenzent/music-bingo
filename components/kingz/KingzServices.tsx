'use client'

import { SERVICES } from '@/lib/kingz/data'
import { useKingzReveal } from './useKingzGsap'

export function KingzServices() {
  const ref = useKingzReveal<HTMLElement>()

  return (
    <section id="services" ref={ref} className="kingz-section" aria-labelledby="services-heading">
      <div className="kingz-container text-center mb-14">
        <div className="kingz-deco-bar mx-auto mb-6" aria-hidden />
        <h2 id="services-heading" className="kingz-heading text-3xl lg:text-4xl font-semibold text-[#D4AF37] mb-4">
          Our Services
        </h2>
        <div className="kingz-deco-divider max-w-xs mx-auto" aria-hidden />
        <p className="mt-6 text-[#b0b0b0] max-w-2xl mx-auto">
          Tailored entertainment for every occasion — from Brantford weddings to corporate events across
          Southern Ontario, delivered with Vegas-level production and Apple-level polish.
        </p>
      </div>

      <div className="kingz-container grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        {SERVICES.map((service, i) => (
          <article
            key={service.title}
            data-kingz-reveal
            className={`kingz-card p-6 sm:p-8 text-left group ${i % 2 === 1 ? 'md:translate-y-3' : ''}`}
          >
            <span className="text-4xl block mb-4 group-hover:scale-110 transition-transform duration-300" aria-hidden>
              {service.icon}
            </span>
            <h3 className="kingz-heading text-xl text-[#f5f5f5] mb-3">{service.title}</h3>
            <p className="text-[#b0b0b0] text-sm leading-relaxed">{service.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
