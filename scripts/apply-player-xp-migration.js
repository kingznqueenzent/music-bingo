#!/usr/bin/env node
/**
 * Apply supabase/migrations/20260413120000_player_xp_badges.sql via DATABASE_URL from .env.local.
 * Run: node scripts/apply-player-xp-migration.js
 */
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

async function main() {
  let connectionString = process.env.DATABASE_URL
  if (!connectionString || !connectionString.trim()) {
    console.error('DATABASE_URL is not set in .env.local.')
    process.exit(1)
  }
  connectionString = connectionString.trim().replace(/^"+|"+$/g, '')

  const sqlPath = path.join(
    __dirname,
    '..',
    'supabase',
    'migrations',
    '20260413120000_player_xp_badges.sql'
  )
  if (!fs.existsSync(sqlPath)) {
    console.error('Not found:', sqlPath)
    process.exit(1)
  }
  const sql = fs.readFileSync(sqlPath, 'utf8')

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  })

  try {
    await client.connect()
    await client.query(sql)
    await client.query(`NOTIFY pgrst, 'reload schema'`)
    await client.query(`NOTIFY pgrst, 'reload schema'`)
    console.log('Applied player XP / badges migration and sent PostgREST reload notify.')
  } catch (e) {
    console.error('Error:', e.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()
