const DEFAULT_TO = 'kingzandqueenzentertainment@gmail.com'

export type VenueBookingPayload = {
  venueName: string
  contact: string
  packageId: string
  packageLabel: string
  notes?: string
}

export async function sendVenueBookingEmail(
  payload: VenueBookingPayload
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const to = process.env.VENUE_BOOKING_NOTIFY_TO?.trim() || DEFAULT_TO
  const from =
    process.env.RESEND_FROM_EMAIL?.trim() || 'LyricGrid <onboarding@resend.dev>'

  const text = [
    'Venue package booking request',
    `Venue: ${payload.venueName}`,
    `Contact: ${payload.contact}`,
    `Package: ${payload.packageLabel} (${payload.packageId})`,
    payload.notes ? `Notes: ${payload.notes}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  if (!apiKey) {
    console.warn('[venue_booking] RESEND_API_KEY not set; skipping email:', text.replace(/\n/g, ' | '))
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
      subject: `Venue booking — ${payload.packageLabel} — ${payload.venueName}`,
      text,
    }),
  })

  const json = (await res.json().catch(() => ({}))) as { message?: string }
  if (!res.ok) {
    return { ok: false, error: json?.message ?? res.statusText }
  }
  return { ok: true }
}
