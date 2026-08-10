'use client'

import { useMemo, useState, useEffect } from 'react'
import { ChatPanel, type ChatIdentity } from '@/components/chat/ChatPanel'
import type { CommunityChannel } from '@/lib/supabase/types'

const CHANNELS: { id: CommunityChannel; label: string }[] = [
  { id: 'general', label: '#general' },
  { id: 'dancehall', label: '#dancehall' },
  { id: 'hiphop', label: '#hiphop' },
  { id: '90s', label: '#90s' },
  { id: 'throwbacks', label: '#throwbacks' },
]

export function CommunityHubClient() {
  const [channel, setChannel] = useState<CommunityChannel>('general')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [id, setId] = useState('')
  const [guestId, setGuestId] = useState('')

  useEffect(() => {
    setGuestId(`guest-${crypto.randomUUID().slice(0, 8)}`)
  }, [])

  const identity: ChatIdentity = useMemo(
    () => ({
      playerName: name.trim() || 'Guest',
      playerEmail: email.trim(),
      playerIdentifier: id.trim() || guestId || 'guest-pending',
      avatarUrl: null,
    }),
    [name, email, id, guestId]
  )

  return (
    <div className="w-full max-w-2xl space-y-6">
      <p className="text-slate-400 text-sm">
        Pick a channel and set a display name (and optional email) so others know who you are. Your identifier helps
        earn chat badges on your profile.
      </p>
      <div className="flex flex-wrap gap-2">
        {CHANNELS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setChannel(c.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              channel === c.id
                ? 'bg-green-600 text-white'
                : 'bg-slate-800 text-slate-300 border border-slate-600 hover:border-green-500/50'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <input
          placeholder="Display name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-xl bg-slate-900 border border-slate-700 px-4 py-2 text-slate-100"
        />
        <input
          placeholder="Email (optional)"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-xl bg-slate-900 border border-slate-700 px-4 py-2 text-slate-100"
        />
        <input
          placeholder="Profile identifier (for badges)"
          value={id}
          onChange={(e) => setId(e.target.value)}
          className="rounded-xl bg-slate-900 border border-slate-700 px-4 py-2 text-slate-100 sm:col-span-1"
        />
      </div>
      <ChatPanel
        embedded
        room="community"
        communityChannel={channel}
        identity={identity}
        title={`Community · ${CHANNELS.find((c) => c.id === channel)?.label ?? '#general'}`}
      />
    </div>
  )
}
