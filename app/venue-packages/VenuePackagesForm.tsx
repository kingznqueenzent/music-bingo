'use client'

import { useState } from 'react'

const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    gamesPerMonth: '4 hosted games',
    players: 'Up to 40 players / game',
    features: ['Standard themes', 'Email support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    gamesPerMonth: '12 hosted games',
    players: 'Up to 80 players / game',
    features: ['Custom playlists', 'Stage leaderboard', 'Priority support'],
  },
  {
    id: 'premium',
    name: 'Premium',
    gamesPerMonth: 'Unlimited hosted games',
    players: 'Up to 200 players / game',
    features: ['White-label branding', 'Sponsor slots', 'Dedicated success manager'],
  },
] as const

export function VenuePackagesForm() {
  const [venueName, setVenueName] = useState('')
  const [contact, setContact] = useState('')
  const [packageId, setPackageId] = useState<string>('pro')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'err'>('idle')
  const [message, setMessage] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    setMessage('')
    try {
      const res = await fetch('/api/venue-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venueName, contact, packageId, notes }),
      })
      const data = (await res.json()) as { ok?: boolean; emailed?: boolean; emailError?: string; error?: string }
      if (!data.ok) {
        setStatus('err')
        setMessage(data.error ?? 'Request failed')
        return
      }
      setStatus('done')
      setMessage(
        data.emailed
          ? 'Request sent. We will follow up shortly.'
          : 'Request recorded. Email could not be sent (check RESEND_API_KEY); your host was notified in logs.'
      )
    } catch {
      setStatus('err')
      setMessage('Network error')
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <div className="space-y-4">
        {PLANS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPackageId(p.id)}
            className={`w-full text-left rounded-2xl border p-5 transition-colors ${
              packageId === p.id
                ? 'border-amber-400 bg-amber-500/10'
                : 'border-slate-700 bg-slate-900/40 hover:border-slate-500'
            }`}
          >
            <div className="flex justify-between gap-2">
              <span className="text-xl font-bold text-white">{p.name}</span>
              {packageId === p.id && <span className="text-amber-400 text-sm font-semibold">Selected</span>}
            </div>
            <p className="text-slate-400 text-sm mt-1">{p.gamesPerMonth}</p>
            <p className="text-slate-400 text-sm">{p.players}</p>
            <ul className="mt-3 text-sm text-slate-300 list-disc list-inside">
              {p.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 h-fit">
        <h2 className="text-xl font-bold text-white">Booking request</h2>
        <p className="text-slate-400 text-sm">
          Sends a message to kingzandqueenzentertainment@gmail.com with your venue and chosen package.
        </p>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Venue name</label>
          <input
            required
            value={venueName}
            onChange={(e) => setVenueName(e.target.value)}
            className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Contact (email or phone)</label>
          <input
            required
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-white"
          />
        </div>
        <button
          type="submit"
          disabled={status === 'sending'}
          className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 font-semibold py-3 text-slate-900"
        >
          {status === 'sending' ? 'Sending…' : 'Submit booking request'}
        </button>
        {message && (
          <p className={status === 'err' ? 'text-red-400 text-sm' : 'text-emerald-400 text-sm'}>{message}</p>
        )}
      </form>
    </div>
  )
}
