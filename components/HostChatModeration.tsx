'use client'

import { useEffect, useState, useCallback } from 'react'
import { updateGameSettings } from '@/app/actions/game'
import type { Game } from '@/lib/supabase/types'

type FlaggedRow = { id: string; player_name: string; message: string; room: string; created_at: string }

export function HostChatModeration({
  gameId,
  game,
  onGameRefresh,
}: {
  gameId: string
  game: Game | null
  onGameRefresh?: () => void
}) {
  const [mutedInput, setMutedInput] = useState('')
  const [profanity, setProfanity] = useState(game?.chat_profanity_filter_enabled !== false)
  const [saving, setSaving] = useState(false)
  const [flagged, setFlagged] = useState<FlaggedRow[]>([])
  const [actionErr, setActionErr] = useState('')

  useEffect(() => {
    if (game?.muted_players?.length) setMutedInput(game.muted_players.join(', '))
    setProfanity(game?.chat_profanity_filter_enabled !== false)
  }, [game?.muted_players, game?.chat_profanity_filter_enabled])

  const loadFlagged = useCallback(async () => {
    const res = await fetch(`/api/chat/flagged?gameId=${encodeURIComponent(gameId)}`)
    const data = (await res.json()) as { ok?: boolean; messages?: FlaggedRow[] }
    if (data.ok && data.messages) setFlagged(data.messages)
  }, [gameId])

  useEffect(() => {
    void loadFlagged()
    const t = setInterval(() => void loadFlagged(), 5000)
    return () => clearInterval(t)
  }, [loadFlagged])

  async function saveSettings() {
    setSaving(true)
    setActionErr('')
    const list = mutedInput
      .split(/[,;\n]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
    const res = await updateGameSettings(gameId, {
      mutedPlayers: list,
      chatProfanityFilterEnabled: profanity,
    })
    setSaving(false)
    if (res.error) setActionErr(res.error)
    else onGameRefresh?.()
  }

  async function deleteMessage(id: string) {
    setActionErr('')
    const res = await fetch(`/api/chat/messages/${id}`, { method: 'DELETE' })
    const data = (await res.json()) as { ok?: boolean; error?: string }
    if (!data.ok) setActionErr(data.error ?? 'Delete failed')
    void loadFlagged()
  }

  return (
    <div className="mt-6 pt-6 border-t border-slate-700 space-y-4">
      <h4 className="text-sm font-semibold text-violet-400 uppercase tracking-wide">Chat moderation</h4>
      <p className="text-slate-500 text-sm">
        Requires admin session (same as feature flags) to delete messages. Mute list matches player email or identifier
        (lowercase).
      </p>
      <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-sm">
        <input
          type="checkbox"
          checked={profanity}
          onChange={(e) => setProfanity(e.target.checked)}
          className="rounded border-slate-600"
        />
        Profanity filter (masks profane words and flags messages for review)
      </label>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Muted players (comma-separated emails or identifiers)</label>
        <textarea
          value={mutedInput}
          onChange={(e) => setMutedInput(e.target.value)}
          rows={2}
          placeholder="player@email.com, twitchname"
          className="w-full rounded-xl bg-slate-800 border border-slate-600 px-3 py-2 text-slate-200 text-sm"
        />
      </div>
      <button
        type="button"
        onClick={() => saveSettings()}
        disabled={saving}
        className="rounded-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold"
      >
        {saving ? 'Saving…' : 'Save chat settings'}
      </button>
      {actionErr && <p className="text-red-400 text-sm">{actionErr}</p>}

      <div>
        <h5 className="text-xs font-semibold text-amber-400/90 uppercase tracking-wide mb-2">Flagged messages (poll)</h5>
        {flagged.length === 0 ? (
          <p className="text-slate-500 text-sm">No flagged messages.</p>
        ) : (
          <ul className="space-y-2">
            {flagged.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm"
              >
                <div>
                  <span className="text-amber-200 font-medium">{m.player_name}</span>
                  <span className="text-slate-500 ml-2 text-xs">{m.room}</span>
                  <p className="text-slate-300 mt-1">{m.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteMessage(m.id)}
                  className="text-red-400 hover:text-red-300 text-xs shrink-0"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
