import { NextRequest, NextResponse } from 'next/server'

const ADMIN_COOKIE = 'admin_verified'

function normalize(s: string): string {
  return (s ?? '').replace(/\r/g, '').replace(/\s/g, '').replace(/^["']+|["']+$/g, '').toLowerCase().trim()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const inputEmail = normalize((body?.email as string) ?? '')
    const inputSecret = (body?.secret as string)?.trim() ?? ''

    const rawEmail = process.env.ADMIN_EMAIL ?? ''
    const rawSecret = process.env.ADMIN_SECRET ?? ''
    const expectedEmail = normalize(rawEmail)
    const expectedSecret = rawSecret.replace(/\r/g, '').replace(/^["'\s]+|["'\s]+$/g, '').trim()

    if (!expectedEmail || !expectedSecret) {
      return NextResponse.json(
        { error: 'Admin not configured. Set ADMIN_EMAIL and ADMIN_SECRET in .env.local, then restart the dev server.' },
        { status: 503 }
      )
    }

    if (inputEmail !== expectedEmail) {
      const hint =
        process.env.NODE_ENV === 'development'
          ? ` (expected length: ${expectedEmail.length}, got: ${inputEmail.length})`
          : ''
      return NextResponse.json(
        {
          error: 'Invalid email. Use the exact address from .env.local line 14 (ADMIN_EMAIL).' + hint,
        },
        { status: 401 }
      )
    }
    if (inputSecret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Invalid secret. Use the exact password from .env.local line 15 (ADMIN_SECRET).' },
        { status: 401 }
      )
    }

    const from = (body?.from as string)?.trim() || '/host'
    const response = NextResponse.json({ ok: true, redirect: from })
    response.cookies.set(ADMIN_COOKIE, '1', {
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
    })
    return response
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
