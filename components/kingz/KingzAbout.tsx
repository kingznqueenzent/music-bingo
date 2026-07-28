'use client'

import Image from 'next/image'
import { useKingzReveal } from './useKingzGsap'

export function KingzAbout() {
  const ref = useKingzReveal<HTMLElement>()

  return (
    <section
      id="about"
      ref={ref}
      className="kingz-section kingz-art-deco-bg bg-[#1a1a1a]"
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
                has become Brantford&apos;s most sought-after premium DJ service. We don&apos;t just play music —
                we craft experiences that linger long after the last song.
              </p>
              <p>
                Founded by DJ Liz and DJ Merci, our duo brings complementary styles and decades of combined
                expertise. From intimate wedding ceremonies to corporate galas and high-energy livestreams,
                every event receives the royal treatment.
              </p>
              <p>
                Our Art Deco-inspired approach to entertainment mirrors our design philosophy: geometric precision,
                dramatic contrast, and luxury through restraint. When you book Kingz &amp; Queenz, you&apos;re
                investing in excellence.
              </p>
            </div>
          </div>

          <div className="flex-1 flex flex-col sm:flex-row gap-6 justify-center" data-kingz-reveal>
            <div className="relative w-48 h-48 sm:w-56 sm:h-56 mx-auto">
              <div className="absolute inset-0 border border-[#D4AF37]/50 rounded-xl rotate-3" aria-hidden />
              {/* Replace with Professional Photo of DJ Liz */}
              <Image
                src="/assets/images/dj-liz/dj-liz-profile.jpg"
                alt="DJ Liz performing at an event"
                width={224}
                height={224}
                className="relative rounded-xl object-cover w-full h-full shadow-2xl -rotate-2"
              />
            </div>
            <div className="relative w-48 h-48 sm:w-56 sm:h-56 mx-auto sm:mt-12">
              <div className="absolute inset-0 border border-[#D4AF37]/50 rounded-xl -rotate-3" aria-hidden />
              {/* Replace with Professional Photo of DJ Merci */}
              <Image
                src="/assets/images/dj-merci/dj-merci-profile.jpg"
                alt="DJ Merci at the decks"
                width={224}
                height={224}
                className="relative rounded-xl object-cover w-full h-full shadow-2xl rotate-2"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
