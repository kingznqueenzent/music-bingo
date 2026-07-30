-- Duplicate prevention: separate title/artist/theme_tag + composite unique key.

ALTER TABLE public.theme_songs
  ADD COLUMN IF NOT EXISTS artist text,
  ADD COLUMN IF NOT EXISTS theme_tag text;

COMMENT ON COLUMN public.theme_songs.artist IS
  'Track artist name; part of unique key with title and theme_tag.';
COMMENT ON COLUMN public.theme_songs.theme_tag IS
  'Denormalized theme name (matches themes.name); part of unique key with title and artist.';

-- Backfill theme_tag from linked theme.
UPDATE public.theme_songs ts
SET theme_tag = t.name
FROM public.themes t
WHERE ts.theme_id = t.id
  AND (ts.theme_tag IS NULL OR trim(ts.theme_tag) = '');

-- Split "Title — Artist" combined titles when present.
UPDATE public.theme_songs
SET
  title = trim(split_part(title, ' — ', 1)),
  artist = trim(split_part(title, ' — ', 2))
WHERE title LIKE '% — %'
  AND (artist IS NULL OR trim(artist) = '');

-- Use youtube_id as title fallback for legacy null/empty titles.
UPDATE public.theme_songs
SET title = youtube_id
WHERE title IS NULL OR trim(title) = '';

UPDATE public.theme_songs
SET artist = ''
WHERE artist IS NULL;

UPDATE public.theme_songs
SET theme_tag = ''
WHERE theme_tag IS NULL;

-- Remove duplicate catalog rows before adding unique constraint (keep earliest id).
DELETE FROM public.theme_songs a
USING public.theme_songs b
WHERE a.id > b.id
  AND a.title = b.title
  AND a.artist = b.artist
  AND a.theme_tag = b.theme_tag;

ALTER TABLE public.theme_songs
  DROP CONSTRAINT IF EXISTS theme_songs_title_artist_theme_tag_key;

ALTER TABLE public.theme_songs
  ADD CONSTRAINT theme_songs_title_artist_theme_tag_key
  UNIQUE (title, artist, theme_tag);

NOTIFY pgrst, 'reload schema';
