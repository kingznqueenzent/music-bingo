-- Blind Bingo: host can hide song titles on player cards and stage.
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS hide_song_titles boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.games.hide_song_titles IS
  'When true (Blind Mode), player cards and stage obfuscate song titles so players identify tracks by ear.';

NOTIFY pgrst, 'reload schema';
