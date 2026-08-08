/**
 * Strict filename sanitization for Supabase Storage object keys.
 * Strips accents, spaces, and special characters to prevent URL corruption.
 */

/** Normalize Unicode (strip accents), then keep only safe path characters. */
export function sanitizeStorageSegment(raw: string): string {
  const withoutExt = raw.replace(/\.[^.]+$/, '')
  const ascii = withoutExt
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/æ/g, 'ae')
    .replace(/œ/g, 'oe')
    .replace(/ø/g, 'o')
    .replace(/ð/g, 'd')
    .replace(/þ/g, 'th')

  const cleaned = ascii
    .replace(/[''`]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[_.-]+|[_.-]+$/g, '')
    .slice(0, 80)

  return cleaned || 'track'
}

export function storageExtension(fileName: string): 'mp3' | 'mp4' | null {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (ext === 'mp3' || ext === 'mp4') return ext
  return null
}

/** Build a unique, URL-safe storage object path: `{ext}/{timestamp}-{rand}-{slug}.{ext}` */
export function buildSanitizedStoragePath(fileName: string, ext: 'mp3' | 'mp4'): string {
  const slug = sanitizeStorageSegment(fileName)
  const stamp = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 8)
  return `${ext}/${stamp}-${rand}-${slug}.${ext}`
}
