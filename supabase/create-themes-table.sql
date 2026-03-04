-- Run this in Supabase SQL Editor to create the themes table (fixes "relation public.themes does not exist").
-- Then run seed-themes.sql to add the 8 theme rows.

-- Themes table
CREATE TABLE IF NOT EXISTS public.themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  description text,
  artwork_url text,
  created_at timestamptz DEFAULT now()
);

-- Theme songs table (for storing YouTube IDs per theme)
CREATE TABLE IF NOT EXISTS public.theme_songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id uuid NOT NULL REFERENCES public.themes(id) ON DELETE CASCADE,
  youtube_id text NOT NULL,
  title text,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_themes_category ON public.themes(category);
CREATE INDEX IF NOT EXISTS idx_theme_songs_theme ON public.theme_songs(theme_id);

-- RLS (allow read for API)
ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_songs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read themes" ON public.themes;
CREATE POLICY "Allow read themes" ON public.themes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow read theme_songs" ON public.theme_songs;
CREATE POLICY "Allow read theme_songs" ON public.theme_songs FOR SELECT USING (true);
