'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { KINGZ_CONTACT } from '@/lib/kingz/data'
import {
  CUSTOM_EVENT_PREFILL,
  KINGZ_PREFILL_DATE_KEY,
  KINGZ_PREFILL_EVENT,
  KINGZ_PREFILL_EVENT_TYPE_KEY,
  KINGZ_PREFILL_MESSAGE_KEY,
  KINGZ_PREFILL_PACKAGE_KEY,
} from '@/lib/kingz/wedding-packages'
import { useKingzReveal } from './useKingzGsap'

type FormState = {
  name: string
  email: string
  phone: string
  message: string
  preferredDate: string
  eventType: string
  selectedPackage: string
}

const EVENT_TYPES = [
  'Wedding',
  'Corporate',
  'Private party',
  'Livestream',
  CUSTOM_EVENT_PREFILL,
  'Other',
] as const

const initial: FormState = {
  name: '',
  email: '',
  phone: '',
  message: '',
  preferredDate: '',
  eventType: '',
  selectedPackage: '',
}

export function KingzContact() {
  const ref = useKingzReveal<HTMLElement>()
  const [form, setForm] = useState<FormState>(initial)
  const [errors, setErrors] = useState<Partial<FormState>>({})
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [statusMsg, setStatusMsg] = useState('')

  useEffect(() => {
    const applyPrefill = () => {
      const prefill = sessionStorage.getItem(KINGZ_PREFILL_MESSAGE_KEY)
      const date = sessionStorage.getItem(KINGZ_PREFILL_DATE_KEY)
      const eventType = sessionStorage.getItem(KINGZ_PREFILL_EVENT_TYPE_KEY)
      const selectedPackage = sessionStorage.getItem(KINGZ_PREFILL_PACKAGE_KEY)

      if (!prefill && !date && !eventType && !selectedPackage) return

      setForm((f) => ({
        ...f,
        ...(prefill ? { message: prefill } : {}),
        ...(date ? { preferredDate: date } : {}),
        ...(eventType ? { eventType } : {}),
        ...(selectedPackage
          ? { selectedPackage }
          : eventType === CUSTOM_EVENT_PREFILL
            ? { selectedPackage: '' }
            : {}),
      }))

      if (prefill) sessionStorage.removeItem(KINGZ_PREFILL_MESSAGE_KEY)
      if (date) sessionStorage.removeItem(KINGZ_PREFILL_DATE_KEY)
      if (eventType) sessionStorage.removeItem(KINGZ_PREFILL_EVENT_TYPE_KEY)
      if (selectedPackage) sessionStorage.removeItem(KINGZ_PREFILL_PACKAGE_KEY)
    }

    applyPrefill()
    window.addEventListener(KINGZ_PREFILL_EVENT, applyPrefill)
    return () => window.removeEventListener(KINGZ_PREFILL_EVENT, applyPrefill)
  }, [])

  const validate = () => {
    const next: Partial<FormState> = {}
    if (!form.name.trim()) next.name = 'Name is required'
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Valid email required'
    if (!form.phone.trim()) next.phone = 'Phone is required'
    if (!form.message.trim()) next.message = 'Message is required'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setStatus('loading')
    try {
      const packageLine = form.selectedPackage.trim()
      const messageWithPackage =
        packageLine && !form.message.includes(packageLine)
          ? `${form.message.trim()}\n\nSelected package: ${packageLine}`
          : form.message

      const res = await fetch('/api/kingz-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          message: messageWithPackage,
          preferredDate: form.preferredDate,
          eventType: form.eventType,
        }),
      })
      const data = (await res.json()) as { ok?: boolean; emailed?: boolean; error?: string }
      if (!res.ok || !data.ok || data.emailed === false) {
        throw new Error(data.error ?? 'Failed to send')
      }
      setStatus('success')
      setStatusMsg('Thank you! We will be in touch within 24 hours.')
      setForm(initial)
    } catch (err) {
      setStatus('error')
      setStatusMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

  return (
    <section id="contact" ref={ref} className="kingz-section" aria-labelledby="contact-heading">
      <div className="kingz-container">
        <div className="text-center mb-12">
          <div className="kingz-deco-bar mx-auto mb-6" aria-hidden />
          <h2 id="contact-heading" className="kingz-heading text-3xl lg:text-4xl font-semibold text-[#D4AF37]">
            Check Availability
          </h2>
          <p className="text-[#b0b0b0] mt-4 max-w-xl mx-auto text-sm">
            Tell us your date and event details. We will confirm whether we are available and follow up about booking.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 max-w-5xl mx-auto">
          <form
            data-kingz-reveal
            onSubmit={onSubmit}
            className="kingz-card p-8 space-y-5"
            noValidate
            aria-label="Availability and booking request"
          >
            <div>
              <label htmlFor="kingz-name" className="kingz-heading block text-[#D4AF37] text-sm mb-2">
                Name <span className="text-[#ef4444]">*</span>
              </label>
              <input
                id="kingz-name"
                className={`kingz-input ${errors.name ? 'kingz-input-error' : ''}`}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                autoComplete="name"
                required
              />
              {errors.name && <p className="text-[#ef4444] text-xs mt-1" role="alert">{errors.name}</p>}
            </div>
            <div>
              <label htmlFor="kingz-email" className="kingz-heading block text-[#D4AF37] text-sm mb-2">
                Email <span className="text-[#ef4444]">*</span>
              </label>
              <input
                id="kingz-email"
                type="email"
                className={`kingz-input ${errors.email ? 'kingz-input-error' : ''}`}
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                autoComplete="email"
                required
              />
              {errors.email && <p className="text-[#ef4444] text-xs mt-1" role="alert">{errors.email}</p>}
            </div>
            <div>
              <label htmlFor="kingz-phone" className="kingz-heading block text-[#D4AF37] text-sm mb-2">
                Phone <span className="text-[#ef4444]">*</span>
              </label>
              <input
                id="kingz-phone"
                type="tel"
                className={`kingz-input ${errors.phone ? 'kingz-input-error' : ''}`}
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                autoComplete="tel"
                required
              />
              {errors.phone && <p className="text-[#ef4444] text-xs mt-1" role="alert">{errors.phone}</p>}
            </div>
            <div>
              <label htmlFor="kingz-preferred-date" className="kingz-heading block text-[#D4AF37] text-sm mb-2">
                Event date
              </label>
              <input
                id="kingz-preferred-date"
                type="date"
                className="kingz-input"
                value={form.preferredDate}
                onChange={(e) => setForm((f) => ({ ...f, preferredDate: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="kingz-event-type" className="kingz-heading block text-[#D4AF37] text-sm mb-2">
                Event type
              </label>
              <select
                id="kingz-event-type"
                className="kingz-input"
                value={form.eventType}
                onChange={(e) => setForm((f) => ({ ...f, eventType: e.target.value }))}
              >
                <option value="">Select an event type</option>
                {EVENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            {form.selectedPackage ? (
              <div>
                <label htmlFor="kingz-selected-package" className="kingz-heading block text-[#D4AF37] text-sm mb-2">
                  Selected package
                </label>
                <input
                  id="kingz-selected-package"
                  className="kingz-input"
                  value={form.selectedPackage}
                  readOnly
                  aria-readonly="true"
                />
              </div>
            ) : null}
            <div>
              <label htmlFor="kingz-message" className="kingz-heading block text-[#D4AF37] text-sm mb-2">
                Message <span className="text-[#ef4444]">*</span>
              </label>
              <textarea
                id="kingz-message"
                rows={4}
                className={`kingz-input resize-y ${errors.message ? 'kingz-input-error' : ''}`}
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                required
              />
              {errors.message && <p className="text-[#ef4444] text-xs mt-1" role="alert">{errors.message}</p>}
            </div>

            <button type="submit" className="kingz-btn-gold w-full" disabled={status === 'loading'}>
              {status === 'loading' ? 'Sending…' : 'Request Booking'}
            </button>

            {status === 'success' && (
              <p className="text-[#4ade80] text-center text-sm" role="status">{statusMsg}</p>
            )}
            {status === 'error' && (
              <p className="text-[#ef4444] text-center text-sm" role="alert">{statusMsg}</p>
            )}
          </form>

          <div data-kingz-reveal className="space-y-8">
            <div className="kingz-card p-8">
              <h3 className="kingz-heading text-xl text-[#D4AF37] mb-6">Contact Info</h3>
              <ul className="space-y-4 text-[#d4d4d4]">
                {KINGZ_CONTACT.phone && KINGZ_CONTACT.phoneHref ? (
                  <li>
                    <span className="text-[#b0b0b0] text-sm block">Phone</span>
                    <a href={KINGZ_CONTACT.phoneHref} className="text-[#f5d276] hover:text-[#D4AF37] transition-colors">
                      {KINGZ_CONTACT.phone}
                    </a>
                  </li>
                ) : null}
                {KINGZ_CONTACT.email ? (
                  <li>
                    <span className="text-[#b0b0b0] text-sm block">Email</span>
                    <a
                      href={`mailto:${KINGZ_CONTACT.email}`}
                      className="text-[#f5d276] hover:text-[#D4AF37] transition-colors break-all"
                    >
                      {KINGZ_CONTACT.email}
                    </a>
                  </li>
                ) : null}
                {KINGZ_CONTACT.location ? (
                  <li>
                    <span className="text-[#b0b0b0] text-sm block">Location</span>
                    <span>{KINGZ_CONTACT.location}</span>
                  </li>
                ) : null}
                {!KINGZ_CONTACT.phone && !KINGZ_CONTACT.email ? (
                  <li className="text-[#b0b0b0] text-sm">
                    Use the booking form — contact details will be published here when available.
                  </li>
                ) : null}
              </ul>
            </div>

            {KINGZ_CONTACT.googleMapsEmbed ? (
              <div className="kingz-card overflow-hidden aspect-video">
                <iframe
                  title="Kingz and Queenz Entertainment location"
                  src={KINGZ_CONTACT.googleMapsEmbed}
                  className="w-full h-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
