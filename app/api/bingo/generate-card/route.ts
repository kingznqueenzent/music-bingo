import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPlayerBingoCard } from '@/lib/bingo/create-player-card'
import { getUserFromBearer } from '@/lib/supabase/auth-helpers'

export async function POST(request: NextRequest) {
  let body: {
    gameCode?: string
    username?: string
    playerIdentifier?: string
    resumeCardId?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const authUser = await getUserFromBearer(request)
  const supabase = createClient()
  const result = await createPlayerBingoCard(supabase, {
    gameCode: body.gameCode ?? '',
    username: body.username ?? '',
    playerIdentifier: body.playerIdentifier,
    resumeCardId: body.resumeCardId,
    authUserId: authUser?.id ?? null,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status ?? 400 })
  }

  return NextResponse.json({
    ok: true,
    cardId: result.cardId,
    gameId: result.gameId,
    playerId: result.playerId,
    gridData: result.gridData,
    gridSize: result.gridData.length ? Math.round(Math.sqrt(result.gridData.length)) : 5,
    cellCount: result.gridData.length,
    alreadyJoined: result.alreadyJoined ?? false,
    playerIdentifier: result.playerIdentifier ?? null,
  })
}
