-- Host Autopilot persisted session (not React-only). Remaining RANDOM order + runtime live here.
alter table public.games
  add column if not exists autopilot jsonb not null default '{}'::jsonb;

comment on column public.games.autopilot is
  'Host Autopilot: { enabled, mode, runtimeEndsAt, delaySec, paused, remainingTrackIds, winnerPolicy }';

notify pgrst, 'reload schema';
