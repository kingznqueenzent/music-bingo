import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  const gameId = searchParams.get('game')?.trim()

  // Stage / HostGame support ?game=GAME_ID → live route
  if ((pathname === '/Stage' || pathname === '/stage') && gameId) {
    return NextResponse.redirect(new URL(`/stage/${encodeURIComponent(gameId)}`, request.url))
  }
  if ((pathname === '/HostGame' || pathname === '/host/game') && gameId) {
    return NextResponse.redirect(new URL(`/host/${encodeURIComponent(gameId)}`, request.url))
  }

  const aliasTarget = OFFICIAL_PATH_ALIASES[pathname]
  if (aliasTarget) {
    const url = request.nextUrl.clone()
    url.pathname = aliasTarget
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
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
