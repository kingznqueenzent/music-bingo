-- Pricing tiers & Enterprise branding
-- Run after media-and-game-options.sql

-- Game tier: free (5 players), pro (50), enterprise (unlimited)
alter table public.games
  add column if not exists tier text not null default 'free' check (tier in ('free', 'pro', 'enterprise'));

-- Enterprise: custom logo/branding on cards and PDF
alter table public.games
  add column if not exists logo_url text;

NOTIFY pgrst, 'reload schema';
