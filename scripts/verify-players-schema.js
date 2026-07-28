#!/usr/bin/env node
const path = require('path')
const { Client } = require('pg')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local'), override: true })

async function main() {
  const connectionString = process.env.DATABASE_URL?.trim()?.replace(/^"+|"+$/g, '')
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })
  await client.connect()
  const { rows } = await client.query(
    `SELECT column_name, data_type, is_nullable
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'players'
     ORDER BY ordinal_position`
  )
  console.log('public.players columns:', rows)
  await client.end()
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
