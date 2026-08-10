-- Canonical room_code on games (backfill from legacy code; keep code in sync for compatibility).

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS room_code text;

UPDATE public.games
SET room_code = coalesce(nullif(trim(code), ''), 'LYRIC')
WHERE room_code IS NULL OR trim(room_code) = '';

UPDATE public.games
SET code = room_code
WHERE (code IS NULL OR trim(code) = '') AND room_code IS NOT NULL;

-- Ongoing compatibility: if only one column was written, mirror the other.
UPDATE public.games
SET room_code = code
WHERE room_code IS DISTINCT FROM code AND code IS NOT NULL AND trim(code) <> '';

UPDATE public.games
SET code = room_code
WHERE room_code IS DISTINCT FROM code AND room_code IS NOT NULL AND trim(room_code) <> '';

CREATE INDEX IF NOT EXISTS idx_games_room_code ON public.games (room_code);

COMMENT ON COLUMN public.games.room_code IS 'Room code players enter at /join (canonical); games.code kept in sync for legacy clients';

NOTIFY pgrst, 'reload schema';
