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

/**
 * Official LyricGrid / Base44-style PascalCase URLs → App Router paths.
 * @see https://lyricgrid.ca
 */
const OFFICIAL_PATH_ALIASES: Record<string, string> = {
  '/Home': '/lyricgrid',
  '/Play': '/play',
  '/Playlists': '/playlists',
  '/HostDashboard': '/host',
  '/HostGame': '/host',
  '/KingzControl': '/kingz-control',
  '/MediaManager': '/media-manager',
  '/Stage': '/stage',
  '/Leaderboard': '/leaderboard',
  '/PlayerProfile': '/profile',
  '/Sitemap': '/sitemap',
}

function isProtectedAdminPath(pathname: string): boolean {
  if (ADMIN_EXACT_PATHS.has(pathname)) return true
  return ADMIN_PREFIXES.some((p) => pathname.startsWith(p))
}

function hostName(request: NextRequest): string | null {
  return request.headers.get('host')?.split(':')[0]?.toLowerCase() ?? null
}

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  const host = hostName(request)
  const gameId = searchParams.get('game')?.trim()

  // Stage / HostGame support ?game=GAME_ID → live route
  if ((pathname === '/Stage' || pathname === '/stage') && gameId) {
    return NextResponse.redirect(new URL(`/stage/${encodeURIComponent(gameId)}`, request.url))
  }
  if ((pathname === '/HostGame' || pathname === '/host/game') && gameId) {
    return NextResponse.redirect(new URL(`/host/${encodeURIComponent(gameId)}`, request.url))
  }

  // Venue short link: /room/CODE → /join?code=CODE
  const roomMatch = pathname.match(/^\/room\/([^/]+)\/?$/i)
  if (roomMatch?.[1]) {
    const join = new URL('/join', request.url)
    join.searchParams.set('code', decodeURIComponent(roomMatch[1]))
    return NextResponse.redirect(join)
  }

  const aliasTarget = OFFICIAL_PATH_ALIASES[pathname]
  if (aliasTarget) {
    const url = request.nextUrl.clone()
    url.pathname = aliasTarget
    return NextResponse.redirect(url)
  }

  // Legacy /media → catalog Media Manager (preserve ?theme= etc.)
  if (pathname === '/media') {
    const url = request.nextUrl.clone()
    url.pathname = '/media-manager'
    return NextResponse.redirect(url)
  }

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
  // Keep query string (e.g. ?theme=…) so post-login return lands on the same filter.
  const from = `${pathname}${request.nextUrl.search}`
  loginUrl.searchParams.set('from', from)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    '/',
    '/host',
    '/host/:path*',
    '/media',
    '/media/:path*',
    '/media-manager',
    '/kingz-control',
    '/sitemap',
    '/playlists',
    '/room/:path*',
    '/Home',
    '/Play',
    '/Playlists',
    '/HostDashboard',
    '/HostGame',
    '/host/game',
    '/KingzControl',
    '/MediaManager',
    '/Stage',
    '/stage',
    '/Leaderboard',
    '/PlayerProfile',
    '/Sitemap',
  ],
}
