#!/usr/bin/env node
/**
 * Ingest Base44 legacy exports from public/exports/ into Supabase themes + theme_songs.
 *
 * Usage:
 *   npm run db:migrate-legacy
 *   npm run db:migrate-legacy -- --dry-run
 */
import fs from 'fs'
import path from 'path'
import { Client } from 'pg'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import type { Database } from '../types/database.types'
import { parseTitleArtist } from '../lib/media/track-genres'
import { resolveAudioClipUrl } from '../lib/audio-clips'

dotenv.config({ path: path.join(__dirname, '..', '.env.local'), override: true })

const EXPORTS_DIR = path.join(__dirname, '..', 'public', 'exports')

type LegacyTheme = {
  id?: string
  name?: string
  category?: string
  description?: string | null
  artwork_url?: string | null
  genre_id?: string | null
  era_id?: string | null
}

type LegacySong = {
  theme_id?: string
  theme_tag?: string
  theme_name?: string
  title?: string
  name?: string
  artist?: string
  youtube_id?: string
  youtube_url?: string
  audio_url?: string
  file_url?: string
  start_time?: number | null
  position?: number | null
}

type LegacyMedia = {
  theme_id?: string
  theme_tag?: string
  theme_name?: string
  name?: string
  title?: string
  artist?: string
  youtube_id?: string
  youtube_url?: string
  audio_url?: string
  file_url?: string
  file_path?: string
  start_time?: number | null
}

type NormalizedTrack = {
  title: string
  artist: string
  theme_tag: string
  youtube_id: string
  audio_url: string | null
  start_time: number
  position: number | null
  source: 'songs' | 'media_library'
}

type Summary = {
  legacyTracksRead: number
  uniqueTracks: number
  themesCreated: number
  themesUpdated: number
  songsInserted: number
  duplicatesMerged: number
  skippedInvalid: number
}

function readJsonFile<T>(names: string[]): T[] {
  for (const name of names) {
    const filePath = path.join(EXPORTS_DIR, name)
    if (!fs.existsSync(filePath)) continue
    try {
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown
      if (Array.isArray(raw)) return raw as T[]
      if (raw && typeof raw === 'object' && Array.isArray((raw as { records?: unknown }).records)) {
        return (raw as { records: T[] }).records
      }
      if (raw && typeof raw === 'object' && Array.isArray((raw as { data?: unknown }).data)) {
        return (raw as { data: T[] }).data
      }
      console.warn(`  ${name}: unexpected JSON shape — skipped`)
    } catch (e) {
      console.warn(`  ${name}: parse error —`, e instanceof Error ? e.message : e)
    }
  }
  return []
}

