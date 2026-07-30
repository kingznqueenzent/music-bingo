'use client'

import { useState } from 'react'
import { broadcastHostShoutout, type HostShoutoutPayload } from '@/lib/supabase-realtime'
import type { SupabaseClient } from '@supabase/supabase-js'

const PRESETS: { kind: HostShoutoutPayload['kind']; label: string; placeholder: string }[] = [
  { kind: 'custom', label: 'Custom', placeholder: 'Type a message for stage & players…' },
  { kind: 'venue', label: 'Venue notice', placeholder: 'e.g. Bar closes at midnight — last round!' },
  { kind: 'warning', label: 'Warning', placeholder: 'e.g. Please keep phones on silent' },
]

export type ShoutoutConsoleProps = {
  gameId: string
  supabase: SupabaseClient
  className?: string
}

export function ShoutoutConsole({ gameId, supabase, className = '' }: ShoutoutConsoleProps) {
  const [kind, setKind] = useState<HostShoutoutPayload['kind']>('custom')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState('')

  async function handleSend() {
    const text = message.trim()
    if (!text) return
    setSending(true)
    setStatus('')
    try {
      await broadcastHostShoutout(supabase, gameId, { kind, message: text })
      setMessage('')
      setStatus('Sent to Stage & Player screens')
      window.setTimeout(() => setStatus(''), 3000)
    } catch {
      setStatus('Failed to send')
    } finally {
      setSending(false)
    }
  }

  const preset = PRESETS.find((p) => p.kind === kind) ?? PRESETS[0]

  return (
    <div className={`rounded-2xl border border-slate-800 bg-slate-900/70 p-5 ${className}`}>
      <h3 className="text-lg font-bold text-slate-50 mb-1">Shoutout Console</h3>
      <p className="text-slate-500 text-sm mb-4">Overlay messages on Stage &amp; Player screens</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {PRESETS.map((p) => (
          <button
            key={p.kind}
            type="button"
            onClick={() => setKind(p.kind)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
              kind === p.kind
                ? p.kind === 'warning'
                  ? 'bg-red-500/80 text-white'
                  : p.kind === 'venue'
                    ? 'bg-[#00FFFF]/20 text-[#00FFFF] border border-[#00FFFF]/40'
                    : 'bg-emerald-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={preset.placeholder}
        rows={3}
        className="w-full rounded-xl bg-slate-800 border border-slate-600 px-3 py-2 text-slate-100 placeholder-slate-500 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#00FFFF]/40"
      />
      <div className="flex items-center justify-between gap-3 mt-3">
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || !message.trim()}
          className="rounded-full bg-[#00FFFF] hover:bg-cyan-300 disabled:opacity-40 text-[#121212] font-bold px-5 py-2 text-sm"
        >
          {sending ? 'Sending…' : 'Send overlay'}
        </button>
        {status ? <p className="text-emerald-400 text-xs">{status}</p> : null}
      </div>
    </div>
  )
}
