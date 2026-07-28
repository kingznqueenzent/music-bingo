import { NextRequest, NextResponse } from 'next/server'
import { sendClaimedPrizeNotificationEmail } from '@/lib/send-claimed-prize-email'

/**
 * Supabase Database Webhook target for INSERT on public.claimed_prizes.
 * Dashboard: Database → Webhooks → Create → table claimed_prizes, INSERT only,
 * URL: https://<your-domain>/api/webhooks/claimed-prize
 * HTTP Headers: X-Webhook-Secret: <CLAIMED_PRIZE_WEBHOOK_SECRET>
 */

type SupabaseWebhookPayload = {
  type?: string
  table?: string
  schema?: string
  record?: {
    id?: string
    winner_name?: string
    prize_id?: string
    claim_email?: string
    claim_phone?: string | null
    game_id?: string
    claimed_at?: string
  }
}

export async function POST(request: NextRequest) {
  const secret = process.env.CLAIMED_PRIZE_WEBHOOK_SECRET?.trim()
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: 'CLAIMED_PRIZE_WEBHOOK_SECRET is not configured' },
      { status: 503 }
    )
  }
  const got = request.headers.get('x-webhook-secret')?.trim()
  if (got !== secret) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let body: SupabaseWebhookPayload
  try {
    body = (await request.json()) as SupabaseWebhookPayload
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  if (body.type !== 'INSERT' || body.table !== 'claimed_prizes' || !body.record) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const r = body.record
  const winnerName = r.winner_name?.trim()
  const prizeId = r.prize_id
  const claimEmail = r.claim_email?.trim()
  const gameId = r.game_id
  const claimedAt = r.claimed_at ?? new Date().toISOString()

  if (!winnerName || !prizeId || !claimEmail || !gameId) {
    return NextResponse.json({ ok: false, error: 'Missing required fields on record' }, { status: 400 })
  }

  const result = await sendClaimedPrizeNotificationEmail({
    winner_name: winnerName,
    prize_id: prizeId,
    claim_email: claimEmail,
    claim_phone: r.claim_phone ?? null,
    game_id: gameId,
    claimed_at: claimedAt,
  })

  if (!result.ok && result.error === 'RESEND_API_KEY not configured') {
    return NextResponse.json({ ok: true, emailed: false, warning: result.error })
  }
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 })
  }

  return NextResponse.json({ ok: true, emailed: true })
}
