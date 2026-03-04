/**
 * Direct PostgreSQL access when Supabase REST (PostgREST) schema cache
 * is broken (PGRST205). Uses DATABASE_URL from env.
 */
import type { Theme } from '@/lib/supabase/types'

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 6

function generateCode(): string {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  }
  return code
}

export async function getThemesDirect(): Promise<{ themes: Theme[]; error?: string }> {
  const url = process.env.DATABASE_URL?.trim()
  if (!url) return { themes: [] }

  const { Client } = await import('pg')
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  })
  try {
    await client.connect()
    const res = await client.query<Theme>(
      `SELECT id, name, category, description, artwork_url
       FROM public.themes
       ORDER BY name`
    )
    return { themes: res.rows ?? [] }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { themes: [], error: msg }
  } finally {
    try {
      await client.end()
    } catch {
      // ignore
    }
  }
}

export type CreateGameFromThemeResult =
  | { game: { id: string }; code: string }
  | { error: string }

/** Create a game from a theme using direct Postgres (avoids Supabase API schema issues). */
export async function createGameFromThemeDirect(themeId: string): Promise<CreateGameFromThemeResult> {
  const url = process.env.DATABASE_URL?.trim()
  if (!url) return { error: 'DATABASE_URL is not set' }

  const { Client } = await import('pg')
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  })
  try {
    await client.connect()

    const themeRes = await client.query<{ id: string; name: string }>(
      `SELECT id, name FROM public.themes WHERE id = $1`,
      [themeId]
    )
    const theme = themeRes.rows[0]
    if (!theme) return { error: 'Theme not found' }

    const songsRes = await client.query<{ youtube_id: string; title: string | null }>(
      `SELECT youtube_id, title FROM public.theme_songs WHERE theme_id = $1 ORDER BY position`,
      [themeId]
    )
    const themeSongs = songsRes.rows ?? []
    const MIN_5X5 = 45
    if (themeSongs.length < MIN_5X5) {
      return { error: `Theme does not have at least ${MIN_5X5} songs for a 5×5 grid.` }
    }

    const playlistRes = await client.query<{ id: string }>(
      `INSERT INTO public.playlists (name) VALUES ($1) RETURNING id`,
      [theme.name]
    )
    const playlistId = playlistRes.rows[0]?.id
    if (!playlistId) return { error: 'Failed to create playlist from theme' }

    for (let i = 0; i < themeSongs.length; i++) {
      const s = themeSongs[i]
      await client.query(
        `INSERT INTO public.playlist_songs (playlist_id, youtube_id, title, position) VALUES ($1, $2, $3, $4)`,
        [playlistId, s.youtube_id, s.title, i]
      )
    }

    let code = generateCode()
    for (let attempts = 0; attempts < 10; attempts++) {
      const existing = await client.query(`SELECT id FROM public.games WHERE code = $1`, [code])
      if (existing.rows.length === 0) break
      code = generateCode()
    }

    const gameRes = await client.query<{ id: string }>(
      `INSERT INTO public.games (playlist_id, code, status, theme_id, grid_size, clip_seconds, crossfade_seconds, tier)
       VALUES ($1, $2, 'lobby', $3, 5, 20, 0, 'free') RETURNING id`,
      [playlistId, code, themeId]
    )
    const game = gameRes.rows[0]
    if (!game) return { error: 'Failed to create game' }

    return { game: { id: game.id }, code }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { error: msg }
  } finally {
    try {
      await client.end()
    } catch {
      // ignore
    }
  }
}
