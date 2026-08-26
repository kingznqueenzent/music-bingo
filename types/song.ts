/**
 * Catalog song fields used by Media Manager and songs APIs.
 * `year` is an integer column on public.songs (nullable).
 */
export type Song = {
  id: string
  title: string
  artist?: string | null
  year?: string | number | null
  genre?: string | null
  theme_id?: string | null
  media_type?: string
  media_url?: string | null
  youtube_url?: string | null
  storage_path?: string | null
}

const YEAR_MIN = 1900
const YEAR_MAX = 2100

/** Parse a year input for songs.year. Empty / invalid → null. */
export function parseSongYear(raw: string | number | null | undefined): number | null {
  if (raw == null || raw === '') return null
  const n = typeof raw === 'number' ? raw : Number.parseInt(String(raw).trim(), 10)
  if (!Number.isFinite(n)) return null
  if (n < YEAR_MIN || n > YEAR_MAX) return null
  return Math.trunc(n)
}
