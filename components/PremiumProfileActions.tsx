'use client'

import { useState } from 'react'
import { useFeatureFlags } from '@/components/FeatureFlagsProvider'

export function PremiumProfileActions({ identifier }: { identifier: string }) {
  const { isEnabled, loading } = useFeatureFlags()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  if (loading || !isEnabled('premium_player_pass')) return null

  async function toggle(enable: boolean) {
    setBusy(true)
    setMsg('')
    try {
      const res = await fetch('/api/premium/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, enable }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (data.ok) {
        setMsg(enable ? 'Premium enabled (demo).' : 'Premium removed.')
        window.location.reload()
      } else setMsg(data.error ?? 'Could not update')
    } catch {
      setMsg('Network error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl border border-sky-500/30 bg-sky-950/40 p-5 space-y-3">
      <h3 className="text-lg font-bold text-sky-200">Go Premium</h3>
      <p className="text-slate-400 text-sm">
        Demo toggle: custom frame styling, exclusive badge, 1.5× XP when both Premium and XP are enabled, and early access
        to new themes (watch playlists for the “Premium early” badge).
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => toggle(true)}
          className="rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 px-4 py-2 font-semibold text-slate-900"
        >
          {busy ? '…' : 'Enable Premium (demo)'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => toggle(false)}
          className="rounded-xl border border-slate-600 px-4 py-2 text-slate-300 hover:bg-slate-800 disabled:opacity-50"
        >
          Remove Premium
        </button>
      </div>
      {msg && <p className="text-sm text-slate-400">{msg}</p>}
    </div>
  )
}
