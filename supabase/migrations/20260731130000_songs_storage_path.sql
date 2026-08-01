-- Storage path + full file duration for uploaded catalog media.

ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS file_duration_sec int;

COMMENT ON COLUMN public.songs.storage_path IS
  'Supabase Storage object path (e.g. mp3/1234-track.mp3) in the media bucket.';
COMMENT ON COLUMN public.songs.file_duration_sec IS
  'Full uploaded media duration in seconds (probe on upload).';

ALTER TABLE public.songs
  DROP CONSTRAINT IF EXISTS songs_file_duration_sec_check;

ALTER TABLE public.songs
  ADD CONSTRAINT songs_file_duration_sec_check CHECK (
    file_duration_sec IS NULL OR (file_duration_sec >= 1 AND file_duration_sec <= 7200)
  );

CREATE INDEX IF NOT EXISTS idx_songs_storage_path ON public.songs (storage_path)
  WHERE storage_path IS NOT NULL;

NOTIFY pgrst, 'reload schema';
