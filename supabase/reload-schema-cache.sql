-- Fix: "Could not find the '...' column of 'games' or 'cards' in the schema cache"
-- Run in Supabase SQL Editor (New query → paste → Run).
-- If the error persists: Dashboard → Project Settings → General → Restart project.

-- 1. Ensure expected columns exist on games (no-op if already there)
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS playlist_id uuid REFERENCES public.playlists(id) ON DELETE RESTRICT;
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS current_song_id uuid REFERENCES public.playlist_songs(id) ON DELETE SET NULL;

-- 2. Ensure expected columns exist on cards (no-op if already there)
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS player_identifier text;

-- 3. Ensure anon can access games and cards
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.games TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cards TO anon, authenticated;

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
