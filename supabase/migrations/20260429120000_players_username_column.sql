-- Align legacy public.players with Choice A (username column).
-- Safe when bridge migration created a fresh table or legacy table used `name`.

ALTER TABLE public.players ADD COLUMN IF NOT EXISTS username text;

UPDATE public.players SET username = COALESCE(username, name) WHERE username IS NULL AND name IS NOT NULL;

UPDATE public.players SET username = COALESCE(username, 'player') WHERE username IS NULL;

ALTER TABLE public.players ALTER COLUMN username SET NOT NULL;

COMMENT ON COLUMN public.players.username IS 'Display name shown in the bingo lobby (Choice A)';

NOTIFY pgrst, 'reload schema';
