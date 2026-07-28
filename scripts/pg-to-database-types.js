#!/usr/bin/env node
/**
 * Generate types/database.types.ts from Postgres information_schema.
 * Fallback when `supabase gen types` is unavailable (e.g. Docker not running).
 */
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local'), override: true })

const PG_TO_TS = {
  uuid: 'string',
  text: 'string',
  'character varying': 'string',
  varchar: 'string',
  integer: 'number',
  bigint: 'number',
  smallint: 'number',
  boolean: 'boolean',
  'timestamp with time zone': 'string',
  'timestamp without time zone': 'string',
  timestamptz: 'string',
  jsonb: 'Json',
  json: 'Json',
  numeric: 'number',
  real: 'number',
  'double precision': 'number',
}

function tsType(dataType, udtName) {
  if (dataType === 'ARRAY') return `${tsType(udtName.replace(/^_/, ''), udtName)}[]`
  if (dataType === 'USER-DEFINED' && udtName) return udtName
  return PG_TO_TS[dataType] ?? 'Json'
}

function buildFile(tables) {
  const tableBlocks = Object.entries(tables)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, cols]) => {
      const rowFields = cols
        .map((c) => {
          const t = tsType(c.data_type, c.udt_name)
          const nullable = c.is_nullable === 'YES' ? ' | null' : ''
          return `          ${c.column_name}: ${t}${nullable}`
        })
        .join('\n')

      const insertFields = cols
        .map((c) => {
          const t = tsType(c.data_type, c.udt_name)
          const optional = c.is_nullable === 'YES' || c.column_default ? '?' : ''
          const nullable = c.is_nullable === 'YES' ? ' | null' : ''
          return `          ${c.column_name}${optional}: ${t}${nullable}`
        })
        .join('\n')

      const updateFields = cols
        .map((c) => {
          const t = tsType(c.data_type, c.udt_name)
          return `          ${c.column_name}?: ${t} | null`
        })
        .join('\n')

      return `      ${name}: {
        Row: {
${rowFields}
        }
        Insert: {
${insertFields}
        }
        Update: {
${updateFields}
        }
        Relationships: []
      }`
    })
    .join('\n')

  return `/**
 * Generated from live Postgres schema (scripts/gen-supabase-types.js).
 * Project: dmcjpkrdivafkqoovyvn
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
${tableBlocks}
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
`
}

async function generateFromPostgres(connectionString) {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })
  await client.connect()

  const { rows } = await client.query(
    `SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default, ordinal_position
     FROM information_schema.columns
     WHERE table_schema = 'public'
     ORDER BY table_name, ordinal_position`
  )

  await client.end()

  const tables = {}
  for (const row of rows) {
    if (!tables[row.table_name]) tables[row.table_name] = []
    tables[row.table_name].push(row)
  }
  return buildFile(tables)
}

module.exports = { generateFromPostgres }
