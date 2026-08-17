import { isUncategorizedSong } from '@/lib/media/is-uncategorized-song'
import type { CatalogSong } from '@/app/media-manager/types'
import { MEDIA_MANAGER_GENRE_ROWS } from '@/lib/decade-theme-catalog'
import {
  type LibraryGenreFilterId,
  songMatchesGenreFilter,
} from '@/lib/media/detect-genre'

export type LibraryView = 'all' | 'uncategorized'

export type CatalogFilterState = {
  libraryView: LibraryView
  selectedThemeFilter: string
  selectedGenreFilter: string
  /** Tab filter: all | Reggae | Dancehall | … | other */
  libraryGenreFilter?: LibraryGenreFilterId
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
    song.genre ?? '',
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

  const libraryGenre = filters.libraryGenreFilter ?? 'all'
  if (libraryGenre !== 'all') {
    result = result.filter((s) =>
      songMatchesGenreFilter(
        s,
        s.theme_id ? themeNameById.get(s.theme_id) : null,
        libraryGenre
      )
    )
  } else if (filters.selectedGenreFilter) {
    const row = MEDIA_MANAGER_GENRE_ROWS.find((r) => r.label === filters.selectedGenreFilter)
    result = result.filter((s) => {
      const themeName = s.theme_id ? themeNameById.get(s.theme_id) ?? '' : ''
      if (
        songMatchesGenreFilter(s, themeName, filters.selectedGenreFilter as LibraryGenreFilterId)
      ) {
        return true
      }
      if (!s.theme_id) return false
      if (row) return themeName.includes(row.dbGenre)
      return themeName.toLowerCase().includes(filters.selectedGenreFilter.toLowerCase())
    })
  }

  const q = filters.searchQuery.trim().toLowerCase()
  if (q) {
    result = result.filter((s) => songSearchHaystack(s, themeNameById).includes(q))
  }

  return result
}
