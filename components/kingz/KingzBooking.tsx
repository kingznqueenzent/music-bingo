'use client'

import { useState, useMemo } from 'react'
import { BOOKING_AVAILABILITY } from '@/lib/kingz/data'
import { useKingzReveal } from './useKingzGsap'

function formatDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function isAvailable(date: Date) {
  const key = formatDateKey(date.getFullYear(), date.getMonth(), date.getDate())
  if (BOOKING_AVAILABILITY.blockedDates.includes(key)) return false
  if (!BOOKING_AVAILABILITY.availableDays.includes(date.getDay())) return false
  if (date < new Date(new Date().setHours(0, 0, 0, 0))) return false
  return true
}

export function KingzBooking() {
  const ref = useKingzReveal<HTMLElement>()
  const today = new Date()
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [selected, setSelected] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  const days = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1)
    const last = new Date(viewYear, viewMonth + 1, 0)
    const startPad = first.getDay()
    const cells: (Date | null)[] = Array(startPad).fill(null)
    for (let d = 1; d <= last.getDate(); d++) {
      cells.push(new Date(viewYear, viewMonth, d))
    }
    return cells
  }, [viewMonth, viewYear])

  const monthLabel = new Date(viewYear, viewMonth).toLocaleString('en-CA', {
    month: 'long',
    year: 'numeric',
  })

  const handleSelect = (date: Date) => {
    if (!isAvailable(date)) return
    const key = formatDateKey(date.getFullYear(), date.getMonth(), date.getDate())
    setSelected(key)
    setShowModal(true)
  }

  const confirmBooking = () => {
    setShowModal(false)
    if (selected) {
      sessionStorage.setItem('kingz-prefill-date', selected)
    }
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section id="booking" ref={ref} className="kingz-section bg-[#1a1a1a]" aria-labelledby="booking-heading">
      <div className="kingz-container max-w-lg mx-auto">
        <div className="text-center mb-10" data-kingz-reveal>
          <div className="kingz-deco-bar mx-auto mb-6" aria-hidden />
          <h2 id="booking-heading" className="kingz-heading text-3xl font-semibold text-[#D4AF37] mb-3">
            Check Availability
          </h2>
          <p className="text-[#b0b0b0] text-sm">Wed–Sun available · Select a date to begin booking</p>
        </div>

        <div data-kingz-reveal className="kingz-card p-6">
          <div className="flex items-center justify-between mb-6">
            <button
              type="button"
              onClick={() => {
                if (viewMonth === 0) {
                  setViewMonth(11)
                  setViewYear((y) => y - 1)
                } else setViewMonth((m) => m - 1)
              }}
              className="text-[#D4AF37] px-3 py-2 min-h-[44px] hover:bg-[#D4AF37]/10 rounded transition-colors"
              aria-label="Previous month"
            >
              ‹
            </button>
            <span className="kingz-heading text-lg text-[#f5f5f5]">{monthLabel}</span>
            <button
              type="button"
              onClick={() => {
                if (viewMonth === 11) {
                  setViewMonth(0)
                  setViewYear((y) => y + 1)
                } else setViewMonth((m) => m + 1)
              }}
              className="text-[#D4AF37] px-3 py-2 min-h-[44px] hover:bg-[#D4AF37]/10 rounded transition-colors"
              aria-label="Next month"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs text-[#b0b0b0] mb-2" aria-hidden>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1" role="grid" aria-label="Calendar">
            {days.map((date, i) => {
              if (!date) return <div key={`empty-${i}`} />
              const key = formatDateKey(date.getFullYear(), date.getMonth(), date.getDate())
              const available = isAvailable(date)
              const isSelected = selected === key
              return (
                <button
                  key={key}
                  type="button"
                  disabled={!available}
                  onClick={() => handleSelect(date)}
                  className={`aspect-square rounded-lg text-sm transition-all duration-200 min-h-[44px] ${
                    isSelected
                      ? 'bg-[#D4AF37] text-[#050505] shadow-[0_0_20px_rgba(245,210,118,0.4)] font-bold'
                      : available
                        ? 'text-[#f5d276] hover:bg-[#D4AF37]/20'
                        : 'text-[#555] cursor-not-allowed'
                  }`}
                  aria-label={`${date.toLocaleDateString('en-CA')} ${available ? 'available' : 'unavailable'}`}
                  aria-pressed={isSelected}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050505]/80 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal
          aria-labelledby="booking-modal-title"
        >
          <div className="kingz-card p-8 max-w-md w-full text-center animate-[kingz-fade-in_0.4s_ease-out]">
            <h3 id="booking-modal-title" className="kingz-heading text-2xl text-[#D4AF37] mb-4">
              Date Selected!
            </h3>
            <p className="text-[#d4d4d4] mb-8">
              {selected && new Date(selected + 'T12:00:00').toLocaleDateString('en-CA', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              <br />
              <span className="text-[#b0b0b0] text-sm mt-2 block">Proceed to the booking form?</span>
            </p>
            <div className="flex gap-4 justify-center">
              <button type="button" className="kingz-btn-gold" onClick={confirmBooking}>
                Confirm
              </button>
              <button type="button" className="kingz-btn-outline" onClick={() => setShowModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
