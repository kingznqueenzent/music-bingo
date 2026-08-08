'use client'

import { useEffect, useState, useCallback } from 'react'
import { Menu, X } from 'lucide-react'
import { NAV_LINKS } from '@/lib/kingz/data'
import { KingzLogo } from './KingzLogo'
import { StaffHeaderActions } from '@/components/layout/StaffHeaderActions'
import { ResponsiveMenu } from '@/components/ui/menu/ResponsiveMenu'

export function KingzNav() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState('home')

  const closeMenu = useCallback(() => {
    setOpen(false)
    document.querySelectorAll('[data-lyric-menu="open"]').forEach((el) => el.remove())
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) closeMenu()
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [closeMenu])

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

  const scrollTo = useCallback(
    (id: string) => {
      closeMenu()
      window.requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
      })
    },
    [closeMenu]
  )

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-[10000] transition-all duration-300 ${
        scrolled ? 'bg-[#050505]/92 backdrop-blur-md shadow-lg shadow-[#5A2D91]/10' : 'bg-transparent'
      }`}
      role="banner"
    >
      <div className="kingz-deco-divider absolute bottom-0 left-0 right-0" aria-hidden />
      <nav
        className="kingz-container flex items-center justify-between gap-3 px-4 sm:px-6 py-3 md:py-4"
        aria-label="Main navigation"
      >
        <button
          type="button"
          onClick={() => scrollTo('home')}
          className="flex items-center group min-h-12"
          aria-label="Kingz and Queenz Entertainment — Home"
        >
          <KingzLogo size="nav" variant="full" priority />
        </button>

        <div className="hidden lg:flex items-center gap-6">
          <ul className="flex items-center gap-8" role="list">
            {NAV_LINKS.map(({ id, label }) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => scrollTo(id)}
                  className={`text-sm font-medium transition-colors duration-300 min-h-12 px-1 ${
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
          <StaffHeaderActions
            loginFrom="/host"
            loginClassName="text-sm text-[#f5f5f5]/55 hover:text-[#D4AF37]/90 transition-colors whitespace-nowrap min-h-12 inline-flex items-center"
            menuButtonClassName="inline-flex items-center justify-center gap-2 min-h-12 h-12 px-4 rounded-xl border border-[#D4AF37]/35 bg-[#D4AF37]/5 text-[#D4AF37] hover:border-[#D4AF37]/70 hover:bg-[#D4AF37]/10 active:bg-[#D4AF37]/15 transition-colors touch-manipulation shadow-sm"
          />
        </div>

        <div className="lg:hidden flex items-center gap-2 shrink-0">
          <StaffHeaderActions
            loginFrom="/host"
            showAdminLabel={false}
            loginClassName="text-xs text-[#f5f5f5]/50 hover:text-[#D4AF37]/90 transition-colors min-h-12 inline-flex items-center"
            menuButtonClassName="inline-flex items-center justify-center min-h-12 min-w-12 rounded-xl border border-[#D4AF37]/35 bg-[#D4AF37]/5 text-[#D4AF37] hover:border-[#D4AF37]/70 transition-colors touch-manipulation"
          />
          <button
            type="button"
            className="inline-flex items-center justify-center min-h-12 min-w-12 rounded-xl text-[#D4AF37] border border-transparent hover:border-[#D4AF37]/25 active:bg-[#D4AF37]/10 touch-manipulation"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      <ResponsiveMenu
        open={open}
        onClose={closeMenu}
        title="Menu"
        description="Kingz & Queenz"
        forceSheet
      >
        <ul className="flex flex-col gap-1 py-1" role="list">
          {NAV_LINKS.map(({ id, label }) => {
            const isActive = active === id
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => scrollTo(id)}
                  className={`flex w-full items-center px-4 py-3 min-h-12 rounded-xl text-lg font-medium touch-manipulation transition-colors border ${
                    isActive
                      ? 'text-[#D4AF37] bg-[#D4AF37]/10 border-[#D4AF37]/30'
                      : 'text-[#f5f5f5] border-transparent hover:bg-white/5 active:bg-white/10'
                  }`}
                >
                  {label}
                </button>
              </li>
            )
          })}
        </ul>
      </ResponsiveMenu>
    </header>
  )
}
