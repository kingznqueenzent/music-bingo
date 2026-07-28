import { NextResponse } from 'next/server'
import { sendVenueBookingEmail } from '@/lib/send-venue-booking-email'

type Body = {
  name?: string
  email?: string
  phone?: string
  message?: string
  preferredDate?: string
}

export async function POST(req: Request) {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const name = body.name?.trim() ?? ''
  const email = body.email?.trim() ?? ''
  const phone = body.phone?.trim() ?? ''
  const message = body.message?.trim() ?? ''

  if (!name || !email || !phone || !message) {
    return NextResponse.json(
      { ok: false, error: 'Name, email, phone, and message are required.' },
      { status: 400 }
    )
  }

  const dateLine = body.preferredDate?.trim()
    ? `Preferred date: ${body.preferredDate}`
    : ''

  const notes = [message, dateLine, `Reply to: ${email}`, `Phone: ${phone}`]
    .filter(Boolean)
    .join('\n\n')

  const emailResult = await sendVenueBookingEmail({
    venueName: name,
    contact: `${email} | ${phone}`,
    packageId: 'kingz-inquiry',
    packageLabel: 'Kingz & Queenz Booking Inquiry',
    notes,
  })

  return NextResponse.json({
    ok: true,
    emailed: emailResult.ok,
    emailError: emailResult.error,
  })
}
