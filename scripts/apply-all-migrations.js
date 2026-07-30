#!/usr/bin/env node
/**
 * Apply all SQL files under supabase/migrations in dependency order (not filename sort).
 * Requires DATABASE_URL in .env.local (direct Postgres URI from Supabase dashboard).
 */
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

/** Order matters: e.g. leaderboard table must exist before player_xp / community_chat. */
const MIGRATION_FILES = [
  'media-and-game-options.sql',
  'tiers-and-branding.sql',
  'stage-show-leaderboard.sql',
  'leaderboard-win-tracking.sql',
  'prizes-and-record-wins.sql',
  'spotify-and-admin.sql',
  '20260307000000_theme_songs_allow_insert.sql',
  '20260324000000_dj_mix_copyright_analyzer.sql',
  '20260325000000_mix_analyses_status_pending.sql',
  '20260413120000_player_xp_badges.sql',
  '20260420120000_seasonal_tournaments.sql',
  '20260421120000_claimed_prizes.sql',
  '20260422120000_feature_flags.sql',
  '20260423120000_b2b_monetization.sql',
  '20260424120000_community_chat.sql',
  '20260425120000_chat_sender_role.sql',
  '20260426120000_chat_is_dj.sql',
  '20260427140000_chat_messages_realtime_select.sql',
  '20260428120000_choice_a_lyricgrid_bridge.sql',
  '20260429120000_players_username_column.sql',
  '20260626120000_bingo_game_tracks_library.sql',
  '20260628120000_game_events.sql',
  '20260729120000_theme_songs_audio_url.sql',
  '20260729130000_unique_theme_songs.sql',
]

async function main() {
  let connectionString = process.env.DATABASE_URL
  if (!connectionString?.trim()) {
    console.error('DATABASE_URL is not set in .env.local.')
    process.exit(1)
  }
  connectionString = connectionString.trim().replace(/^"+|"+$/g, '')

  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations')
  const onDisk = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  const listed = new Set(MIGRATION_FILES)
  const missingOnDisk = MIGRATION_FILES.filter((f) => !onDisk.includes(f))
  if (missingOnDisk.length) {
    console.error('Migration list references missing files:', missingOnDisk.join(', '))
    process.exit(1)
  }

  const extra = onDisk.filter((f) => !listed.has(f))
  if (extra.length) {
    console.warn(
      'Warning: new .sql files in supabase/migrations not in MIGRATION_FILES — add them in the correct order:',
      extra.join(', '),
    )
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  })

  try {
    await client.connect()
    for (const file of MIGRATION_FILES) {
      const sqlPath = path.join(migrationsDir, file)
      const sql = fs.readFileSync(sqlPath, 'utf8')
      console.log('Applying', file, '…')
      await client.query(sql)
    }
    await client.query(`NOTIFY pgrst, 'reload schema'`)
    console.log('All migrations applied; PostgREST notified.')
  } catch (e) {
    console.error('Error:', e.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()
