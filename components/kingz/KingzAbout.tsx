'use client'

import { KingzDjPlaceholder } from './KingzDjPlaceholder'
import { useKingzReveal } from './useKingzGsap'

export function KingzAbout() {
  const ref = useKingzReveal<HTMLElement>()

  return (
    <section
      id="about"
      ref={ref}
      className="kingz-section kingz-art-deco-bg bg-[#0f0a12]"
      aria-labelledby="about-heading"
    >
      <div className="kingz-container">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 items-center">
          <div className="flex-1 lg:pr-8" data-kingz-reveal>
            <div className="kingz-deco-bar mb-6" aria-hidden />
            <h2 id="about-heading" className="kingz-heading text-3xl lg:text-4xl font-semibold text-[#D4AF37] mb-6">
              About Kingz &amp; Queenz
            </h2>
            <div className="space-y-4 text-[#d4d4d4] leading-relaxed">
              <p>
                Born from a shared passion for music and unforgettable nights, Kingz &amp; Queenz Entertainment
                is a Brantford-based DJ duo delivering premium experiences for weddings, corporate events,
                parties, and livestreams.
              </p>
              <p>
                Founded by DJ Liz and DJ Merci, our duo brings complementary styles and professional excellence
                to celebrations across Southern Ontario. Every event receives the royal treatment.
              </p>
            </div>
          </div>

          <div className="flex-1 flex flex-col sm:flex-row gap-6 justify-center" data-kingz-reveal>
            <div className="relative w-48 h-48 sm:w-56 sm:h-56 mx-auto">
              <div className="absolute inset-0 border border-[#D4AF37]/50 rounded-xl rotate-3" aria-hidden />
              {/* Replace with real professional DJ Liz photograph */}
              <div className="relative w-full h-full -rotate-2 shadow-2xl">
                <KingzDjPlaceholder name="DJ Liz" shape="rect" className="h-full" />
              </div>
            </div>
            <div className="relative w-48 h-48 sm:w-56 sm:h-56 mx-auto sm:mt-12">
              <div className="absolute inset-0 border border-[#D4AF37]/50 rounded-xl -rotate-3" aria-hidden />
              {/* Replace with real professional DJ Merci photograph */}
              <div className="relative w-full h-full rotate-2 shadow-2xl">
                <KingzDjPlaceholder name="DJ Merci" shape="rect" className="h-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
