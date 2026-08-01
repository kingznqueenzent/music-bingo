/** LyricGrid decade × genre theme catalog (matches DB seed). */

export const DECADES_70S_2020S = ['70s', '80s', '90s', '2000s', '2010s', '2020s'] as const
export const DECADES_80S_2020S = ['80s', '90s', '2000s', '2010s', '2020s'] as const
export const DECADES_50S_2020S = ['50s', '60s', '70s', '80s', '90s', '2000s', '2010s', '2020s'] as const

export const GENRES_70S_2020S = [
  'Country',
  'R&B',
  'Hip-Hop',
  'Reggae',
  'Dancehall Reggae',
  'Funk',
  'Pop',
] as const

export const GENRE_AFROBEATS = 'Afrobeats' as const
export const GENRE_ROCK = 'Rock' as const
export const GENRE_DANCE = 'Dance' as const

export function decadeLabelFromYear(year: number): string | null {
  if (!Number.isFinite(year)) return null
  if (year >= 2020 && year <= 2029) return '2020s'
  if (year >= 2010 && year <= 2019) return '2010s'
  if (year >= 2000 && year <= 2009) return '2000s'
  if (year >= 1990 && year <= 1999) return '90s'
  if (year >= 1980 && year <= 1989) return '80s'
  if (year >= 1970 && year <= 1979) return '70s'
  if (year >= 1960 && year <= 1969) return '60s'
  if (year >= 1950 && year <= 1959) return '50s'
  return null
}

export function buildDecadeThemeName(decade: string, genre: string): string {
  return `${decade} ${genre}`
}

/** All seeded theme names in display_order sequence. */
export function allDecadeThemeNames(): string[] {
  const names: string[] = []
  for (const genre of GENRES_70S_2020S) {
    for (const decade of DECADES_70S_2020S) {
      names.push(buildDecadeThemeName(decade, genre))
    }
  }
  for (const decade of DECADES_80S_2020S) {
    names.push(buildDecadeThemeName(decade, GENRE_AFROBEATS))
  }
  for (const decade of DECADES_50S_2020S) {
    names.push(buildDecadeThemeName(decade, GENRE_ROCK))
    names.push(buildDecadeThemeName(decade, GENRE_DANCE))
  }
  return names
}

export function isValidDecadeTheme(decade: string, genre: string): boolean {
  if (genre === GENRE_AFROBEATS) {
    return (DECADES_80S_2020S as readonly string[]).includes(decade)
  }
  if (genre === GENRE_ROCK || genre === GENRE_DANCE) {
    return (DECADES_50S_2020S as readonly string[]).includes(decade)
  }
  if ((GENRES_70S_2020S as readonly string[]).includes(genre)) {
    return (DECADES_70S_2020S as readonly string[]).includes(decade)
  }
  return false
}

export function themeNameFromYearAndGenre(
  year: number | null,
  genre: string | null,
  decadeOverride?: string | null
): string | null {
  const decade = decadeOverride ?? (year != null ? decadeLabelFromYear(year) : null)
  if (!decade || !genre) return null
  if (!isValidDecadeTheme(decade, genre)) return null
  return buildDecadeThemeName(decade, genre)
}

/** Genre × decade rows for Media Manager coverage sidebar. */
export type MediaManagerGenreRow = {
  label: string
  dbGenre: string
  decades: readonly string[]
}

export const MEDIA_MANAGER_GENRE_ROWS: MediaManagerGenreRow[] = [
  ...GENRES_70S_2020S.map((genre) => ({
    label: genre === 'Dancehall Reggae' ? 'Dancehall' : genre,
    dbGenre: genre,
    decades: DECADES_70S_2020S,
  })),
  { label: GENRE_AFROBEATS, dbGenre: GENRE_AFROBEATS, decades: DECADES_80S_2020S },
  { label: GENRE_ROCK, dbGenre: GENRE_ROCK, decades: DECADES_50S_2020S },
  { label: GENRE_DANCE, dbGenre: GENRE_DANCE, decades: DECADES_50S_2020S },
]
