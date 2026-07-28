import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateBoard } from '@/lib/game-session'

/** Base44 updateBoard — POST /api/game/update-board */
export async function POST(req: NextRequest) {
  let body: {
    gameId?: string
    cardId?: string
    markedPlaylistSongIds?: string[]
    playerIdentifier?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const { gameId, cardId, markedPlaylistSongIds, playerIdentifier } = body
  if (!gameId || !cardId || !Array.isArray(markedPlaylistSongIds)) {
    return NextResponse.json(
      { ok: false, error: 'Missing gameId, cardId, or markedPlaylistSongIds' },
      { status: 400 }
    )
  }

  const supabase = createClient()
  const result = await updateBoard(supabase, {
    gameId,
    cardId,
    markedPlaylistSongIds,
    playerIdentifier,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
