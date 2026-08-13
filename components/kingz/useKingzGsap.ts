'use client'

import { useEffect, useRef } from 'react'

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Scroll reveal — skipped when prefers-reduced-motion.
 * GSAP is loaded on demand to keep the initial JS bundle smaller.
 * Elements stay visible by default (no opacity:0 flash before hydration).
 */
export function useKingzReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion()) return

    let ctx: { revert: () => void } | undefined
    let cancelled = false

    ;(async () => {
      const gsapMod = await import('gsap')
      const { ScrollTrigger } = await import('gsap/ScrollTrigger')
      if (cancelled) return
      const gsap = gsapMod.default
      gsap.registerPlugin(ScrollTrigger)

      const items = el.querySelectorAll('[data-kingz-reveal]')
      const targets = items.length > 0 ? Array.from(items) : [el]

      ctx = gsap.context(() => {
        gsap.fromTo(
          targets,
          { opacity: 0.92, y: 18 },
          {
            opacity: 1,
            y: 0,
            duration: 0.55,
            ease: 'power2.out',
            stagger: 0.08,
            clearProps: 'transform',
            scrollTrigger: {
              trigger: el,
              start: 'top 88%',
              toggleActions: 'play none none none',
            },
          }
        )
      }, el)
    })()

    return () => {
      cancelled = true
      ctx?.revert()
    }
  }, [])

  return ref
}

/**
 * Hero entrance — does NOT fade the LCP crest / headline from invisible.
 * Banner, metrics, and CTAs get a light motion treatment only.
 */
export function useKingzHeroAnimation<T extends HTMLElement>() {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion()) return

    let ctx: { revert: () => void } | undefined
    let cancelled = false

    ;(async () => {
      const gsapMod = await import('gsap')
      if (cancelled) return
      const gsap = gsapMod.default

      ctx = gsap.context(() => {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
        // Keep crest + headline visible for LCP; only enhance secondary chrome
        tl.from('[data-hero-banner]', { opacity: 0.6, y: 12, duration: 0.5 }, 0.15)
          .from('[data-hero-metric]', { opacity: 0.6, y: 10, duration: 0.4, stagger: 0.08 }, 0.25)
          .from('[data-hero-cta]', { opacity: 0.6, y: 10, duration: 0.4, stagger: 0.06 }, 0.35)
      }, el)
    })()

    return () => {
      cancelled = true
      ctx?.revert()
    }
  }, [])

  return ref
}
