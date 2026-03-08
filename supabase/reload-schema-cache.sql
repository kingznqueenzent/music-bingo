-- Fix: "Could not find the '...' column of 'games'/'cards'/'media_library' in the schema cache"
-- Run this ENTIRE script in Supabase SQL Editor: New query → paste all → Run.
-- Then wait 20 seconds and try the app again.
-- If the error STILL appears: Dashboard → Project Settings → General → Restart project (required for stubborn caches).

-- 1. Ensure expected columns exist on games (no-op if already there)
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS playlist_id uuid REFERENCES public.playlists(id) ON DELETE RESTRICT;
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS current_song_id uuid REFERENCES public.playlist_songs(id) ON DELETE SET NULL;

-- 2. Ensure expected columns exist on cards (no-op if already there)
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS player_name text;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS player_identifier text;

-- 3. Ensure media_library has theme_id (no FK so it never fails)
ALTER TABLE public.media_library ADD COLUMN IF NOT EXISTS theme_id uuid;
CREATE INDEX IF NOT EXISTS idx_media_library_theme ON public.media_library(theme_id);

-- 4. Ensure anon can access games, cards, media_library
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.games TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cards TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_library TO anon, authenticated;

-- 5. Reload PostgREST schema cache (run twice; sometimes first NOTIFY is missed)
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload schema';
