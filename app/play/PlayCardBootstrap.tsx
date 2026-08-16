'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { roomCodeFromGame } from '@/types/database-extras'
import {
  browserPlayerIdentifier,
  getOrCreateBrowserSessionId,
  getStoredCardIdForGame,
  setStoredPlayerCardId,
} from '@/lib/bingo/player-card-session'

type PlayCardBootstrapProps = {
  gameId: string
  lyricHint?: string | null
}

/**
 * When `/play/[gameId]` is opened without `cardId`, resume a stored card or mint one.
 */
export function PlayCardBootstrap({ gameId, lyricHint = null }: PlayCardBootstrapProps) {
  const [error, setError] = useState('')
  const [hint, setHint] = useState('Looking up your bingo card…')

  useEffect(() => {
    let cancelled = false

    async function run() {
      const stored = getStoredCardIdForGame(gameId)
      if (stored) {
        const qs = new URLSearchParams()
        qs.set('cardId', stored)
        if (lyricHint) qs.set('hint', lyricHint)
        window.location.replace(`/play/${gameId}?${qs.toString()}`)
        return
      }

      setHint('Creating your bingo card…')
      const supabase = createClient()
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('id, code, room_code, status')
        .eq('id', gameId)
        .maybeSingle()

      if (cancelled) return

      if (gameError) {
        setError(`Could not load game (${gameError.message}).`)
        return
      }
      if (!game) {
        setError('Game not found. Ask the host for a room code and join again.')
        return
      }
      if ((game as { status?: string }).status === 'ended') {
        setError('This game has ended. Wait for the host to start a new lobby.')
        return
      }

      const roomCode = roomCodeFromGame(game as { code?: string | null; room_code?: string | null })
      const sessionId = getOrCreateBrowserSessionId()
      const playerIdentifier = browserPlayerIdentifier(sessionId)

      try {
        const res = await fetch('/api/bingo/generate-card', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameCode: roomCode,
            username: `Player-${sessionId.slice(0, 6)}`,
            playerIdentifier,
          }),
        })
        const data = (await res.json()) as {
          ok?: boolean
          cardId?: string
          gameId?: string
          error?: string
        }
        if (cancelled) return
        if (!data.ok || !data.cardId) {
          setError(data.error ?? 'Could not create a bingo card.')
          return
        }
        setStoredPlayerCardId(data.gameId ?? gameId, data.cardId)
        const qs = new URLSearchParams()
        qs.set('cardId', data.cardId)
        if (lyricHint) qs.set('hint', lyricHint)
        window.location.replace(`/play/${data.gameId ?? gameId}?${qs.toString()}`)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not create a bingo card.')
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [gameId, lyricHint])

  return (
    <main className="min-h-dvh bg-gradient-to-b from-[#121212] via-[#1E1E1E] to-[#121212] flex flex-col items-center justify-center p-8 text-white text-center">
      {error ? (
        <>
          <p className="text-xl text-red-300 max-w-md">{error}</p>
          <a href="/join" className="mt-6 text-lg underline text-[#00FF66] hover:text-[#39FF14]">
            Join with room code
          </a>
        </>
      ) : (
        <>
          <div
            className="h-10 w-10 rounded-full border-2 border-[#00FF66]/30 border-t-[#00FF66] animate-spin mb-4"
            aria-hidden
          />
          <p className="text-xl text-slate-100">{hint}</p>
        </>
      )}
    </main>
  )
}
