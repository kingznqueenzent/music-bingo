'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react'
import { TESTIMONIALS } from '@/lib/kingz/data'
import { useKingzReveal } from './useKingzGsap'

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5 justify-center" aria-label={`${count} out of 5 stars`}>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="text-[#D4AF37]" aria-hidden>
          ★
        </span>
      ))}
    </div>
  )
}

export function KingzTestimonials() {
  const ref = useKingzReveal<HTMLElement>()
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  const goTo = useCallback((next: number) => {
    setVisible(false)
    setTimeout(() => {
      setIndex((next + TESTIMONIALS.length) % TESTIMONIALS.length)
      setVisible(true)
    }, 400)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => goTo(index + 1), 5000)
    return () => clearInterval(timer)
  }, [index, goTo])

  const t = TESTIMONIALS[index]

  return (
    <section
      id="testimonials"
      ref={ref}
      className="kingz-section bg-[#1a1a1a] kingz-art-deco-bg"
      aria-labelledby="testimonials-heading"
    >
      <div className="kingz-container text-center mb-12">
        <div className="kingz-deco-bar mx-auto mb-6" aria-hidden />
        <h2 id="testimonials-heading" className="kingz-heading text-3xl lg:text-4xl font-semibold text-[#D4AF37]">
          Client Testimonials
        </h2>
      </div>

      <div className="kingz-container max-w-3xl mx-auto" data-kingz-reveal>
        <blockquote
          className={`kingz-card p-10 md:p-14 text-center transition-opacity duration-700 ${
            visible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <Quote className="h-12 w-12 text-[#D4AF37]/40 mx-auto mb-6" aria-hidden />
          <p className="text-lg md:text-xl italic text-[#f5f5f5] leading-relaxed mb-8">
            &ldquo;{t.quote}&rdquo;
          </p>
          <Stars count={t.rating} />
          <footer className="mt-6">
            <cite className="kingz-heading text-[#D4AF37] not-italic font-semibold">{t.name}</cite>
            <p className="text-[#b0b0b0] text-sm mt-1">{t.event}</p>
          </footer>
        </blockquote>

        <div className="flex justify-center items-center gap-4 mt-8">
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            className="p-2 text-[#D4AF37] hover:scale-110 transition-transform min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="flex gap-2" role="tablist" aria-label="Testimonials">
            {TESTIMONIALS.map((item, i) => (
              <button
                key={item.name}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Testimonial from ${item.name}`}
                onClick={() => goTo(i)}
                className={`h-2 rounded-full transition-all ${
                  i === index ? 'w-6 bg-[#D4AF37]' : 'w-2 bg-[#D4AF37]/30'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            className="p-2 text-[#D4AF37] hover:scale-110 transition-transform min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Next testimonial"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      </div>
    </section>
  )
}
