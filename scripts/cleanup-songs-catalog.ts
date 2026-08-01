#!/usr/bin/env node
/**
 * Clean public.songs: delete junk rows and reassign legacy themes to decade-genre taxonomy.
 *
 * Usage: npx tsx scripts/cleanup-songs-catalog.ts
 */
import path from 'path'
import dotenv from 'dotenv'
import {
  allDecadeThemeNames,
  decadeLabelFromYear,
  themeNameFromYearAndGenre,
} from '../lib/decade-theme-catalog'
import {
  autoCategorizeFromKeywords,
  cleanSongTitle,
  parseArtistTitle,
} from '../lib/songAutoCategorizer'
import { buildThemeLookup, resolveThemeId } from '../lib/media/resolve-theme-from-csv'
import { isDecadeThemeName, titleHasYoutubeArtifact } from '../lib/media/decade-theme-assignment'

import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { connectPg } = require('./lib/pg-connect.js')

dotenv.config({ path: path.join(__dirname, '..', '.env.local'), override: true })

type SongRow = {
  id: string
  title: string
  artist: string | null
  year: number | null
  theme_id: string | null
}

type ThemeRow = { id: string; name: string }

function legacyThemeToDecadeName(legacyName: string, year: number | null): string | null {
  const decadeFromName = legacyName.match(/^(50s|60s|70s|80s|90s|2000s|2010s|2020s)/)?.[1] ?? null
  const decade = decadeFromName ?? (year != null ? decadeLabelFromYear(year) : null)
  if (!decade) return null

  const lower = legacyName.toLowerCase()
  if (lower.includes('country')) return `${decade} Country`
  if (lower.includes('hip-hop') || lower.includes('hip hop') || lower.includes('rap')) return `${decade} Hip-Hop`
  if (lower.includes('reggae') && lower.includes('dancehall')) return `${decade} Dancehall Reggae`
  if (lower.includes('reggae')) return `${decade} Reggae`
  if (lower.includes('funk')) return `${decade} Funk`
  if (lower.includes('afro')) return `${decade} Afrobeats`
  if (lower.includes('rock')) return `${decade} Rock`
  if (lower.includes('dance')) return `${decade} Dance`
  if (lower.includes('r&b') || lower.includes('soul') || lower.includes('throwback')) return `${decade} R&B`
  if (lower.includes('hits') || lower.includes('pop') || lower.includes('party')) return `${decade} Pop`

  return `${decade} Pop`
}

function resolveDecadeThemeName(song: SongRow, themeById: Map<string, ThemeRow>): string | null {
  const auto = autoCategorizeFromKeywords(song.title)
  if (auto.theme_name && isDecadeThemeName(auto.theme_name)) return auto.theme_name

  if (song.year != null) {
    const genreFromAuto = auto.theme_name?.replace(/^\d{2,4}s\s/, '') ?? 'Pop'
    const fromYear = themeNameFromYearAndGenre(song.year, genreFromAuto)
    if (fromYear && isDecadeThemeName(fromYear)) return fromYear
  }

  const legacy = song.theme_id ? themeById.get(song.theme_id)?.name : null
  if (legacy && !isDecadeThemeName(legacy)) {
    const mapped = legacyThemeToDecadeName(legacy, song.year)
    if (mapped && isDecadeThemeName(mapped)) return mapped
  }

  return null
}

function cleanedMetadata(title: string, artist: string | null) {
  const withoutArtifact = title.split('·')[0]?.trim() ?? title
  const cleanTitle = cleanSongTitle(withoutArtifact)
  const parsed = parseArtistTitle(cleanTitle)
  return {
    title: parsed.title || cleanTitle || title,
    artist: artist?.trim() || parsed.artist,
  }
}

function isJunkSong(song: SongRow): boolean {
  if (!song.theme_id) return true
  if ((song.artist ?? '').trim().toLowerCase() === 'unknown artist') return true
  if (titleHasYoutubeArtifact(song.title) && song.title.trim().length <= 20) return true
  return false
}

async function main() {
  const rawUrl = process.env.DATABASE_URL?.trim()
  if (!rawUrl) {
    console.error('DATABASE_URL is not set in .env.local.')
    process.exit(1)
  }

  const { client, label } = await connectPg(rawUrl)
  console.log(`Connected via ${label}`)

  const { rows: themes } = await client.query<ThemeRow>(
    `SELECT id, name FROM public.themes ORDER BY display_order NULLS LAST, name`
  )
  const themeById = new Map(themes.map((t) => [t.id, t]))
  const lookup = buildThemeLookup(themes)

  const { rows: songs } = await client.query<SongRow>(
    `SELECT id, title, artist, year, theme_id FROM public.songs ORDER BY created_at`
  )

  let reassigned = 0
  let cleaned = 0
  const deleteIds: string[] = []

  for (const song of songs) {
    const currentTheme = song.theme_id ? themeById.get(song.theme_id)?.name : null
    const onDecadeTheme = Boolean(currentTheme && isDecadeThemeName(currentTheme))

    if (onDecadeTheme) {
      if (titleHasYoutubeArtifact(song.title) || (song.artist ?? '').trim().toLowerCase() === 'unknown artist') {
        const meta = cleanedMetadata(song.title, song.artist)
        await client.query(`UPDATE public.songs SET title = $2, artist = $3 WHERE id = $1`, [
          song.id,
          meta.title,
          meta.artist,
        ])
        cleaned += 1
      }
      continue
    }

    const decadeThemeName = resolveDecadeThemeName(song, themeById)
    const themeId = decadeThemeName ? resolveThemeId(decadeThemeName, lookup) : null
    const meta = cleanedMetadata(song.title, song.artist)

    if (!themeId) {
      if (isJunkSong(song)) deleteIds.push(song.id)
      else console.warn('Manual review needed:', song.id, song.title.slice(0, 80))
      continue
    }

    await client.query(
      `UPDATE public.songs SET theme_id = $2, title = $3, artist = $4 WHERE id = $1`,
      [song.id, themeId, meta.title, meta.artist]
    )
    reassigned += 1
  }

  if (deleteIds.length > 0) {
    const deleted = await client.query(`DELETE FROM public.songs WHERE id = ANY($1::uuid[])`, [deleteIds])
    console.log('Deleted junk rows:', deleted.rowCount)
  } else {
    console.log('Deleted junk rows: 0')
  }

  const stats = await client.query(
    `
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (
        WHERE theme_id IS NOT NULL
          AND theme_id IN (
            SELECT id FROM public.themes WHERE name = ANY($1::text[])
          )
      )::int AS decade_assigned,
      COUNT(*) FILTER (
        WHERE theme_id IS NULL
          OR theme_id NOT IN (SELECT id FROM public.themes WHERE name = ANY($1::text[]))
      )::int AS uncategorized
    FROM public.songs
  `,
    [allDecadeThemeNames()]
  )

  console.log('Reassigned to decade themes:', reassigned)
  console.log('Cleaned titles on decade rows:', cleaned)
  console.log('Final catalog stats:', stats.rows[0])

  await client.query(`NOTIFY pgrst, 'reload schema'`)
  await client.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
