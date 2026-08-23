/** Shared hostname helpers for LyricGrid vs Kingz multi-tenant routing. */

export const LYRICGRID_HOSTS = new Set(['lyricgrid.ca', 'www.lyricgrid.ca'])

export const KINGZ_HOSTS = new Set([
  'kingznqueenzent.ca',
  'www.kingznqueenzent.ca',
  'kingznqueenzent.vercel.app',
])

export const LOCAL_DEV_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]'])

export type DefaultBrand = 'lyricgrid' | 'kingz'

export function normalizeHost(host: string | null | undefined): string | null {
  return host?.split(':')[0]?.toLowerCase() ?? null
}

/** Local dev brand override — defaults to LyricGrid. Set NEXT_PUBLIC_DEFAULT_BRAND=kingz to preview Kingz locally. */
export function getDefaultBrand(): DefaultBrand {
  const brand = process.env.NEXT_PUBLIC_DEFAULT_BRAND?.toLowerCase().trim()
  return brand === 'kingz' ? 'kingz' : 'lyricgrid'
}

export function isLocalDevHost(host: string | null | undefined): boolean {
  const h = normalizeHost(host)
  return h != null && LOCAL_DEV_HOSTS.has(h)
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

/**
 * Hosts where `/` should redirect to `/lyricgrid` (LyricGrid home), not Kingz marketing.
 * Only Kingz production hosts are excluded; localhost and unknown previews default to LyricGrid.
 */
export function isLyricGridPreferredHost(host: string | null | undefined): boolean {
  if (isKingzHost(host)) return false
  if (isLyricGridHost(host)) return true
  if (isLocalDevHost(host)) return getDefaultBrand() !== 'kingz'
  return true
}

export function isKingzOverlayPath(pathname: string | null): boolean {
  return pathname === '/kingz/overlay' || (pathname?.startsWith('/kingz/overlay/') ?? false)
}

/** Kingz marketing chrome applies only on Kingz hosts at `/` or `/kingz`. Overlay is Kingz-only on every host. */
export function isKingzPublicPath(pathname: string | null, host?: string | null): boolean {
  if (isKingzOverlayPath(pathname)) return true
  if (pathname !== '/' && pathname !== '/kingz') return false
  if (isLyricGridHost(host)) return false
  if (isKingzHost(host)) return true
  if (isLocalDevHost(host)) return getDefaultBrand() === 'kingz'
  return false
}
