'use client'

import { useEffect, useState } from 'react'
import { addGameSponsor, deleteGameSponsor, listGameSponsors } from '@/app/actions/game-sponsors'
import type { GameSponsor } from '@/lib/supabase/types'

export function GameSponsorsPanel({ gameId }: { gameId: string }) {
  const [sponsors, setSponsors] = useState<GameSponsor[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function refresh() {
    const res = await listGameSponsors(gameId)
    if ('error' in res) setError(res.error)
    else setSponsors(res.sponsors)
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listGameSponsors(gameId).then((res) => {
      if (cancelled) return
      if ('error' in res) setError(res.error)
      else setSponsors(res.sponsors)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [gameId])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    const res = await addGameSponsor(gameId, { name, logoUrl: logoUrl.trim() || null })
    setSaving(false)
    if ('error' in res) {
      setError(res.error)
      return
    }
    setName('')
    setLogoUrl('')
    await refresh()
  }

  async function handleDelete(id: string) {
    setError('')
    const res = await deleteGameSponsor(id, gameId)
    if ('error' in res) {
      setError(res.error)
      return
    }
    await refresh()
  }

  return (
    <div className="mt-6 pt-6 border-t border-slate-700 space-y-4">
      <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Sponsors (mystery envelopes)</h4>
      <p className="text-slate-500 text-sm">
        Logos and names appear on the winner envelope reveal for players when sponsor integration is enabled.
      </p>
      {loading ? (
        <p className="text-slate-500 text-sm">Loading…</p>
      ) : sponsors.length === 0 ? (
        <p className="text-slate-500 text-sm">No sponsors yet.</p>
      ) : (
        <ul className="space-y-2">
          {sponsors.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-700 bg-slate-800/40 px-3 py-2"
            >
              <span className="text-slate-200 font-medium">{s.name}</span>
              {s.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.logo_url} alt="" className="h-8 w-auto max-w-[120px] object-contain" />
              )}
              <button
                type="button"
                onClick={() => handleDelete(s.id)}
                className="text-sm text-red-400 hover:text-red-300"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleAdd} className="flex flex-col gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Sponsor name"
          className="rounded-xl bg-slate-800 border border-slate-600 px-3 py-2 text-slate-200 text-sm"
        />
        <input
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="Logo image URL (optional)"
          className="rounded-xl bg-slate-800 border border-slate-600 px-3 py-2 text-slate-200 text-sm"
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="rounded-full bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white w-fit"
        >
          {saving ? 'Adding…' : 'Add sponsor'}
        </button>
      </form>
    </div>
  )
}
