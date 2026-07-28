'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Tournament, TournamentEntry } from '@/lib/supabase/types'
import { ChatPanel, type ChatIdentity } from '@/components/chat/ChatPanel'

export function TournamentLeaderboardClient({
  tournament,
  initialEntries,
  chatEnabled = false,
}: {
  tournament: Tournament
  initialEntries: TournamentEntry[]
  chatEnabled?: boolean
}) {
  const supabase = useMemo(() => createClient(), [])
  const [entries, setEntries] = useState<TournamentEntry[]>(initialEntries)
  const [regEmail, setRegEmail] = useState('')
  const [regName, setRegName] = useState('')
  const [regId, setRegId] = useState('')
  const [regMsg, setRegMsg] = useState('')
  const [regSubmitting, setRegSubmitting] = useState(false)
  const [tab, setTab] = useState<'standings' | 'chat'>('standings')

  const canRegister =
    tournament.status !== 'completed' && new Date().toISOString().slice(0, 10) <= tournament.end_date

  const chatIdentity: ChatIdentity = useMemo(
    () => ({
      playerName: regName.trim() || 'Guest',
      playerEmail: regEmail.trim(),
      playerIdentifier: regId.trim() || `tournament-${tournament.id}-guest`,
      avatarUrl: null,
    }),
    [regName, regEmail, regId, tournament.id]
  )

  const reload = useCallback(async () => {
    const { data } = await supabase
      .from('tournament_entries')
      .select('*')
      .eq('tournament_id', tournament.id)
      .order('points', { ascending: false })
    setEntries((data ?? []) as TournamentEntry[])
  }, [supabase, tournament.id])

  useEffect(() => {
    const ch = supabase
      .channel(`tournament-${tournament.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_entries',
          filter: `tournament_id=eq.${tournament.id}`,
        },
        () => {
          void reload()
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [supabase, tournament.id, reload])

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setRegMsg('')
    setRegSubmitting(true)
    try {
      const res = await fetch('/api/tournament/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentId: tournament.id,
          playerEmail: regEmail,
          playerName: regName,
          playerIdentifier: regId,
        }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (data.ok) {
        setRegMsg('You are registered! Points accrue when you play eligible games during the series.')
        setRegEmail('')
        setRegName('')
        setRegId('')
        void reload()
      } else {
        setRegMsg(data.error ?? 'Registration failed')
      }
    } catch (err) {
      setRegMsg(String(err))
    } finally {
      setRegSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-3xl space-y-10">
      {tournament.banner_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={tournament.banner_url}
          alt=""
          className="w-full max-h-48 object-cover rounded-2xl border border-amber-500/30"
        />
      )}

      {chatEnabled && (
        <div className="flex gap-2 border-b border-slate-700 pb-2">
          <button
            type="button"
            onClick={() => setTab('standings')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${
              tab === 'standings' ? 'bg-amber-500/20 text-amber-200' : 'text-slate-400 hover:text-white'
            }`}
          >
            Standings
          </button>
          <button
            type="button"
            onClick={() => setTab('chat')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${
              tab === 'chat' ? 'bg-violet-500/20 text-violet-200' : 'text-slate-400 hover:text-white'
            }`}
          >
            Tournament chat
          </button>
        </div>
      )}

      <div>
        <p className="text-sm uppercase tracking-widest text-amber-400/80">{tournament.status}</p>
        <h1 className="text-3xl md:text-4xl font-black text-white mt-1">{tournament.name}</h1>
        <p className="text-slate-400 mt-2">
          {tournament.start_date} → {tournament.end_date} · {tournament.format === 'bracket' ? 'Bracket' : 'Points'}{' '}
          · {tournament.rounds_total} rounds
        </p>
        {tournament.prize_description && (
          <p className="text-slate-300 mt-4 border-l-4 border-amber-500/50 pl-4">{tournament.prize_description}</p>
        )}
      </div>

      {chatEnabled && tab === 'chat' && (
        <ChatPanel
          embedded
          room="tournament"
          tournamentId={tournament.id}
          identity={chatIdentity}
          title={`${tournament.name} · chat`}
        />
      )}

      {(!chatEnabled || tab === 'standings') && (
        <>
      {canRegister && (
        <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6">
          <h2 className="text-lg font-bold text-white mb-3">Register</h2>
          <p className="text-sm text-slate-400 mb-4">
            Use the same <strong className="text-slate-200">player identifier</strong> you use when joining a LyricGrid game
            (from your join link). Email is for contact only.
          </p>
          <form onSubmit={handleRegister} className="space-y-3 max-w-md">
            <input
              type="email"
              required
              placeholder="Email"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              className="w-full rounded-xl bg-slate-800 border border-slate-600 px-4 py-2 text-slate-100"
            />
            <input
              type="text"
              required
              placeholder="Display name"
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              className="w-full rounded-xl bg-slate-800 border border-slate-600 px-4 py-2 text-slate-100"
            />
            <input
              type="text"
              required
              placeholder="Player identifier (join code)"
              value={regId}
              onChange={(e) => setRegId(e.target.value)}
              className="w-full rounded-xl bg-slate-800 border border-slate-600 px-4 py-2 text-slate-100"
            />
            <button
              type="submit"
              disabled={regSubmitting}
              className="rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold px-6 py-2 disabled:opacity-50"
            >
              {regSubmitting ? 'Saving…' : 'Register'}
            </button>
            {regMsg && <p className="text-sm text-cyan-300">{regMsg}</p>}
          </form>
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-xl font-bold text-white mb-4">Standings</h2>
        {entries.length === 0 ? (
          <p className="text-slate-500">No entries yet. Register above — points update live as games finish.</p>
        ) : (
          <ul className="space-y-2">
            {entries.map((e, i) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-slate-800/80 border border-slate-700/80 px-4 py-3"
              >
                <span className="text-amber-400 font-bold w-8">#{e.rank ?? i + 1}</span>
                <span className="flex-1 font-medium text-slate-100 truncate">{e.player_name}</span>
                <span className="text-amber-300 font-semibold">{e.points} pts</span>
                <span className="text-slate-500 text-sm hidden sm:inline">{e.rounds_played} rounds</span>
              </li>
            ))}
          </ul>
        )}
      </section>
        </>
      )}
    </div>
  )
}
