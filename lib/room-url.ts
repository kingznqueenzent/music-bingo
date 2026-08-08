/** Canonical public join URL for venue QR / table tents. */
export const LYRICGRID_ORIGIN = 'https://lyricgrid.ca'

export function roomPath(code: string): string {
  return `/room/${encodeURIComponent(code.trim())}`
}

/** Always use production host for printed/stage QR assets. */
export function roomUrl(code: string): string {
  return `${LYRICGRID_ORIGIN}${roomPath(code)}`
}

/** Local/dev join URL for on-device testing. */
export function localJoinUrl(code: string, origin: string): string {
  return `${origin.replace(/\/$/, '')}/join?code=${encodeURIComponent(code.trim())}`
}
