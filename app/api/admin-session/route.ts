import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ADMIN_COOKIE, isAdminCookieValue } from '@/lib/admin-access'

/** Lets the client show admin-only UI (cookie is httpOnly). */
export async function GET() {
  const jar = await cookies()
  const isAdmin = isAdminCookieValue(jar.get(ADMIN_COOKIE)?.value)
  return NextResponse.json({ isAdmin })
}
