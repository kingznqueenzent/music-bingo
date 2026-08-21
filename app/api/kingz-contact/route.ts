import { NextResponse } from 'next/server'
import { sendKingzContactEmail } from '@/lib/kingz/send-contact-email'

type Body = {
  name?: string
  email?: string
  phone?: string
  message?: string
  preferredDate?: string
  eventType?: string
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
  const phone = body.phone?.trim() || undefined
  const message = body.message?.trim() ?? ''
  const preferredDate = body.preferredDate?.trim() || undefined
  const eventType = body.eventType?.trim() || undefined

  if (!name || !email || !message) {
    return NextResponse.json(
      { ok: false, error: 'Name, email, and message are required.' },
      { status: 400 }
    )
  }

  const emailResult = await sendKingzContactEmail({
    name,
    email,
    phone,
    message,
    preferredDate,
    eventType,
  })

  if (!emailResult.ok) {
    console.warn('[kingz_contact] email failed:', emailResult.error)
    return NextResponse.json(
      {
        ok: false,
        emailed: false,
        error: 'Unable to send your inquiry right now. Please try again later.',
      },
      { status: 503 }
    )
  }

  return NextResponse.json({
    ok: true,
    emailed: true,
  })
}