/** Lowercase underscored slug from a theme display name. */
export function toThemeTagSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[''`]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function compositeKey(title: string, artist: string, themeTag: string): string {
  return `${title.trim().toLowerCase()}::${artist.trim().toLowerCase()}::${themeTag.trim().toLowerCase()}`
}

export function extractYoutubeId(input: string | null | undefined): string | null {
  const raw = input?.trim()
  if (!raw) return null
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw
  const patterns = [
    /(?:youtube\.com\/watch\?[^#]*v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/i,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i,
  ]
  for (const re of patterns) {
    const m = raw.match(re)
    if (m?.[1]) return m[1]
  }
  return null
}

function resolveLegacyAudioUrl(row: {
  audio_url?: string | null
  file_url?: string | null
  file_path?: string | null
}): string | null {
  const direct = row.audio_url?.trim() || row.file_url?.trim() || row.file_path?.trim()
  if (!direct) return null
  return resolveAudioClipUrl(direct)
}

function sanitizeText(value: string | null | undefined): string {
  return value?.trim() ?? ''
}

function resolveThemeTag(
  row: { theme_tag?: string; theme_name?: string; theme_id?: string },
  themeById: Map<string, LegacyTheme>,
  themeSlugByName: Map<string, string>
): string {
  const explicit = sanitizeText(row.theme_tag)
  if (explicit) return explicit.includes('_') ? explicit : toThemeTagSlug(explicit)
  const themeName = sanitizeText(row.theme_name)
  if (themeName) return toThemeTagSlug(themeName)
  if (row.theme_id) {
    const theme = themeById.get(row.theme_id)
    if (theme?.name) return themeSlugByName.get(theme.name) ?? toThemeTagSlug(theme.name)
  }
  return ''
}

function normalizeSongRow(
  row: LegacySong,
  themeById: Map<string, LegacyTheme>,
  themeSlugByName: Map<string, string>
): NormalizedTrack | null {
  let title = sanitizeText(row.title ?? row.name)
  let artist = sanitizeText(row.artist)
  if (!title && row.name) {
    const parsed = parseTitleArtist(row.name)
    title = sanitizeText(parsed.title)
    artist = artist || sanitizeText(parsed.artist ?? '')
  }
  const theme_tag = resolveThemeTag(row, themeById, themeSlugByName)
  if (!title || !theme_tag) return null

  const youtube_id =
    extractYoutubeId(row.youtube_id) ??
    extractYoutubeId(row.youtube_url) ??
    'pending'

  return {
    title,
    artist,
    theme_tag,
    youtube_id,
    audio_url: resolveLegacyAudioUrl(row),
    start_time: Math.max(0, Math.floor(row.start_time ?? 0)),
    position: row.position ?? null,
    source: 'songs',
  }
}

function normalizeMediaRow(
  row: LegacyMedia,
  themeById: Map<string, LegacyTheme>,
  themeSlugByName: Map<string, string>
): NormalizedTrack | null {
  const rawName = sanitizeText(row.name ?? row.title)
  const parsed = parseTitleArtist(rawName)
  const title = sanitizeText(row.title) || parsed.title
  const artist = sanitizeText(row.artist) || sanitizeText(parsed.artist ?? '')
  const theme_tag = resolveThemeTag(row, themeById, themeSlugByName)
  if (!title || !theme_tag) return null

  const youtube_id =
    extractYoutubeId(row.youtube_id) ??
    extractYoutubeId(row.youtube_url) ??
    'pending'

  return {
    title,
    artist,
    theme_tag,
    youtube_id,
    audio_url: resolveLegacyAudioUrl(row),
    start_time: Math.max(0, Math.floor(row.start_time ?? 0)),
    position: null,
    source: 'media_library',
  }
}

function mergeTracks(rows: NormalizedTrack[]): {
  unique: NormalizedTrack[]
  mergedCount: number
} {
  const byKey = new Map<string, NormalizedTrack>()
  let mergedCount = 0

  for (const row of rows) {
    const key = compositeKey(row.title, row.artist, row.theme_tag)
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, row)
      continue
    }
    mergedCount++
    byKey.set(key, {
      ...existing,
      youtube_id:
        existing.youtube_id !== 'pending' ? existing.youtube_id : row.youtube_id,
      audio_url: existing.audio_url ?? row.audio_url,
      start_time: row.start_time || existing.start_time,
      position: existing.position ?? row.position,
    })
  }

  return { unique: [...byKey.values()], mergedCount }
}

function parseArgs(): { dryRun: boolean } {
  return { dryRun: process.argv.includes('--dry-run') }
}

async function upsertThemesSupabase(
  supabase: ReturnType<typeof createSupabaseClient<Database>>,
  exportThemes: LegacyTheme[],
  dryRun: boolean
): Promise<{ created: number; updated: number; slugToThemeId: Map<string, string> }> {
  const slugToThemeId = new Map<string, string>()
  let created = 0
  let updated = 0

  const { data: existingRows, error: readErr } = await supabase.from('themes').select('id, name')
  if (readErr) throw new Error(readErr.message)

  const existingBySlug = new Map<string, { id: string; name: string }>()
  for (const row of existingRows ?? []) {
    existingBySlug.set(toThemeTagSlug(row.name), { id: row.id, name: row.name })
  }

  const themesToProcess: LegacyTheme[] =
    exportThemes.length > 0
      ? exportThemes
      : [...existingBySlug.values()].map((t) => ({ id: t.id, name: t.name, category: 'decade' }))

  if (exportThemes.length === 0) {
    for (const [slug, row] of existingBySlug.entries()) {
      slugToThemeId.set(slug, row.id)
    }
    return { created: 0, updated: 0, slugToThemeId }
  }

  for (const theme of themesToProcess) {
    const name = sanitizeText(theme.name)
    if (!name) continue
    const slug = toThemeTagSlug(name)
    const category = sanitizeText(theme.category) || 'decade'
    const existing = theme.id
      ? (existingRows ?? []).find((r) => r.id === theme.id) ?? existingBySlug.get(slug)
      : existingBySlug.get(slug)

    if (dryRun) {
      slugToThemeId.set(slug, existing?.id ?? theme.id ?? `dry-run-${slug}`)
      if (existing) updated++
      else created++
      continue
    }

    if (existing) {
      const { error } = await supabase
        .from('themes')
        .update({
          name,
          category,
          description: theme.description ?? null,
          artwork_url: theme.artwork_url ?? null,
          genre_id: theme.genre_id ?? null,
          era_id: theme.era_id ?? null,
        })
        .eq('id', existing.id)
      if (error) throw new Error(error.message)
      slugToThemeId.set(slug, existing.id)
      updated++
      continue
    }

    const insertPayload: Database['public']['Tables']['themes']['Insert'] = {
      id: theme.id,
      name,
      category,
      description: theme.description ?? null,
      artwork_url: theme.artwork_url ?? null,
      genre_id: theme.genre_id ?? null,
      era_id: theme.era_id ?? null,
    }
    const { data, error } = await supabase.from('themes').insert(insertPayload).select('id').single()
    if (error) throw new Error(error.message)
    slugToThemeId.set(slug, data.id)
    created++
  }

  return { created, updated, slugToThemeId }
}

async function upsertThemeSongsSupabase(
  supabase: ReturnType<typeof createSupabaseClient<Database>>,
  tracks: NormalizedTrack[],
  slugToThemeId: Map<string, string>,
  dryRun: boolean
): Promise<{ inserted: number; merged: number; skipped: number }> {
  let inserted = 0
  let merged = 0
  let skipped = 0
  const positionByTheme = new Map<string, number>()

  const { data: existingSongs } = await supabase
    .from('theme_songs')
    .select('title, artist, theme_tag')
  const existingKeys = new Set(
    (existingSongs ?? []).map((r) =>
      compositeKey(r.title ?? '', r.artist ?? '', r.theme_tag ?? '')
    )
  )

  for (const track of tracks) {
    const themeId = slugToThemeId.get(track.theme_tag)
    if (!themeId) {
      console.warn(
        `Skipping track (unknown theme_tag="${track.theme_tag}"): ${track.title} — ${track.artist}`
      )
      skipped++
      continue
    }

    let position = track.position
    if (position == null || !Number.isFinite(position)) {
      const current = positionByTheme.get(themeId) ?? -1
      position = current + 1
      positionByTheme.set(themeId, position)
    }

    const key = compositeKey(track.title, track.artist, track.theme_tag)
    const wasExisting = existingKeys.has(key)

    if (dryRun) {
      if (wasExisting) merged++
      else inserted++
      continue
    }

    const payload: Database['public']['Tables']['theme_songs']['Insert'] = {
      theme_id: themeId,
      youtube_id: track.youtube_id,
      title: track.title,
      artist: track.artist,
      theme_tag: track.theme_tag,
      position,
      audio_url: track.audio_url,
      start_time: track.start_time,
    }

    const { error } = await supabase
      .from('theme_songs')
      .upsert(payload, { onConflict: 'title,artist,theme_tag' })

    if (error) throw new Error(error.message)

    if (wasExisting) merged++
    else {
      inserted++
      existingKeys.add(key)
    }
  }

  return { inserted, merged, skipped }
}

function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!url || !key) {
    throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for REST fallback.')
  }
  return createSupabaseClient<Database>(url, key)
}

function printSummary(summary: Summary, dryRun: boolean): void {
  console.log('\n=== Migration summary ===')
  console.log(`Total legacy tracks read:        ${summary.legacyTracksRead}`)
  console.log(`Unique tracks after dedupe:      ${summary.uniqueTracks}`)
  console.log(`Themes created:                  ${summary.themesCreated}`)
  console.log(`Themes updated:                  ${summary.themesUpdated}`)
  console.log(`Songs inserted (theme_songs):    ${summary.songsInserted}`)
  console.log(`Duplicates skipped/merged:       ${summary.duplicatesMerged}`)
  console.log(`Invalid/unmapped rows skipped:   ${summary.skippedInvalid}`)
  if (dryRun) console.log('\n(dry-run — no rows written)')
}

async function runMigration(
  uniqueTracks: NormalizedTrack[],
  themes: LegacyTheme[],
  legacyTracksRead: number,
  skippedInvalid: number,
  preDbMerged: number,
  dryRun: boolean
): Promise<void> {
  let connectionString = process.env.DATABASE_URL?.trim()?.replace(/^"+|"+$/g, '')
  if (connectionString) {
    try {
      connectionString = decodeURIComponent(connectionString)
    } catch {
      // keep encoded
    }
  }

  if (connectionString) {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })
    try {
      await client.connect()
      try {
        const { created, updated, slugToThemeId } = await upsertThemes(client, themes, dryRun)
        const { inserted, merged, skipped } = await upsertThemeSongs(
          client,
          uniqueTracks,
          slugToThemeId,
          dryRun
        )
        if (!dryRun) await client.query(`NOTIFY pgrst, 'reload schema'`)
        printSummary(
          {
            legacyTracksRead,
            uniqueTracks: uniqueTracks.length,
            themesCreated: created,
            themesUpdated: updated,
            songsInserted: inserted,
            duplicatesMerged: preDbMerged + merged,
            skippedInvalid: skippedInvalid + skipped,
          },
          dryRun
        )
        return
      } finally {
        await client.end()
      }
    } catch (pgErr) {
      console.warn(
        `Postgres connect failed (${pgErr instanceof Error ? pgErr.message : pgErr}) — trying Supabase REST.`
      )
    }
  } else {
    console.warn('DATABASE_URL not set — using Supabase REST.')
  }

  const supabase = createSupabaseAdmin()
  console.log('Using Supabase REST client.')
  const { created, updated, slugToThemeId } = await upsertThemesSupabase(supabase, themes, dryRun)
  const { inserted, merged, skipped } = await upsertThemeSongsSupabase(
    supabase,
    uniqueTracks,
    slugToThemeId,
    dryRun
  )
  printSummary(
    {
      legacyTracksRead,
      uniqueTracks: uniqueTracks.length,
      themesCreated: created,
      themesUpdated: updated,
      songsInserted: inserted,
      duplicatesMerged: preDbMerged + merged,
      skippedInvalid: skippedInvalid + skipped,
    },
    dryRun
  )
}

async function upsertThemes(
  client: Client,
  exportThemes: LegacyTheme[],
  dryRun: boolean
): Promise<{ created: number; updated: number; slugToThemeId: Map<string, string> }> {
  const slugToThemeId = new Map<string, string>()
  let created = 0
  let updated = 0

  const existingRes = await client.query<{
    id: string
    name: string
  }>(`SELECT id, name FROM public.themes`)
  const existingBySlug = new Map<string, { id: string; name: string }>()
  for (const row of existingRes.rows) {
    existingBySlug.set(toThemeTagSlug(row.name), { id: row.id, name: row.name })
  }

  const themesToProcess: LegacyTheme[] =
    exportThemes.length > 0
      ? exportThemes
      : [...existingBySlug.values()].map((t) => ({ id: t.id, name: t.name, category: 'decade' }))

  if (exportThemes.length === 0) {
    for (const [slug, row] of existingBySlug.entries()) {
      slugToThemeId.set(slug, row.id)
    }
    return { created: 0, updated: 0, slugToThemeId }
  }

  for (const theme of themesToProcess) {
    const name = sanitizeText(theme.name)
    if (!name) continue
    const slug = toThemeTagSlug(name)
    const category = sanitizeText(theme.category) || 'decade'
    const existing = theme.id
      ? existingRes.rows.find((r) => r.id === theme.id) ?? existingBySlug.get(slug)
      : existingBySlug.get(slug)

    if (dryRun) {
      slugToThemeId.set(slug, existing?.id ?? theme.id ?? `dry-run-${slug}`)
      if (existing) updated++
      else created++
      continue
    }

    if (existing) {
      await client.query(
        `UPDATE public.themes
         SET name = $2,
             category = $3,
             description = COALESCE($4, description),
             artwork_url = COALESCE($5, artwork_url),
             genre_id = COALESCE($6::uuid, genre_id),
             era_id = COALESCE($7::uuid, era_id)
         WHERE id = $1`,
        [
          existing.id,
          name,
          category,
          theme.description ?? null,
          theme.artwork_url ?? null,
          theme.genre_id ?? null,
          theme.era_id ?? null,
        ]
      )
      slugToThemeId.set(slug, existing.id)
      updated++
      continue
    }

    const insertRes = await client.query<{ id: string }>(
      `INSERT INTO public.themes (id, name, category, description, artwork_url, genre_id, era_id)
       VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, $5, $6::uuid, $7::uuid)
       RETURNING id`,
      [
        theme.id ?? null,
        name,
        category,
        theme.description ?? null,
        theme.artwork_url ?? null,
        theme.genre_id ?? null,
        theme.era_id ?? null,
      ]
    )
    const id = insertRes.rows[0]?.id
    if (id) {
      slugToThemeId.set(slug, id)
      created++
    }
  }

  return { created, updated, slugToThemeId }
}

async function upsertThemeSongs(
  client: Client,
  tracks: NormalizedTrack[],
  slugToThemeId: Map<string, string>,
  dryRun: boolean
): Promise<{ inserted: number; merged: number; skipped: number }> {
  let inserted = 0
  let merged = 0
  let skipped = 0
  const positionByTheme = new Map<string, number>()

  for (const track of tracks) {
    const themeId = slugToThemeId.get(track.theme_tag)
    if (!themeId) {
      console.warn(
        `Skipping track (unknown theme_tag="${track.theme_tag}"): ${track.title} — ${track.artist}`
      )
      skipped++
      continue
    }

    let position = track.position
    if (position == null || !Number.isFinite(position)) {
      const current = positionByTheme.get(themeId) ?? -1
      position = current + 1
      positionByTheme.set(themeId, position)
    }

    if (dryRun) {
      inserted++
      continue
    }

    const result = await client.query<{ is_insert: boolean }>(
      `INSERT INTO public.theme_songs (
         theme_id, youtube_id, title, artist, theme_tag, position, audio_url, start_time
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (title, artist, theme_tag) DO UPDATE SET
         theme_id = EXCLUDED.theme_id,
         youtube_id = CASE
           WHEN EXCLUDED.youtube_id <> 'pending' THEN EXCLUDED.youtube_id
           ELSE public.theme_songs.youtube_id
         END,
         audio_url = COALESCE(EXCLUDED.audio_url, public.theme_songs.audio_url),
         start_time = EXCLUDED.start_time,
         position = EXCLUDED.position
       RETURNING (xmax = 0) AS is_insert`,
      [
        themeId,
        track.youtube_id,
        track.title,
        track.artist,
        track.theme_tag,
        position,
        track.audio_url,
        track.start_time,
      ]
    )

    if (result.rows[0]?.is_insert) inserted++
    else merged++
  }

  return { inserted, merged, skipped }
}

async function main(): Promise<void> {
  const { dryRun } = parseArgs()

  console.log('=== Legacy export migration ===')
  console.log(`Exports directory: ${EXPORTS_DIR}`)
  if (dryRun) console.log('Mode: dry-run (no database writes)\n')

  const themes = readJsonFile<LegacyTheme>([
    'Theme.json',
    'Themes.json',
    'theme.json',
    'themes.json',
  ])
  const genres = readJsonFile<{ id: string; name?: string }>([
    'Genre.json',
    'Genres.json',
    'genre.json',
    'genres.json',
  ])
  const eras = readJsonFile<{ id: string; name?: string }>([
    'Era.json',
    'Eras.json',
    'era.json',
    'eras.json',
  ])
  const songs = readJsonFile<LegacySong>([
    'Song.json',
    'Songs.json',
    'song.json',
    'songs.json',
    'theme_songs.json',
  ])
  const media = readJsonFile<LegacyMedia>([
    'MediaLibrary.json',
    'media_library.json',
    'MediaLibrary.export.json',
  ])

  console.log(
    `Read exports: themes=${themes.length}, genres=${genres.length}, eras=${eras.length}, songs=${songs.length}, media=${media.length}`
  )

  const themeById = new Map(themes.map((t) => [t.id ?? '', t]))
  const themeSlugByName = new Map(
    themes.filter((t) => t.name).map((t) => [t.name!.trim(), toThemeTagSlug(t.name!)])
  )

  const normalized: NormalizedTrack[] = []
  let skippedInvalid = 0

  for (const row of songs) {
    const track = normalizeSongRow(row, themeById, themeSlugByName)
    if (!track) {
      skippedInvalid++
      continue
    }
    normalized.push(track)
  }

  for (const row of media) {
    const track = normalizeMediaRow(row, themeById, themeSlugByName)
    if (!track) {
      skippedInvalid++
      continue
    }
    normalized.push(track)
  }

  const legacyTracksRead = normalized.length
  const { unique: uniqueTracks, mergedCount: preDbMerged } = mergeTracks(normalized)

  await runMigration(uniqueTracks, themes, legacyTracksRead, skippedInvalid, preDbMerged, dryRun)
}

main().catch((err: Error) => {
  console.error('Migration failed:', err.message)
  process.exit(1)
})
