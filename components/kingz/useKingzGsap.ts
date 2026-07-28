'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

let registered = false

function ensureGsap() {
  if (!registered && typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger)
    registered = true
  }
}

export function useKingzReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null)

  useEffect(() => {
    ensureGsap()
    const el = ref.current
    if (!el) return

    const items = el.querySelectorAll('[data-kingz-reveal]')
    const targets = items.length > 0 ? items : [el]

    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: 'power2.out',
          stagger: 0.1,
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        }
      )
    }, el)

    return () => ctx.revert()
  }, [])

  return ref
}

export function useKingzHeroAnimation<T extends HTMLElement>() {
  const ref = useRef<T>(null)

  useEffect(() => {
    ensureGsap()
    const el = ref.current
    if (!el) return

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.from('[data-hero-headline]', { opacity: 0, y: 40, duration: 0.9 })
        .from('[data-hero-banner]', { opacity: 0, scale: 0.95, duration: 0.6 }, '-=0.4')
        .from('[data-hero-metric]', { opacity: 0, y: 20, duration: 0.5, stagger: 0.12 }, '-=0.3')
        .from('[data-hero-cta]', { opacity: 0, y: 20, duration: 0.5 }, '-=0.2')
    }, el)

    return () => ctx.revert()
  }, [])

  return ref
}
