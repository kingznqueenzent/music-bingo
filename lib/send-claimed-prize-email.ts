/**
 * Sends prize-claim notification via Resend (https://resend.com).
 * Set RESEND_API_KEY and optionally RESEND_FROM_EMAIL, PRIZE_CLAIM_NOTIFY_TO.
 */

const DEFAULT_NOTIFY_TO = 'kingzandqueenzentertainment@gmail.com'

export type ClaimedPrizeEmailPayload = {
  winner_name: string
  prize_id: string
  claim_email: string
  claim_phone: string | null
  game_id: string
  claimed_at: string
}

function buildBody(p: ClaimedPrizeEmailPayload): string {
  return [
    `Winner name: ${p.winner_name}`,
    `Prize ID: ${p.prize_id}`,
    `Claim email: ${p.claim_email}`,
    `Claim phone: ${p.claim_phone ?? '—'}`,
    `Game ID: ${p.game_id}`,
    `Claimed at: ${p.claimed_at}`,
  ].join('\n')
}

export async function sendClaimedPrizeNotificationEmail(
  payload: ClaimedPrizeEmailPayload
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const to = process.env.PRIZE_CLAIM_NOTIFY_TO?.trim() || DEFAULT_NOTIFY_TO
  const from =
    process.env.RESEND_FROM_EMAIL?.trim() || 'LyricGrid <onboarding@resend.dev>'

  const subject = `🎉 New Prize Claim — ${payload.winner_name}`
  const text = buildBody(payload)

  if (!apiKey) {
    console.warn(
      '[claimed_prize] RESEND_API_KEY not set; skipping email. Payload:',
      text.replace(/\n/g, ' | ')
    )
    return { ok: false, error: 'RESEND_API_KEY not configured' }
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
    }),
  })

  const json = (await res.json().catch(() => ({}))) as { message?: string; id?: string }
  if (!res.ok) {
    const err = json?.message ?? res.statusText
    console.error('[claimed_prize] Resend error:', err)
    return { ok: false, error: err }
  }

  return { ok: true }
}
