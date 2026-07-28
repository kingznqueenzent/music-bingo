import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getUserFromBearer, isAppAdmin } from '@/lib/supabase/auth-helpers'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { containsProfanity, maskProfanity } from '@/lib/profanity-filter'
import { applyChatActivity } from '@/lib/chat-stats'
import type { ChatMessageType, ChatRoom, CommunityChannel } from '@/lib/supabase/types'

const ROOMS: ChatRoom[] = ['lobby', 'ingame', 'community', 'tournament']
const CHANNELS: CommunityChannel[] = ['general', 'dancehall', 'hiphop', '90s', 'throwbacks']
const MSG_TYPES: ChatMessageType[] = ['text', 'reaction', 'system']

export async function GET(req: NextRequest) {
  const supabase = createClient()
  if (!(await isFeatureEnabled(supabase, 'community_chat'))) {
    return NextResponse.json({ ok: false, error: 'Chat disabled' }, { status: 404 })
  }

  const { searchParams } = new URL(req.url)
  const room = searchParams.get('room') as ChatRoom | null
  const gameId = searchParams.get('gameId')
  const communityChannel = searchParams.get('communityChannel') as CommunityChannel | null
  const tournamentId = searchParams.get('tournamentId')
  const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('limit') ?? '50', 10)))

  if (!room || !ROOMS.includes(room)) {
    return NextResponse.json({ ok: false, error: 'Invalid room' }, { status: 400 })
  }

  let q = supabase
    .from('chat_messages')
    .select('*')
    .eq('room', room)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (room === 'community') {
    const ch = communityChannel && CHANNELS.includes(communityChannel) ? communityChannel : 'general'
    q = q.eq('community_channel', ch).is('game_id', null)
  } else if (room === 'tournament') {
    if (!tournamentId) return NextResponse.json({ ok: false, error: 'tournamentId required' }, { status: 400 })
    q = q.eq('tournament_id', tournamentId).eq('room', 'tournament')
  } else {
    if (!gameId) return NextResponse.json({ ok: false, error: 'gameId required' }, { status: 400 })
    q = q.eq('game_id', gameId)
  }

  const { data, error } = await q
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  const rows = (data ?? []).reverse()
  const list = rows.map((row: Record<string, unknown>) => {
    const sender_role = (row.sender_role as 'player' | 'host' | undefined) ?? 'player'
    const is_dj = !!(row.is_dj as boolean | undefined)
    return { ...row, role: sender_role, sender_role, isDJ: is_dj, is_dj }
  })
  return NextResponse.json({ ok: true, messages: list })
}

const ADMIN_COOKIE = 'admin_verified'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  if (!(await isFeatureEnabled(supabase, 'community_chat'))) {
    return NextResponse.json({ ok: false, error: 'Chat disabled' }, { status: 404 })
  }

  const jar = await cookies()
  const authUser = await getUserFromBearer(req)
  const isAdminFromJwt = isAppAdmin(authUser)
  const isHostSender = isAdminFromJwt || jar.get(ADMIN_COOKIE)?.value === '1'

  let body: {
    room?: ChatRoom
    gameId?: string | null
    tournamentId?: string | null
    communityChannel?: CommunityChannel | null
    message?: string
    messageType?: ChatMessageType
    playerName?: string
    playerEmail?: string
    playerIdentifier?: string
    avatarUrl?: string | null
    /** Client hint; server only trusts JWT app_metadata.role === 'admin' */
    isDJ?: boolean
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const room = body.room
  if (!room || !ROOMS.includes(room)) {
    return NextResponse.json({ ok: false, error: 'Invalid room' }, { status: 400 })
  }

  const messageType = body.messageType ?? 'text'
  if (!MSG_TYPES.includes(messageType) || messageType === 'system') {
    return NextResponse.json({ ok: false, error: 'Invalid message type' }, { status: 400 })
  }

  let text = (body.message ?? '').trim()
  if (!text) return NextResponse.json({ ok: false, error: 'Empty message' }, { status: 400 })
  if (text.length > 2000) return NextResponse.json({ ok: false, error: 'Message too long' }, { status: 400 })

  const playerName = (body.playerName ?? 'Player').trim().slice(0, 80) || 'Player'
  const playerEmail = (body.playerEmail ?? '').trim().slice(0, 320)
  const playerIdentifier = (body.playerIdentifier ?? '').trim().slice(0, 200) || null
  const avatarUrl = body.avatarUrl?.trim().slice(0, 2000) || null

  let gameId: string | null = body.gameId ?? null
  let tournamentId: string | null = body.tournamentId ?? null
  let communityChannel: CommunityChannel | null = body.communityChannel ?? null

  let profanityFilter = true
  let mutedList: string[] = []

  if (room === 'lobby' || room === 'ingame') {
    if (!gameId) return NextResponse.json({ ok: false, error: 'gameId required' }, { status: 400 })
    const { data: game } = await supabase.from('games').select('muted_players, chat_profanity_filter_enabled').eq('id', gameId).single()
    if (!game) return NextResponse.json({ ok: false, error: 'Game not found' }, { status: 404 })
    profanityFilter = game.chat_profanity_filter_enabled !== false
    mutedList = (game.muted_players as string[]) ?? []
  } else if (room === 'tournament') {
    if (!tournamentId) return NextResponse.json({ ok: false, error: 'tournamentId required' }, { status: 400 })
    gameId = null
  } else {
    gameId = null
    tournamentId = null
    const ch = communityChannel && CHANNELS.includes(communityChannel) ? communityChannel : 'general'
    communityChannel = ch
  }

  const emailLower = playerEmail.toLowerCase()
  const idLower = (playerIdentifier ?? '').toLowerCase()
  if (
    !isHostSender &&
    mutedList.length &&
    ((emailLower && mutedList.includes(emailLower)) || (idLower && mutedList.includes(idLower)))
  ) {
    return NextResponse.json({ ok: false, error: 'You are muted in this game chat.' }, { status: 403 })
  }

  let isFlagged = false
  if (!isHostSender && profanityFilter && containsProfanity(text)) {
    text = maskProfanity(text)
    isFlagged = true
  }

  const sender_role = isHostSender ? 'host' : 'player'
  const is_dj = isHostSender

  const insert = {
    game_id: gameId,
    player_name: playerName,
    player_email: playerEmail,
    player_identifier: playerIdentifier,
    avatar_url: avatarUrl,
    message: text,
    message_type: messageType,
    room,
    community_channel: room === 'community' ? communityChannel : null,
    tournament_id: tournamentId,
    is_flagged: isFlagged,
    is_deleted: false,
    sender_role,
    is_dj,
  }

  const { data: inserted, error } = await supabase.from('chat_messages').insert(insert).select('id').single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  let newBadges: string[] = []
  if (
    !isHostSender &&
    playerIdentifier &&
    (messageType === 'text' || messageType === 'reaction')
  ) {
    const r = await applyChatActivity(supabase, { playerIdentifier, playerName })
    newBadges = r.newBadgeIds
  }

  return NextResponse.json({
    ok: true,
    id: inserted?.id,
    isFlagged,
    newBadges,
    role: sender_role,
    isDJ: is_dj,
  })
}
