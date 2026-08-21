'use client'

import { useCallback, useEffect, useState } from 'react'

/** Mobile-only booking bar — hidden on md+ and while booking/contact is on screen. */
export function KingzStickyBookCta() {
  const [show, setShow] = useState(true)

  useEffect(() => {
    const booking = document.getElementById('booking')
    const contact = document.getElementById('contact')
    const targets = [booking, contact].filter((el): el is HTMLElement => Boolean(el))
    if (!targets.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        setShow(!entries.some((entry) => entry.isIntersecting))
      },
      { threshold: 0.15 }
    )
    targets.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const scrollToBooking = useCallback(() => {
    document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  if (!show) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-[9998] md:hidden pointer-events-none">
      <div
        className="pointer-events-auto border-t border-[#D4AF37]/35 bg-[#050505]/95 backdrop-blur-md px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_32px_rgba(0,0,0,0.45)]"
      >
        <button
          type="button"
          onClick={scrollToBooking}
          className="kingz-btn-gold w-full !max-w-none touch-manipulation"
        >
          Check Availability
        </button>
      </div>
    </div>
  )
}
