/** Shared hostname helpers for LyricGrid vs Kingz multi-tenant routing. */

export const LYRICGRID_HOSTS = new Set(['lyricgrid.ca', 'www.lyricgrid.ca'])

export const KINGZ_HOSTS = new Set([
  'kingznqueenzent.ca',
  'www.kingznqueenzent.ca',
  'kingznqueenzent.vercel.app',
])

export function normalizeHost(host: string | null | undefined): string | null {
  return host?.split(':')[0]?.toLowerCase() ?? null
}

export function isLyricGridHost(host: string | null | undefined): boolean {
  const h = normalizeHost(host)
  return h != null && LYRICGRID_HOSTS.has(h)
}

export function isKingzHost(host: string | null | undefined): boolean {
  const h = normalizeHost(host)
  if (!h) return false
  if (KINGZ_HOSTS.has(h)) return true
  return h.startsWith('kingznqueenzent-') && h.endsWith('.vercel.app')
}

/** Kingz marketing chrome applies only on Kingz hosts at `/` or `/kingz`. */
export function isKingzPublicPath(pathname: string | null, host?: string | null): boolean {
  if (isLyricGridHost(host)) return false
  if (isKingzHost(host)) return pathname === '/' || pathname === '/kingz'
  // Localhost / generic Vercel previews: Kingz owns `/` in this monorepo deploy.
  return pathname === '/' || pathname === '/kingz'
}
