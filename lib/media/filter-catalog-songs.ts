import { isUncategorizedSong } from '@/lib/media/is-uncategorized-song'
import type { CatalogSong } from '@/app/media-manager/types'
import { MEDIA_MANAGER_GENRE_ROWS } from '@/lib/decade-theme-catalog'

export type LibraryView = 'all' | 'uncategorized'

export type CatalogFilterState = {
  libraryView: LibraryView
  selectedThemeFilter: string
  selectedGenreFilter: string
  searchQuery: string
}

function songSearchHaystack(
  song: CatalogSong,
  themeNameById: Map<string, string>
): string {
  const theme = song.theme_id ? themeNameById.get(song.theme_id) ?? '' : ''
  return [
    song.title,
    song.artist ?? '',
    theme,
    song.media_url ?? '',
    song.youtube_url ?? '',
    song.storage_path ?? '',
  ]
    .join(' ')
    .toLowerCase()
}

/** Apply library view, theme/genre filters, and real-time search. */
export function filterCatalogSongs(
  songs: CatalogSong[],
  themeNameById: Map<string, string>,
  filters: CatalogFilterState
): CatalogSong[] {
  let result = songs

  if (filters.libraryView === 'uncategorized' || filters.selectedThemeFilter === 'uncategorized') {
    result = result.filter((s) => isUncategorizedSong(s, themeNameById))
  } else if (filters.selectedThemeFilter === 'unassigned') {
    result = result.filter((s) => !s.theme_id)
  } else if (filters.selectedThemeFilter) {
    result = result.filter((s) => s.theme_id === filters.selectedThemeFilter)
  }

  if (filters.selectedGenreFilter) {
    const row = MEDIA_MANAGER_GENRE_ROWS.find((r) => r.label === filters.selectedGenreFilter)
    result = result.filter((s) => {
      if (!s.theme_id) return false
      const name = themeNameById.get(s.theme_id) ?? ''
      if (row) return name.includes(row.dbGenre)
      return name.toLowerCase().includes(filters.selectedGenreFilter.toLowerCase())
    })
  }

  const q = filters.searchQuery.trim().toLowerCase()
  if (q) {
    result = result.filter((s) => songSearchHaystack(s, themeNameById).includes(q))
  }

  return result
}
