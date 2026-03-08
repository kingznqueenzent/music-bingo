# Add Vercel env vars via CLI. Run from project root.
# Prereqs: npm i -g vercel, then vercel link (choose team + music-bingo project).
# When each "Value" prompt appears, paste from .env.local (or Supabase for SUPABASE_SERVICE_ROLE_KEY).

$ErrorActionPreference = "Stop"
$vars = @(
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "DATABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY"
)

$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
  Write-Host "Vercel CLI not found. Run: npm i -g vercel"
  exit 1
}

foreach ($name in $vars) {
  Write-Host "Adding: $name (paste value when prompted)"
  vercel env add $name production
}

Write-Host "Done. Redeploy the project in Vercel so the new env vars are used."
