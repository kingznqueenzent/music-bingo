import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyHostBingoClaim } from '@/lib/game-session'
import { normalizeWinPattern } from '@/lib/bingo-win-pattern'

/**
 * Persist a player CALL BINGO! claim so the host sees it via game_events realtime.
 * Complements broadcastBingoClaim + /api/verify-bingo (no separate game_claims table).
 */
export async function POST(req: NextRequest) {
  let body: {
    gameId?: string
    cardId?: string
    playerName?: string
    playerIdentifier?: string
    pattern?: string
    markedPlaylistSongIds?: string[]
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const { gameId, cardId, playerName, playerIdentifier, pattern, markedPlaylistSongIds } = body
  if (!gameId || !cardId) {
    return NextResponse.json({ ok: false, error: 'Missing gameId or cardId' }, { status: 400 })
  }

  const supabase = createClient()
  const result = await notifyHostBingoClaim(supabase, gameId, {
    cardId,
    playerName: playerName ?? null,
    playerIdentifier: playerIdentifier ?? null,
    pattern: normalizeWinPattern(pattern),
    markedPlaylistSongIds: Array.isArray(markedPlaylistSongIds) ? markedPlaylistSongIds : [],
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
