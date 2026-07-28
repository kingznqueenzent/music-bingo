'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function StageGameForm() {
  const router = useRouter()
  const [gameId, setGameId] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const id = gameId.trim()
    if (!id) return
    router.push(`/stage/${id}`)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label className="text-sm text-white/70">
        Game ID (UUID)
        <input
          type="text"
          value={gameId}
          onChange={(e) => setGameId(e.target.value)}
          placeholder="e.g. from /host/…"
          className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand-neon/40"
        />
      </label>
      <button
        type="submit"
        className="rounded-xl bg-brand-neon/20 border border-brand-neon/40 text-brand-neon font-semibold py-2.5 hover:bg-brand-neon/30 transition-colors"
      >
        Open stage
      </button>
    </form>
  )
}
