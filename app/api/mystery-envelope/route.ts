import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyHostPrize } from '@/lib/game-session'

/**
 * Base44 sendMysteryEnvelopeEmail — stub until transactional email is configured.
 * Accepts envelope reveal payloads so UI flows never 404.
 */
export async function POST(req: NextRequest) {
  let body: {
    gameId?: string
    cardId?: string
    playerName?: string
    playerEmail?: string
    sponsorName?: string
    prizeLabel?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const { gameId, cardId, playerName, playerEmail, sponsorName, prizeLabel } = body
  if (!gameId || !playerName?.trim()) {
    return NextResponse.json({ ok: false, error: 'Missing gameId or playerName' }, { status: 400 })
  }

  const supabase = createClient()
  if (cardId) {
    await notifyHostPrize(supabase, gameId, {
      cardId,
      playerName: playerName.trim(),
      prizeId: prizeLabel ?? 'mystery_envelope',
      claimEmail: playerEmail ?? null,
    })
  }

  const emailConfigured = Boolean(
    process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY || process.env.SMTP_HOST
  )

  if (!emailConfigured) {
    console.info('[mystery-envelope] stub — email not configured', {
      gameId,
      playerName,
      sponsorName,
      prizeLabel,
    })
    return NextResponse.json({
      ok: true,
      stub: true,
      message: 'Mystery envelope recorded; email delivery not configured yet.',
    })
  }

  // Future: wire Resend/SendGrid here
  return NextResponse.json({
    ok: true,
    stub: true,
    message: 'Email provider detected but sender not implemented — event logged only.',
  })
}
