import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const ADMIN_COOKIE = 'admin_verified'

/** Lets the client show admin-only UI (cookie is httpOnly). */
export async function GET() {
  const jar = await cookies()
  const isAdmin = jar.get(ADMIN_COOKIE)?.value === '1'
  return NextResponse.json({ isAdmin })
}
