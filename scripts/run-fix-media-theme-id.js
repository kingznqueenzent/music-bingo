#!/usr/bin/env node
/**
 * Run supabase/fix-media-library-theme-id.sql against the database using DATABASE_URL from .env.local.
 * Run: node scripts/run-fix-media-theme-id.js
 * Then restart your Supabase project (Dashboard → Project Settings → General → Restart).
 */
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

async function main() {
  let connectionString = process.env.DATABASE_URL
  if (!connectionString || !connectionString.trim()) {
    console.error('DATABASE_URL is not set in .env.local.')
    console.error('Add it from Supabase: Dashboard → Project Settings → Database → Connection string (URI).')
    process.exit(1)
  }
  connectionString = connectionString.trim().replace(/^"+|"+$/g, '')

  const sqlPath = path.join(__dirname, '..', 'supabase', 'fix-media-library-theme-id.sql')
  if (!fs.existsSync(sqlPath)) {
    console.error('Not found: supabase/fix-media-library-theme-id.sql')
    process.exit(1)
  }
  const sql = fs.readFileSync(sqlPath, 'utf8')

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  })

  try {
    await client.connect()
    console.log('Running fix-media-library-theme-id.sql...')
    await client.query(sql)
    console.log('Done. Restart your Supabase project: Dashboard → Project Settings → General → Restart project. Wait ~1 min, then try /media again.')
  } catch (e) {
    console.error('Error:', e.message)
    if (e.message && e.message.includes('password authentication failed')) {
      console.error('Run supabase/fix-media-library-theme-id.sql in Supabase SQL Editor instead.')
    }
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()
