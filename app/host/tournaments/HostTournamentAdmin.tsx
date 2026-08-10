'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Theme } from '@/lib/supabase/types'
import type { Tournament } from '@/lib/supabase/types'

export function HostTournamentAdmin({
  themes,
  initialTournaments,
}: {
  themes: Pick<Theme, 'id' | 'name'>[]
  initialTournaments: Tournament[]
}) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [rounds, setRounds] = useState(4)
  const [prize, setPrize] = useState('')
  const [bannerUrl, setBannerUrl] = useState('')
  const [maxPlayers, setMaxPlayers] = useState('')
  const [winnerXp, setWinnerXp] = useState(200)
  const [format, setFormat] = useState<'points' | 'bracket'>('points')
  const [selectedThemes, setSelectedThemes] = useState<Set<string>>(new Set())
  const [msg, setMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [list, setList] = useState<Tournament[]>(initialTournaments)

  useEffect(() => {
    fetch('/api/admin-session')
      .then((r) => r.json())
      .then((d: { isAdmin?: boolean }) => setIsAdmin(!!d?.isAdmin))
      .finally(() => setLoading(false))
  }, [])

  function toggleTheme(id: string) {
    setSelectedThemes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setMsg('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/tournament/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          start_date: startDate,
          end_date: endDate,
          theme_ids: [...selectedThemes],
          format,
          rounds_total: rounds,
          prize_description: prize || null,
          banner_url: bannerUrl || null,
          max_players: maxPlayers ? parseInt(maxPlayers, 10) : null,
          winner_bonus_xp: winnerXp,
          status: 'upcoming',
        }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string; id?: string }
      if (data.ok && data.id) {
        setMsg('Tournament created.')
        setList((prev) => [
          {
            id: data.id!,
            name,
            status: 'upcoming',
            start_date: startDate,
            end_date: endDate,
            theme_ids: [...selectedThemes],
            format,
            rounds_total: rounds,
            prize_description: prize || null,
            banner_url: bannerUrl || null,
            max_players: maxPlayers ? parseInt(maxPlayers, 10) : null,
          } as Tournament,
          ...prev,
        ])
        setName('')
        setPrize('')
        setBannerUrl('')
      } else {
        setMsg(data.error ?? 'Failed')
      }
    } catch (err) {
      setMsg(String(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <p className="text-slate-400">Loading…</p>
  }

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-8 text-slate-300">
        <p className="mb-4">Sign in as admin to create tournaments.</p>
        <Link href="/admin-login" className="text-amber-400 hover:text-amber-300">
          Admin login
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-10 max-w-3xl">
      <section>
        <h2 className="text-xl font-bold text-white mb-4">Create tournament</h2>
        <p className="text-slate-400 text-sm mb-4">
          Leave all themes unchecked to allow <strong className="text-slate-200">any</strong> theme. Points accrue when
          registered players finish games (participation + wins) during the date range.
        </p>
        <form onSubmit={handleCreate} className="space-y-4">
          <input
            required
            placeholder="Name (e.g. Summer Bingo Series 2026)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl bg-slate-800 border border-slate-600 px-4 py-2 text-slate-100"
          />
          <div className="flex flex-wrap gap-4">
            <label className="text-slate-400 text-sm">
              Start
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="block mt-1 rounded-xl bg-slate-800 border border-slate-600 px-3 py-2 text-slate-100"
              />
            </label>
            <label className="text-slate-400 text-sm">
              End
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="block mt-1 rounded-xl bg-slate-800 border border-slate-600 px-3 py-2 text-slate-100"
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-4 items-center">
            <label className="text-slate-400 text-sm">
              Rounds (series length)
              <input
                type="number"
                min={1}
                value={rounds}
                onChange={(e) => setRounds(parseInt(e.target.value, 10) || 1)}
                className="block mt-1 w-24 rounded-xl bg-slate-800 border border-slate-600 px-3 py-2 text-slate-100"
              />
            </label>
            <label className="text-slate-400 text-sm">
              Format
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as 'points' | 'bracket')}
                className="block mt-1 rounded-xl bg-slate-800 border border-slate-600 px-3 py-2 text-slate-100"
              >
                <option value="points">Points</option>
                <option value="bracket">Bracket (elimination TBD)</option>
              </select>
            </label>
            <label className="text-slate-400 text-sm">
              Winner XP bonus
              <input
                type="number"
                min={0}
                value={winnerXp}
                onChange={(e) => setWinnerXp(parseInt(e.target.value, 10) || 0)}
                className="block mt-1 w-28 rounded-xl bg-slate-800 border border-slate-600 px-3 py-2 text-slate-100"
              />
            </label>
          </div>
          <textarea
            placeholder="Prize description"
            value={prize}
            onChange={(e) => setPrize(e.target.value)}
            rows={3}
            className="w-full rounded-xl bg-slate-800 border border-slate-600 px-4 py-2 text-slate-100"
          />
          <input
            placeholder="Banner image URL (optional)"
            value={bannerUrl}
            onChange={(e) => setBannerUrl(e.target.value)}
            className="w-full rounded-xl bg-slate-800 border border-slate-600 px-4 py-2 text-slate-100"
          />
          <input
            placeholder="Max players (optional)"
            value={maxPlayers}
            onChange={(e) => setMaxPlayers(e.target.value)}
            className="w-full rounded-xl bg-slate-800 border border-slate-600 px-4 py-2 text-slate-100"
          />
          <div>
            <p className="text-slate-400 text-sm mb-2">Eligible themes (optional)</p>
            <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-700 p-3 space-y-2">
              {themes.length === 0 ? (
                <p className="text-slate-500 text-sm">No themes in database.</p>
              ) : (
                themes.map((th) => (
                  <label key={th.id} className="flex items-center gap-2 text-slate-300 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedThemes.has(th.id)}
                      onChange={() => toggleTheme(th.id)}
                    />
                    {th.name}
                  </label>
                ))
              )}
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold px-6 py-2 disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create tournament'}
          </button>
          {msg && <p className="text-sm text-green-300">{msg}</p>}
        </form>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white mb-4">Your tournaments</h2>
        {list.length === 0 ? (
          <p className="text-slate-500">None yet.</p>
        ) : (
          <ul className="space-y-2">
            {list.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/tournaments/${t.id}`}
                  className="block rounded-xl border border-slate-700 bg-slate-900/40 px-4 py-3 hover:border-amber-500/40"
                >
                  <span className="font-medium text-white">{t.name}</span>
                  <span className="text-slate-500 text-sm ml-2">
                    {t.status} · {t.start_date} — {t.end_date}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
