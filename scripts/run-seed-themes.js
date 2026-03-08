#!/usr/bin/env node
/**
 * Run supabase/seed-themes.sql against the database using DATABASE_URL from .env.local.
 * Run: node scripts/run-seed-themes.js
 */
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

async function main() {
  let connectionString = process.env.DATABASE_URL
  if (!connectionString || !connectionString.trim()) {
    console.error('DATABASE_URL not set in .env.local.')
    process.exit(1)
  }
  connectionString = connectionString.trim().replace(/^"+|"+$/g, '')

  const sqlPath = path.join(__dirname, '..', 'supabase', 'seed-themes.sql')
  if (!fs.existsSync(sqlPath)) {
    console.error('Not found: supabase/seed-themes.sql')
    process.exit(1)
  }
  const sql = fs.readFileSync(sqlPath, 'utf8')

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  })

  try {
    await client.connect()
    console.log('Running seed-themes.sql...')
    await client.query(sql)
    console.log('Done. Themes seeded (90\'s Hip-Hop, 90\'s Reggae, 80\'s Rock, 2000\'s Dancehall, Afrobeats 2010–2026, and others).')
  } catch (e) {
    console.error('Error:', e.message)
    if (e.message && e.message.includes('password authentication failed')) {
      console.error('Run supabase/seed-themes.sql in Supabase SQL Editor instead.')
    }
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()
