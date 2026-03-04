'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { joinGame } from '@/app/actions/game'

export function JoinForm({ initialGameCode = '' }: { initialGameCode?: string }) {
  const router = useRouter()
  const [gameCode, setGameCode] = useState(initialGameCode)
  const [displayName, setDisplayName] = useState('')
  const [platformId, setPlatformId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const code = gameCode.trim().toUpperCase()
    if (!code) {
      setError('Enter the game code.')
      return
    }
    if (!displayName.trim()) {
      setError('Enter a display name.')
      return
    }
    setLoading(true)
    const result = await joinGame(code, displayName.trim(), platformId.trim() || undefined)
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    if (result.cardId && result.gameId) {
      router.push(`/play?cardId=${result.cardId}&gameId=${result.gameId}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-lg mb-4 text-slate-200">Game Code</label>
        <input
          type="text"
          value={gameCode}
          onChange={(e) => setGameCode(e.target.value)}
          placeholder="ABC123"
          className="w-full p-4 text-xl rounded-2xl bg-slate-800/60 border border-slate-600 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/50"
        />
      </div>
      <div>
        <label className="block text-lg mb-4 text-slate-200">Display Name</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Player1"
          className="w-full p-4 text-xl rounded-2xl bg-slate-800/60 border border-slate-600 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/50"
        />
      </div>
      <div>
        <label className="block text-lg mb-4 text-slate-200">Platform username (optional)</label>
        <input
          type="text"
          value={platformId}
          onChange={(e) => setPlatformId(e.target.value)}
          placeholder="Twitch / Kick / YouTube username for BINGO"
          className="w-full p-4 rounded-2xl bg-slate-800/60 border border-slate-600 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/50"
        />
      </div>
      {error && <p className="text-red-300">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-emerald-500 hover:bg-emerald-400 text-xl font-semibold py-6 px-8 shadow-xl shadow-emerald-500/40 transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
      >
        {loading ? 'Joining…' : '🎲 Get My Bingo Card'}
      </button>
    </form>
  )
}
