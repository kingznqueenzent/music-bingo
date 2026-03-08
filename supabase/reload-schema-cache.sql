-- Fix: "Could not find the 'player_identifier' (or other) column of 'cards'/'games' in the schema cache"
-- Run this ENTIRE script in Supabase SQL Editor: New query → paste all → Run.
-- Then wait 20 seconds and try the app again.
-- If the error STILL appears: Dashboard → Project Settings → General → Restart project (required for stubborn caches).

-- 1. Ensure expected columns exist on games (no-op if already there)
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS playlist_id uuid REFERENCES public.playlists(id) ON DELETE RESTRICT;
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS current_song_id uuid REFERENCES public.playlist_songs(id) ON DELETE SET NULL;

-- 2. Ensure expected columns exist on cards (no-op if already there)
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS player_name text;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS player_identifier text;

-- 3. Ensure anon can access games and cards
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.games TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cards TO anon, authenticated;

-- 4. Reload PostgREST schema cache (run twice; sometimes first NOTIFY is missed)
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload schema';
