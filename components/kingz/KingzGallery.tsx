'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { GALLERY_IMAGES } from '@/lib/kingz/data'
import { useKingzReveal } from './useKingzGsap'

export function KingzGallery() {
  const ref = useKingzReveal<HTMLElement>()
  const [index, setIndex] = useState(0)
  const [fading, setFading] = useState(false)

  const goTo = useCallback((next: number) => {
    setFading(true)
    setTimeout(() => {
      setIndex((next + GALLERY_IMAGES.length) % GALLERY_IMAGES.length)
      setFading(false)
    }, 250)
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }
    const timer = setInterval(() => goTo(index + 1), 6000)
    return () => clearInterval(timer)
  }, [index, goTo])

  const current = GALLERY_IMAGES[index]

  return (
    <section
      id="gallery"
      ref={ref}
      className="kingz-section bg-[#1a1a1a]"
      aria-labelledby="gallery-heading"
      aria-roledescription="carousel"
    >
      <div className="kingz-container">
        <div className="text-center mb-12" data-kingz-reveal>
          <div className="kingz-deco-bar mx-auto mb-6" aria-hidden />
          <h2 id="gallery-heading" className="kingz-heading text-3xl lg:text-4xl font-semibold text-[#D4AF37]">
            Event Gallery
          </h2>
        </div>

        <div className="relative max-w-5xl mx-auto" data-kingz-reveal>
          <div
            className={`relative aspect-video rounded-xl overflow-hidden border border-[rgba(245,210,118,0.2)] transition-opacity duration-500 ${
              fading ? 'opacity-0' : 'opacity-100'
            }`}
          >
            {/* Replace with Professional Event Photo — files under /assets/images/events/ */}
            <Image
              src={current.src}
              alt={current.alt}
              fill
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="object-cover"
              loading="lazy"
              quality={70}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505]/80 via-transparent to-transparent" />
            <p className="absolute bottom-6 left-6 kingz-heading text-xl text-[#f5d276]">{current.caption}</p>
          </div>

          <button
            type="button"
            onClick={() => goTo(index - 1)}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-[#050505]/80 border border-[#D4AF37]/40 text-[#D4AF37] hover:shadow-[0_0_20px_rgba(245,210,118,0.3)] transition-shadow min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-[#050505]/80 border border-[#D4AF37]/40 text-[#D4AF37] hover:shadow-[0_0_20px_rgba(245,210,118,0.3)] transition-shadow min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Next image"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="flex justify-center gap-1 mt-6" role="tablist" aria-label="Gallery slides">
            {GALLERY_IMAGES.map((img, i) => (
              <button
                key={img.caption}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Slide ${i + 1}: ${img.caption}`}
                onClick={() => goTo(i)}
                className="kingz-gallery-dot"
              >
                <span
                  className={`kingz-gallery-dot__pip ${
                    i === index ? 'w-8 bg-[#D4AF37]' : 'w-2.5 bg-[#D4AF37]/30'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
