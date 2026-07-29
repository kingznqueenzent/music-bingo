-- MP3 clip support on theme catalog and gameplay playlist rows.

ALTER TABLE public.theme_songs
  ADD COLUMN IF NOT EXISTS audio_url text,
  ADD COLUMN IF NOT EXISTS start_time int NOT NULL DEFAULT 0;

ALTER TABLE public.playlist_songs
  ADD COLUMN IF NOT EXISTS audio_url text,
  ADD COLUMN IF NOT EXISTS start_time int NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.theme_songs.audio_url IS
  'Supabase Storage path or full URL for audio-clips bucket MP3. When set, host prefers MP3 over YouTube.';
COMMENT ON COLUMN public.theme_songs.start_time IS
  'YouTube hook start offset (seconds). Also used as MP3 clip start when audio_url is set.';
COMMENT ON COLUMN public.playlist_songs.audio_url IS
  'Copied from theme_songs or uploaded; MP3 stream URL/path for host playback.';
COMMENT ON COLUMN public.playlist_songs.start_time IS
  'Clip start offset in seconds (YouTube or MP3).';

NOTIFY pgrst, 'reload schema';
