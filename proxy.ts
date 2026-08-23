import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ADMIN_COOKIE, isAdminCookieValue } from '@/lib/admin-access'
import { isKingzHost, isLyricGridPreferredHost, normalizeHost } from '@/lib/site-host'

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

const KINGZ_WWW_HOST = 'www.kingznqueenzent.ca'
const KINGZ_APEX_ORIGIN = 'https://kingznqueenzent.ca'

/**
 * Official PascalCase URL aliases → App Router paths.
 * On LyricGrid hosts, /Home → /lyricgrid; on Kingz hosts, /Home → /.
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

/** Public Kingz marketing + its own contact API. Everything else is LyricGrid/bingo. */
const KINGZ_ALLOWED_EXACT = new Set([
  '/',
  '/kingz',
  '/kingz/overlay',
  '/robots.txt',
  '/sitemap.xml',
  '/icon.png',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/manifest.webmanifest',
])

const KINGZ_ALLOWED_PREFIXES = ['/assets/', '/_next/', '/api/kingz-contact']

function isProtectedAdminPath(pathname: string): boolean {
  if (ADMIN_EXACT_PATHS.has(pathname)) return true
  return ADMIN_PREFIXES.some((p) => pathname.startsWith(p))
}

function hostName(request: NextRequest): string | null {
  return normalizeHost(request.headers.get('host'))
}

function isKingzAllowedPath(pathname: string): boolean {
  if (KINGZ_ALLOWED_EXACT.has(pathname)) return true
  if (pathname === '/api/kingz-contact') return true
  return KINGZ_ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

/**
 * Kingz and LyricGrid share this repo / Next.js app.
 * Do not delete bingo files here — that would break lyricgrid.ca.
 * On Kingz hosts, bingo routes must never render.
 */
function kingzIsolatedResponse(request: NextRequest): NextResponse {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta name="robots" content="noindex, nofollow"/>
  <title>Page not found — Kingz &amp; Queenz Entertainment</title>
  <style>
    body{margin:0;min-height:100dvh;display:flex;align-items:center;justify-content:center;background:#050505;color:#f5f5f5;font-family:system-ui,sans-serif}
    main{text-align:center;padding:2rem;max-width:28rem}
    p.kicker{color:#D4AF37;letter-spacing:.25em;text-transform:uppercase;font-size:.75rem;margin:0 0 .75rem}
    h1{font-size:1.75rem;margin:0 0 1rem}
    p{color:#c8c8c8;line-height:1.5}
    a{color:#D4AF37}
  </style>
</head>
<body>
  <main>
    <p class="kicker">404</p>
    <h1>Page not found</h1>
    <p>This page is not part of Kingz &amp; Queenz Entertainment.</p>
    <p><a href="/">Back to home</a></p>
  </main>
</body>
</html>`

  return new NextResponse(html, {
    status: 404,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'x-robots-tag': 'noindex, nofollow',
    },
  })
}

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  const host = hostName(request)
  const gameId = searchParams.get('game')?.trim()

  // Kingz www → apex only. Before isolation 404s so www still redirects cleanly.
  // Do not apply to lyricgrid.ca, localhost, or unrelated Vercel hosts.
  if (host === KINGZ_WWW_HOST) {
    return NextResponse.redirect(
      new URL(`${pathname}${request.nextUrl.search}`, KINGZ_APEX_ORIGIN),
      308
    )
  }

  if (isKingzHost(host)) {
    if (pathname === '/Home' || pathname === '/home') {
      return NextResponse.redirect(new URL('/', request.url))
    }
    // Duplicate of apex home — Kingz hosts only (lyricgrid.ca keeps /kingz as-is).
    if (pathname === '/kingz' || pathname === '/kingz/') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url, 308)
    }
    if (isKingzAllowedPath(pathname)) {
      return NextResponse.next()
    }
    return kingzIsolatedResponse(request)
  }

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

  if (host && isLyricGridPreferredHost(host) && pathname === '/') {
    return NextResponse.redirect(new URL('/lyricgrid', request.url))
  }

  if (host && isLyricGridPreferredHost(host) && (pathname === '/kingz' || pathname === '/kingz/')) {
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
    /*
     * Isolate Kingz hosts on every app/API path.
     * Static hashed assets and common image files skip this proxy.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:ico|png|jpg|jpeg|gif|webp|svg|woff2?)$).*)',
  ],
}
