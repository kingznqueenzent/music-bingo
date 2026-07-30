import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ADMIN_COOKIE, isAdminCookieValue } from '@/lib/admin-access'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.toLowerCase().trim()

const ADMIN_EXACT_PATHS = new Set([
  '/host',
  '/media',
  '/media-manager',
  '/kingz-control',
  '/sitemap',
  '/playlists',
])

const ADMIN_PREFIXES = ['/host/', '/media/']

const LYRICGRID_HOSTS = new Set(['lyricgrid.ca', 'www.lyricgrid.ca'])

function isProtectedAdminPath(pathname: string): boolean {
  if (ADMIN_EXACT_PATHS.has(pathname)) return true
  return ADMIN_PREFIXES.some((p) => pathname.startsWith(p))
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

  if (!isProtectedAdminPath(pathname)) {
    return NextResponse.next()
  }

  if (!ADMIN_EMAIL) {
    return NextResponse.next()
  }

  const cookie = request.cookies.get(ADMIN_COOKIE)?.value
  if (isAdminCookieValue(cookie)) {
    return NextResponse.next()
  }

  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('from', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    '/',
    '/host/:path*',
    '/media/:path*',
    '/media-manager',
    '/kingz-control',
    '/sitemap',
    '/playlists',
  ],
}
