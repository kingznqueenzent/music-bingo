#!/usr/bin/env node
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local'), override: true })
const { connectPg } = require('./lib/pg-connect')

async function main() {
  const rawUrl = process.env.DATABASE_URL?.trim()
  if (!rawUrl) {
    console.error('DATABASE_URL missing')
    process.exit(1)
  }
  const { client, label } = await connectPg(rawUrl)
  try {
    const table = await client.query(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'sfx_assets'
       ) AS exists`
    )
    const bucket = await client.query(`SELECT id, public FROM storage.buckets WHERE id = 'sfx-assets'`)
    const storagePolicies = await client.query(
      `SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%sfx-assets%' ORDER BY policyname`
    )
    const tablePolicies = await client.query(
      `SELECT policyname FROM pg_policies WHERE tablename = 'sfx_assets' ORDER BY policyname`
    )
    console.log(
      JSON.stringify(
        {
          label,
          sfx_assets_table: table.rows[0].exists,
          bucket: bucket.rows[0] ?? null,
          storagePolicies: storagePolicies.rows.map((r) => r.policyname),
          tablePolicies: tablePolicies.rows.map((r) => r.policyname),
        },
        null,
        2
      )
    )
  } finally {
    await client.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
