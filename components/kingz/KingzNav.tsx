'use client'

import { useEffect, useState, useCallback } from 'react'
import { Menu, X } from 'lucide-react'
import { NAV_LINKS } from '@/lib/kingz/data'
import { KingzLogo } from './KingzLogo'

export function KingzNav() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState('home')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const sections = NAV_LINKS.map((l) => document.getElementById(l.id)).filter(Boolean)
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id)
        }
      },
      { rootMargin: '-40% 0px -50% 0px' }
    )
    sections.forEach((s) => observer.observe(s!))
    return () => observer.disconnect()
  }, [])

  const scrollTo = useCallback((id: string) => {
    setOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-[#050505]/92 backdrop-blur-md shadow-lg shadow-[#5A2D91]/10' : 'bg-transparent'
      }`}
      role="banner"
    >
      <div className="kingz-deco-divider absolute bottom-0 left-0 right-0" aria-hidden />
      <nav
        className="kingz-container flex items-center justify-between px-6 py-3 md:py-4"
        aria-label="Main navigation"
      >
        <button
          type="button"
          onClick={() => scrollTo('home')}
          className="flex items-center group"
          aria-label="Kingz and Queenz Entertainment — Home"
        >
          {/* Official logo — replaces text/Crown placeholder */}
          <KingzLogo size="nav" variant="full" priority />
        </button>

        <ul className="hidden lg:flex items-center gap-8" role="list">
          {NAV_LINKS.map(({ id, label }) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => scrollTo(id)}
                className={`text-sm font-medium transition-colors duration-300 ${
                  active === id
                    ? 'text-[#D4AF37] underline underline-offset-8 decoration-[#D4AF37]'
                    : 'text-[#f5f5f5] hover:text-[#D4AF37]'
                }`}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          className="lg:hidden p-2 text-[#D4AF37]"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {open && (
        <div
          className="lg:hidden fixed inset-0 top-[72px] z-40 bg-[#050505]/98 backdrop-blur-lg flex flex-col items-center justify-center gap-6"
          role="dialog"
          aria-label="Mobile navigation"
        >
          {NAV_LINKS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => scrollTo(id)}
              className="text-xl kingz-heading text-[#f5f5f5] hover:text-[#D4AF37] transition-colors min-h-[44px]"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </header>
  )
}
