import { sanitizeStorageSegment } from '@/lib/media/sanitize-storage-filename'

const DEFAULT_ARTIST = 'Unknown Artist'
const DEFAULT_THEME = 'Uncategorized'

export type SongPathMetadata = {
  themeName: string
  artist: string | null
}

/** Paths imported via `import-local-library.ts` — theme + artist segments. */
export function isLibraryStoragePath(storagePath: string): boolean {
  return storagePath.startsWith('library/')
}

/** Paths imported via `import-backup-tracks.ts` — theme segment only. */
export function isBackupImportStoragePath(storagePath: string): boolean {
  return storagePath.startsWith('backup-import/')
}

export function isHierarchicalStoragePath(storagePath: string): boolean {
  return isLibraryStoragePath(storagePath) || isBackupImportStoragePath(storagePath)
}

export function buildLibraryStoragePath(meta: SongPathMetadata, fileBasename: string): string {
  const themeSlug = sanitizeStorageSegment(meta.themeName || DEFAULT_THEME)
  const artistSlug = sanitizeStorageSegment(meta.artist?.trim() || DEFAULT_ARTIST)
  return `library/${themeSlug}/${artistSlug}/${fileBasename}`
}

export function buildBackupImportStoragePath(themeName: string, filename: string): string {
  const themeSlug = sanitizeStorageSegment(themeName || DEFAULT_THEME)
  return `backup-import/${themeSlug}/${filename}`
}

function extractLibraryFileBasename(path: string): string | null {
  const parts = path.split('/')
  if (parts.length < 4 || parts[0] !== 'library') return null
  return parts.slice(3).join('/')
}

function extractBackupImportFilename(path: string): string | null {
  const parts = path.split('/')
  if (parts.length < 3 || parts[0] !== 'backup-import') return null
  return parts.slice(2).join('/')
}

/**
 * Recompute the storage object key for hierarchical library paths when theme/artist change.
 * Returns null when the path layout is not theme/artist-based (e.g. direct Media Manager uploads).
 */
export function computeTargetStoragePath(
  currentPath: string,
  meta: SongPathMetadata
): string | null {
  if (isLibraryStoragePath(currentPath)) {
    const basename = extractLibraryFileBasename(currentPath)
    if (!basename) return null
    return buildLibraryStoragePath(meta, basename)
  }

  if (isBackupImportStoragePath(currentPath)) {
    const filename = extractBackupImportFilename(currentPath)
    if (!filename) return null
    return buildBackupImportStoragePath(meta.themeName, filename)
  }

  return null
}

export function storagePathWouldChange(currentPath: string, meta: SongPathMetadata): boolean {
  const target = computeTargetStoragePath(currentPath, meta)
  if (!target) return false
  return target !== currentPath
}
