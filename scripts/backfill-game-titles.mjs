#!/usr/bin/env node
/**
 * Backfill missing playlist_songs titles (YouTube noembed) and sync bingo_game_tracks + cards.grid_data.
 * Usage: node scripts/backfill-game-titles.mjs [gameId]
 */
import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const gameId = process.argv[2] ?? '864c8483-fbd5-4c22-ae09-9064eba03d47'
const BATCH = 8

async function fetchYoutubeTitle(youtubeId) {
  try {
    const res = await fetch(
      `https://noembed.com/embed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${youtubeId}`)}`,
      { signal: AbortSignal.timeout(8000) }
    )
    const data = await res.json()
    return data?.title?.trim() || null
  } catch {
    return null
  }
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()

console.log(`Backfilling titles for game ${gameId}…`)

const psRes = await client.query(
  `SELECT DISTINCT ps.id, ps.youtube_id, ps.title
   FROM public.cards c
   CROSS JOIN LATERAL jsonb_array_elements(c.grid_data) elem
   JOIN public.playlist_songs ps ON ps.id = (elem->>'playlist_song_id')::uuid
   WHERE c.game_id = $1
     AND ps.youtube_id IS NOT NULL
     AND (ps.title IS NULL OR trim(ps.title) = '' OR lower(trim(ps.title)) = 'unknown track'
          OR ps.title ~ '^[a-zA-Z0-9_-]{11}$')`,
  [gameId]
)

console.log(`Found ${psRes.rows.length} playlist_songs needing titles`)

let filled = 0
for (let i = 0; i < psRes.rows.length; i += BATCH) {
  const batch = psRes.rows.slice(i, i + BATCH)
  const results = await Promise.all(
    batch.map(async (row) => ({ id: row.id, title: await fetchYoutubeTitle(row.youtube_id) }))
  )
  for (const { id, title } of results) {
    if (!title) continue
    await client.query(`UPDATE public.playlist_songs SET title = $1 WHERE id = $2`, [title, id])
    filled += 1
  }
  console.log(`  filled ${Math.min(i + BATCH, psRes.rows.length)} / ${psRes.rows.length}`)
}

console.log(`Updated ${filled} playlist_songs titles`)

const bgtRes = await client.query(
  `UPDATE public.bingo_game_tracks bgt
   SET title = ps.title
   FROM (
     SELECT DISTINCT ON (bgt.id) bgt.id AS track_id, ps.title
     FROM public.bingo_game_tracks bgt
     JOIN public.cards c ON c.game_id = bgt.game_id
     CROSS JOIN LATERAL jsonb_array_elements(c.grid_data) elem
     JOIN public.playlist_songs ps ON ps.id = (elem->>'playlist_song_id')::uuid
     WHERE bgt.game_id = $1
       AND (elem->>'track_id')::uuid = bgt.id
       AND ps.title IS NOT NULL
       AND trim(ps.title) <> ''
       AND lower(trim(ps.title)) <> 'unknown track'
   ) ps
   WHERE bgt.id = ps.track_id
   RETURNING bgt.id`,
  [gameId]
)
console.log(`Updated ${bgtRes.rowCount} bingo_game_tracks`)

const cardsRes = await client.query(
  `UPDATE public.cards c
   SET grid_data = sub.new_grid
   FROM (
     SELECT c2.id,
       (
         SELECT jsonb_agg(
           elem || jsonb_build_object(
             'title', COALESCE(
               NULLIF(trim(ps.title), ''),
               elem->>'title'
             )
           )
           ORDER BY (elem->>'position')::int
         )
         FROM jsonb_array_elements(c2.grid_data) elem
         LEFT JOIN public.playlist_songs ps ON ps.id = (elem->>'playlist_song_id')::uuid
       ) AS new_grid
     FROM public.cards c2
     WHERE c2.game_id = $1 AND jsonb_array_length(c2.grid_data) > 0
   ) sub
   WHERE c.id = sub.id
   RETURNING c.id`,
  [gameId]
)
console.log(`Updated grid_data on ${cardsRes.rowCount} cards`)

const sample = await client.query(
  `SELECT elem->>'title' AS title
   FROM public.cards c
   CROSS JOIN LATERAL jsonb_array_elements(c.grid_data) elem
   WHERE c.game_id = $1
   LIMIT 5`,
  [gameId]
)
console.log('Sample titles after backfill:', sample.rows.map((r) => r.title))

await client.end()
console.log('Done.')
