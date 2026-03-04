-- Run this in Supabase SQL Editor (New query → paste all → Run).
-- If you get "relation does not exist", run schema.sql first, then run this again.
-- This exposes tables to the API and forces PostgREST to reload its schema cache.

-- Expose schema and tables to the API roles (anon, authenticated)
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.playlists TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.playlist_songs TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.games TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cards TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.card_cells TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.played_songs TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.themes TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.theme_songs TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wins TO anon, authenticated;

-- Tell PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';

-- Refresh notification queue (helps PostgREST pick up the reload)
SELECT pg_notification_queue_usage();
