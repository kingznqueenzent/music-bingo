-- Themes display order + unified songs catalog (media manager / clip previews).
-- Safe on existing LyricGrid: extends public.themes; does not drop theme_songs.

-- ---------------------------------------------------------------------------
-- themes: add display_order for playlist sorting
-- ---------------------------------------------------------------------------
ALTER TABLE public.themes
  ADD COLUMN IF NOT EXISTS display_order int NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.themes.display_order IS
  'Sort order in host playlist / theme picker (lower = first).';

CREATE INDEX IF NOT EXISTS idx_themes_display_order
  ON public.themes (display_order, name);

-- ---------------------------------------------------------------------------
-- songs: catalog table (audio / video / youtube clips)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  artist text,
  year int,
  theme_id uuid REFERENCES public.themes (id) ON DELETE SET NULL,
  media_type text NOT NULL DEFAULT 'audio',
  media_url text,
  youtube_url text,
  start_time_sec int NOT NULL DEFAULT 0,
  duration_sec int NOT NULL DEFAULT 35,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT songs_media_type_check CHECK (
    media_type IN ('audio', 'video', 'youtube')
  ),
  CONSTRAINT songs_duration_sec_check CHECK (
    duration_sec >= 1 AND duration_sec <= 300
  ),
  CONSTRAINT songs_start_time_sec_check CHECK (start_time_sec >= 0)
);

CREATE INDEX IF NOT EXISTS idx_songs_theme_id ON public.songs (theme_id);
CREATE INDEX IF NOT EXISTS idx_songs_title ON public.songs (lower(title));
CREATE INDEX IF NOT EXISTS idx_songs_media_type ON public.songs (media_type);

COMMENT ON TABLE public.songs IS
  'Host media catalog: clip previews (30–45s) linked to themes.';
COMMENT ON COLUMN public.songs.media_type IS
  'audio | video | youtube — drives host/stage playback source.';
COMMENT ON COLUMN public.songs.start_time_sec IS
  'Clip start offset in seconds (e.g. 30s hook).';
COMMENT ON COLUMN public.songs.duration_sec IS
  'Clip duration in seconds (default 35s preview).';

-- ---------------------------------------------------------------------------
-- RLS (read for clients; writes via service role / host tools)
-- ---------------------------------------------------------------------------
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "songs_select_all" ON public.songs;
CREATE POLICY "songs_select_all" ON public.songs FOR SELECT USING (true);

DROP POLICY IF EXISTS "songs_insert_authenticated" ON public.songs;
CREATE POLICY "songs_insert_authenticated" ON public.songs
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "songs_update_authenticated" ON public.songs;
CREATE POLICY "songs_update_authenticated" ON public.songs
  FOR UPDATE TO authenticated USING (true);

GRANT SELECT ON public.songs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.songs TO authenticated;
GRANT ALL ON public.songs TO service_role;

-- ---------------------------------------------------------------------------
-- Backfill from legacy theme_songs (idempotent — skip existing rows)
-- ---------------------------------------------------------------------------
INSERT INTO public.songs (
  title,
  artist,
  theme_id,
  media_type,
  media_url,
  youtube_url,
  start_time_sec,
  duration_sec,
  created_at
)
SELECT
  coalesce(nullif(trim(ts.title), ''), ts.youtube_id, 'Untitled') AS title,
  nullif(trim(ts.artist), '') AS artist,
  ts.theme_id,
  CASE
    WHEN ts.audio_url IS NOT NULL AND trim(ts.audio_url) <> '' THEN 'audio'
    WHEN ts.youtube_id IS NOT NULL AND trim(ts.youtube_id) <> '' THEN 'youtube'
    ELSE 'audio'
  END AS media_type,
  nullif(trim(ts.audio_url), '') AS media_url,
  CASE
    WHEN ts.youtube_id IS NOT NULL AND trim(ts.youtube_id) <> ''
      THEN 'https://www.youtube.com/watch?v=' || trim(ts.youtube_id)
    ELSE NULL
  END AS youtube_url,
  coalesce(ts.start_time, 0) AS start_time_sec,
  35 AS duration_sec,
  coalesce(ts.created_at, now()) AS created_at
FROM public.theme_songs ts
WHERE NOT EXISTS (
  SELECT 1
  FROM public.songs s
  WHERE s.theme_id IS NOT DISTINCT FROM ts.theme_id
    AND lower(trim(s.title)) = lower(trim(coalesce(nullif(trim(ts.title), ''), ts.youtube_id, 'Untitled')))
    AND lower(trim(coalesce(s.artist, ''))) = lower(trim(coalesce(ts.artist, '')))
);

NOTIFY pgrst, 'reload schema';
