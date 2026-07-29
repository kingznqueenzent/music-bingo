import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.toLowerCase().trim() // e.g. YOUR_EMAIL@HERE.COM
const ADMIN_COOKIE = 'admin_verified'

const ADMIN_PATHS = ['/host', '/media']
const ADMIN_PATH_PREFIXES = ['/host/', '/media/']

const LYRICGRID_HOSTS = new Set(['lyricgrid.ca', 'www.lyricgrid.ca'])

function isAdminPath(pathname: string): boolean {
  if (ADMIN_PATHS.includes(pathname)) return true
  return ADMIN_PATH_PREFIXES.some((p) => pathname.startsWith(p))
}

function hostName(request: NextRequest): string | null {
  return request.headers.get('host')?.split(':')[0]?.toLowerCase() ?? null
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const host = hostName(request)

  if (host && LYRICGRID_HOSTS.has(host) && pathname === '/') {
    return NextResponse.redirect(new URL('/lyricgrid', request.url))
  }

  if (!isAdminPath(pathname)) {
    return NextResponse.next()
  }

  if (!ADMIN_EMAIL) {
    return NextResponse.next()
  }

  const cookie = request.cookies.get(ADMIN_COOKIE)?.value
  if (cookie === '1') {
    return NextResponse.next()
  }

  const loginUrl = new URL('/admin-login', request.url)
  loginUrl.searchParams.set('from', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/', '/host/:path*', '/media/:path*'],
}
