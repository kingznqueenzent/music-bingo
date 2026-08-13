'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { KINGZ_CONTACT } from '@/lib/kingz/data'
import { useKingzReveal } from './useKingzGsap'

type FormState = {
  name: string
  email: string
  phone: string
  message: string
  preferredDate: string
}

const initial: FormState = {
  name: '',
  email: '',
  phone: '',
  message: '',
  preferredDate: '',
}

export function KingzContact() {
  const ref = useKingzReveal<HTMLElement>()
  const [form, setForm] = useState<FormState>(initial)
  const [errors, setErrors] = useState<Partial<FormState>>({})
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [statusMsg, setStatusMsg] = useState('')

  useEffect(() => {
    const prefill = sessionStorage.getItem('kingz-prefill-message')
    if (prefill) {
      setForm((f) => ({ ...f, message: prefill }))
      sessionStorage.removeItem('kingz-prefill-message')
    }
    const date = sessionStorage.getItem('kingz-prefill-date')
    if (date) {
      setForm((f) => ({ ...f, preferredDate: date }))
      sessionStorage.removeItem('kingz-prefill-date')
    }
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
      const res = await fetch('/api/kingz-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'Failed to send')
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
            Get In Touch
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 max-w-5xl mx-auto">
          <form
            data-kingz-reveal
            onSubmit={onSubmit}
            className="kingz-card p-8 space-y-5"
            noValidate
            aria-label="Contact form"
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
                Preferred Date
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
              {status === 'loading' ? 'Sending…' : 'Send Inquiry'}
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
                    Use the inquiry form — contact details will be published here when available.
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
