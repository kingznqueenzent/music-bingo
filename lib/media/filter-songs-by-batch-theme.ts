import type { BatchThemeFilter } from '@/app/media-manager/MediaManagerFilterBar'
import type { CatalogSong } from '@/app/media-manager/types'

/** Filter catalog rows by import-batch style themes (Country, Rock, Billboard). */
export function filterSongsByBatchTheme(
  songs: CatalogSong[],
  themeNameById: Map<string, string>,
  batchFilter: BatchThemeFilter
): CatalogSong[] {
  if (batchFilter === 'all') return songs

  return songs.filter((song) => {
    const themeName = song.theme_id ? themeNameById.get(song.theme_id) ?? '' : ''
    const lower = themeName.toLowerCase()

    if (batchFilter === 'billboard') {
      return lower === 'billboard'
    }
    if (batchFilter === 'rock') {
      return lower === 'rock' || lower.endsWith(' rock') || lower.includes(' rock ')
    }
    if (batchFilter === 'country') {
      return lower.includes('country')
    }
    return true
  })
}
