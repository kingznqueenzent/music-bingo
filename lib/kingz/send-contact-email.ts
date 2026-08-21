/**
 * Kingz booking-inquiry email via Resend.
 * Isolated from LyricGrid venue-booking mail (do not reuse LyricGrid keys or from-address).
 *
 * Env (kingznqueenzent project only — never NEXT_PUBLIC_, never copy LyricGrid values):
 * - KINGZ_RESEND_API_KEY — Resend API key for Kingz contact mail (required)
 * - KINGZ_RESEND_FROM_EMAIL — verified From on kingznqueenzent.ca (required)
 * - KINGZ_CONTACT_NOTIFY_TO — inbox that receives inquiries
 */

const DEFAULT_TO = 'kingznqueenzentertainment@gmail.com'
const DEFAULT_FROM = 'Kingz & Queenz Entertainment <bookings@kingznqueenzent.ca>'

export type KingzContactPayload = {
  name: string
  email: string
  phone?: string
  message: string
  preferredDate?: string
  eventType?: string
}

function kingzFromAddress(): string {
  const dedicated = process.env.KINGZ_RESEND_FROM_EMAIL?.trim()
  if (dedicated) return dedicated
  return DEFAULT_FROM
}

export async function sendKingzContactEmail(
  payload: KingzContactPayload
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.KINGZ_RESEND_API_KEY?.trim()
  const to = process.env.KINGZ_CONTACT_NOTIFY_TO?.trim() || DEFAULT_TO
  const from = kingzFromAddress()

  const phone = payload.phone?.trim()
  const eventDate = payload.preferredDate?.trim()
  const eventType = payload.eventType?.trim()

  const text = [
    'Kingz & Queenz Entertainment — booking inquiry',
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    phone ? `Phone: ${phone}` : null,
    eventDate ? `Event date: ${eventDate}` : null,
    eventType ? `Event type: ${eventType}` : null,
    `Message: ${payload.message}`,
  ]
    .filter(Boolean)
    .join('\n')

  if (!apiKey) {
    console.warn('[kingz_contact] KINGZ_RESEND_API_KEY not set; skipping email')
    return { ok: false, error: 'KINGZ_RESEND_API_KEY not configured' }
  }

  const visitorEmail = payload.email.trim()

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: visitorEmail,
      subject: `Kingz inquiry — ${payload.name}`,
      text,
    }),
  })

  const json = (await res.json().catch(() => ({}))) as { message?: string }
  if (!res.ok) {
    return { ok: false, error: json?.message ?? res.statusText }
  }
  return { ok: true }
}
