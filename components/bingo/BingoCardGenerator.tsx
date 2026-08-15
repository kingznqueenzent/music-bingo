'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { GridData } from '@/types/database-extras'
import { getDefaultJoinRoomCode } from '@/lib/default-room-code'
import { createClient } from '@/lib/supabase/client'
import {
  browserPlayerIdentifier,
  getOrCreateBrowserSessionId,
  setStoredPlayerCardId,
} from '@/lib/bingo/player-card-session'

type GenerateCardResponse = {
  ok?: boolean
  error?: string
  cardId?: string
  gameId?: string
  playerId?: string
  cellCount?: number
  alreadyJoined?: boolean
}

export type BingoCardGeneratorProps = {
  initialGameCode?: string
  initialUsername?: string
  playerIdentifier?: string
  /** When true, show a preview grid before redirecting */
  showPreview?: boolean
  onSuccess?: (payload: { cardId: string; gameId: string; playerId: string }) => void
  className?: string
}

function gridDimension(cellCount: number): 4 | 5 {
  return cellCount === 16 ? 4 : 5
}

function PreviewGrid({ gridData }: { gridData: GridData }) {
  const size = gridDimension(gridData.length)
  const sorted = [...gridData].sort((a, b) => a.position - b.position)

  return (
    <div
      className="mt-4 grid gap-1 w-full max-w-md mx-auto"
      style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
    >
      {sorted.map((cell) => (
        <div
          key={cell.position}
          className="aspect-square rounded-md border border-emerald-500/40 bg-slate-900/80 p-1 flex items-center justify-center text-center text-[10px] sm:text-xs text-emerald-100 leading-tight"
          title={cell.artist ? `${cell.title} — ${cell.artist}` : (cell.title ?? '')}
        >
          <span className="line-clamp-3">{cell.title ?? 'Track'}</span>
        </div>
      ))}
    </div>
  )
}

export function BingoCardGenerator({
  initialGameCode = getDefaultJoinRoomCode(),
  initialUsername = '',
  playerIdentifier,
  showPreview = false,
  onSuccess,
  className = '',
}: BingoCardGeneratorProps) {
  const router = useRouter()
  const [gameCode, setGameCode] = useState(initialGameCode)
  const [username, setUsername] = useState(initialUsername)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [previewGrid, setPreviewGrid] = useState<GridData | null>(null)
  const [lastResult, setLastResult] = useState<{ cardId: string; gameId: string; playerId: string } | null>(
    null
  )

  async function generateCard(e?: React.FormEvent) {
    e?.preventDefault()
    setError('')
    setPreviewGrid(null)

    const code = gameCode.trim().toUpperCase()
    const name = username.trim()
    if (!code) {
      setError('Enter the game code.')
      return
    }
    if (!name) {
      setError('Enter your display name.')
      return
    }

    setLoading(true)
    try {
      const resolvedIdentifier =
        playerIdentifier?.trim() || browserPlayerIdentifier(getOrCreateBrowserSessionId())

      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const token = session?.access_token

      const res = await fetch('/api/bingo/generate-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          gameCode: code,
          username: name,
          playerIdentifier: resolvedIdentifier,
        }),
      })
      const data = (await res.json()) as GenerateCardResponse & {
        gridData?: GridData
        playerIdentifier?: string | null
      }

      if (!res.ok || !data.ok || !data.cardId || !data.gameId) {
        setError(data.error ?? 'Could not generate your bingo card.')
        return
      }

      setStoredPlayerCardId(data.gameId, data.cardId, {
        isHost: (data.playerIdentifier ?? resolvedIdentifier).startsWith('host-'),
      })

      const payload = {
        cardId: data.cardId,
        gameId: data.gameId,
        playerId: data.playerId ?? '',
      }
      setLastResult(payload)
      onSuccess?.(payload)

      if (showPreview && data.gridData?.length) {
        setPreviewGrid(data.gridData)
        return
      }

      router.push(`/play?cardId=${payload.cardId}&gameId=${payload.gameId}`)
    } catch {
      setError('Network error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={className}>
      <form onSubmit={generateCard} className="space-y-4">
        <div>
          <label htmlFor="bingo-game-code" className="block text-sm font-medium text-slate-300 mb-1">
            Game code
          </label>
          <input
            id="bingo-game-code"
            type="text"
            value={gameCode}
            onChange={(e) => setGameCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={8}
            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-3 text-lg text-white uppercase tracking-widest"
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor="bingo-username" className="block text-sm font-medium text-slate-300 mb-1">
            Display name
          </label>
          <input
            id="bingo-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Your DJ name"
            maxLength={40}
            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-3 text-lg text-white"
            autoComplete="nickname"
          />
        </div>
        {error && (
          <p className="text-red-400 text-sm" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold py-3 text-lg transition-colors touch-manipulation"
        >
          {loading ? 'Dealing your card…' : 'Get my bingo card'}
        </button>
      </form>

      {previewGrid && lastResult && (
        <div className="mt-6 text-center">
          <p className="text-emerald-300 text-sm mb-2">Your card is ready</p>
          <PreviewGrid gridData={previewGrid} />
          <button
            type="button"
            onClick={() =>
              router.push(`/play?cardId=${lastResult.cardId}&gameId=${lastResult.gameId}`)
            }
            className="mt-4 rounded-lg border border-emerald-500/50 text-emerald-300 px-6 py-2 hover:bg-emerald-500/10 touch-manipulation"
          >
            Play now
          </button>
        </div>
      )}
    </div>
  )
}
