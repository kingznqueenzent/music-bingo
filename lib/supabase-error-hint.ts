/**
 * If the error looks like a Supabase API key / JWT error, appends a short hint
 * so the user knows to fix anon vs service_role keys (e.g. in Vercel).
 */
export function withSupabaseKeyHint(message: string): string {
  const lower = message.toLowerCase()
  const isKeyError =
    lower.includes('invalid') && (lower.includes('api key') || lower.includes('jwt'))
  if (!isKeyError) return message
  return `${message} — Use Supabase anon key for NEXT_PUBLIC_SUPABASE_ANON_KEY and service_role for SUPABASE_SERVICE_ROLE_KEY (see docs/VERCEL-ENV-CHECKLIST.md).`
}
