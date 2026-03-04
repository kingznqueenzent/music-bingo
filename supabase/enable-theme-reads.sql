-- Run this in Supabase SQL Editor if /playlists shows no themes.
-- It enables RLS and adds public SELECT policies for themes + theme_songs,
-- and grants the API roles access to these tables.

-- Grants (required for PostgREST)
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

GRANT SELECT ON public.themes TO anon, authenticated;
GRANT SELECT ON public.theme_songs TO anon, authenticated;

-- Enable RLS (safe to run multiple times)
ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_songs ENABLE ROW LEVEL SECURITY;

-- Create SELECT policies only if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'themes' AND policyname = 'Allow read themes'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow read themes" ON public.themes FOR SELECT USING (true);';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'theme_songs' AND policyname = 'Allow read theme_songs'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow read theme_songs" ON public.theme_songs FOR SELECT USING (true);';
  END IF;
END $$;

-- Refresh API schema cache
NOTIFY pgrst, 'reload schema';
SELECT pg_notification_queue_usage();

