/**
 * LyricGrid Vercel / runtime environment catalog.
 * Used by scripts/push-supabase-env-to-vercel.js and scripts/verify-and-vercel-checklist.js.
 *
 * requiredForProduction — must be set on Vercel Production or host/media/auth break.
 * recommended — feature flags / email / imports; app builds without them.
 * localOnly — never push to Vercel (CLI tokens, machine paths).
 */

/** @typedef {{ name: string, description: string, public?: boolean }} EnvVarDef */

/** @type {EnvVarDef[]} */
const requiredForProduction = [
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    description: 'Supabase project URL (https://xxxx.supabase.co)',
    public: true,
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    description: 'Supabase anon/public key (browser + fallback server)',
    public: true,
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    description: 'Supabase service_role secret (server only — never expose to client)',
  },
  {
    name: 'ADMIN_EMAIL',
    description: 'Host portal allowlist email (enables proxy cookie guard on /host, /media-manager, etc.)',
  },
  {
    name: 'HOST_TIER',
    description: 'Host subscription tier: free (hosting only) | pro (media library) | enterprise (media + branding)',
  },
  {
    name: 'NEXT_PUBLIC_HOST_TIER',
    description: 'Browser-visible mirror of HOST_TIER for quota UI bootstrap (must match HOST_TIER)',
    public: true,
  },
]

/** @type {EnvVarDef[]} */
const recommended = [
  {
    name: 'ADMIN_SECRET',
    description: 'Legacy /admin-login password (optional when using Supabase Auth + host-session cookie)',
  },
  {
    name: 'DATABASE_URL',
    description: 'Postgres URI for scripts/migrations and some server fallbacks (session pooler :5432)',
  },
  {
    name: 'YOUTUBE_API_KEY',
    description: 'YouTube Data API v3 — /host/import-youtube playlist import',
  },
  {
    name: 'CLAIMED_PRIZE_WEBHOOK_SECRET',
    description: 'Shared secret for POST /api/webhooks/claimed-prize',
  },
  {
    name: 'RESEND_API_KEY',
    description: 'Resend API key for prize/venue notification emails',
  },
  {
    name: 'RESEND_FROM_EMAIL',
    description: 'From address for Resend (e.g. LyricGrid <noreply@lyricgrid.ca>)',
  },
  {
    name: 'PRIZE_CLAIM_NOTIFY_TO',
    description: 'Inbox for prize claim alerts',
  },
  {
    name: 'VENUE_BOOKING_NOTIFY_TO',
    description: 'Inbox for venue booking form alerts',
  },
  {
    name: 'NEXT_PUBLIC_KINGZ_SITE_URL',
    description: 'Canonical Kingz marketing site URL',
    public: true,
  },
  {
    name: 'MIX_API_URL',
    description: 'FastAPI mix analyzer base URL (defaults to http://127.0.0.1:8000)',
  },
  {
    name: 'NEXT_PUBLIC_API_URL',
    description: 'Public API base for mix analyzer client helpers',
    public: true,
  },
  {
    name: 'SPOTIFY_CLIENT_ID',
    description: 'Spotify app client id (optional search)',
  },
  {
    name: 'SPOTIFY_CLIENT_SECRET',
    description: 'Spotify app client secret',
  },
]

/** Never push these to Vercel. */
const localOnly = ['VERCEL_OIDC_TOKEN', 'USERPROFILE', 'HOME', 'KQ_XLSX_PATH']

/** Vars the push script writes by default (from .env.local). */
const pushByDefault = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ADMIN_EMAIL',
  'HOST_TIER',
  'NEXT_PUBLIC_HOST_TIER',
  'ADMIN_SECRET',
  'DATABASE_URL',
  'YOUTUBE_API_KEY',
]

module.exports = {
  requiredForProduction,
  recommended,
  localOnly,
  pushByDefault,
}
