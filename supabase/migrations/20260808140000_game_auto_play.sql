-- Host auto-play: hands-free advance to random unplayed tracks after each clip + pace gap
alter table public.games
  add column if not exists auto_play_enabled boolean not null default false;

alter table public.games
  add column if not exists game_pace_seconds int not null default 10
    check (game_pace_seconds >= 3 and game_pace_seconds <= 120);

comment on column public.games.auto_play_enabled is 'When true, host dashboard auto-advances to a random unplayed track after each clip + pace gap';
comment on column public.games.game_pace_seconds is 'Seconds to wait after a clip ends before auto-playing the next random track';

notify pgrst, 'reload schema';
