-- Fix ONLY: "Could not find the 'theme_id' column of 'media_library' in the schema cache"
-- Run this ENTIRE script in Supabase SQL Editor → New query → Paste → Run.
-- Then: Project Settings → General → Restart project. Wait 1 min, try /media again.

-- Add column without FK so it never fails (themes table might not exist yet)
ALTER TABLE public.media_library ADD COLUMN IF NOT EXISTS theme_id uuid;

-- Index for filtering by theme
CREATE INDEX IF NOT EXISTS idx_media_library_theme ON public.media_library(theme_id);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_library TO anon, authenticated;

-- Force PostgREST to reload schema cache (REQUIRED)
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload schema';
