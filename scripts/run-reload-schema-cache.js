#!/usr/bin/env node
/**
 * Run reload-schema-cache.sql (NOTIFY pgrst + grants) via DATABASE_URL.
 * Run: node scripts/run-reload-schema-cache.js
 */
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

async function main() {
  let connectionString = process.env.DATABASE_URL
  if (!connectionString || !connectionString.trim()) {
    console.error('DATABASE_URL not set.')
    process.exit(1)
  }
  connectionString = connectionString.trim().replace(/^"+|"+$/g, '')

  const sqlPath = path.join(__dirname, '..', 'supabase', 'reload-schema-cache.sql')
  const sql = fs.readFileSync(sqlPath, 'utf8')

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  })

  try {
    await client.connect()
    await client.query(sql)
    console.log('Schema cache reload sent (NOTIFY pgrst). Wait a few seconds then try the app.')
  } catch (e) {
    console.error('Error:', e.message)
    if (e.message && e.message.includes('password authentication failed')) {
      console.error('Run supabase/reload-schema-cache.sql in Supabase SQL Editor instead.')
    }
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()
