-- Align auto-play pace default with product spec (35s between tracks).
alter table public.games
  alter column game_pace_seconds set default 35;

comment on column public.games.game_pace_seconds is 'Seconds to wait after a clip ends before auto-playing the next random track (default 35).';

notify pgrst, 'reload schema';
