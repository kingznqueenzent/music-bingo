import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { sendVenueBookingEmail } from '@/lib/send-venue-booking-email'

const PACKAGES: Record<string, string> = {
  basic: 'Basic',
  pro: 'Pro',
  premium: 'Premium',
}

export async function POST(req: Request) {
  const supabase = createClient()
  if (!(await isFeatureEnabled(supabase, 'venue_packages'))) {
    return NextResponse.json({ ok: false, error: 'Not available' }, { status: 404 })
  }

  let body: { venueName?: string; contact?: string; packageId?: string; notes?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const venueName = body.venueName?.trim() ?? ''
  const contact = body.contact?.trim() ?? ''
  const packageId = body.packageId?.trim() ?? ''
  if (!venueName || !contact || !packageId) {
    return NextResponse.json({ ok: false, error: 'Venue name, contact, and package are required.' }, { status: 400 })
  }

  const packageLabel = PACKAGES[packageId] ?? packageId
  const emailResult = await sendVenueBookingEmail({
    venueName,
    contact,
    packageId,
    packageLabel,
    notes: body.notes?.trim(),
  })

  return NextResponse.json({
    ok: true,
    emailed: emailResult.ok,
    emailError: emailResult.error,
  })
}
