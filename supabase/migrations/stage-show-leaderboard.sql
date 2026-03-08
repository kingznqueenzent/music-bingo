-- Host can toggle Stage View to show leaderboard instead of media player
alter table public.games add column if not exists stage_show_leaderboard boolean not null default false;
