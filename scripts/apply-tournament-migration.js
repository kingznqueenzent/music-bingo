#!/usr/bin/env node
/**
 * Apply supabase/migrations/20260420120000_seasonal_tournaments.sql
 * Run: node scripts/apply-tournament-migration.js
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

  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260420120000_seasonal_tournaments.sql')
  const sql = fs.readFileSync(sqlPath, 'utf8')

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  })

  try {
    await client.connect()
    await client.query(sql)
    console.log('Seasonal tournaments migration applied.')
  } catch (e) {
    console.error('Error:', e.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()
