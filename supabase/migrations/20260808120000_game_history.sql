-- Past games archive for host dashboard history / community leaderboard.
create table if not exists public.game_history (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references public.games (id) on delete set null,
  game_code text not null,
  host_id uuid,
  total_players integer not null default 0,
  winner_names text[] not null default '{}',
  started_at timestamptz,
  ended_at timestamptz not null default now(),
  duration_seconds integer,
  created_at timestamptz not null default now()
);

create unique index if not exists game_history_game_id_uidx
  on public.game_history (game_id)
  where game_id is not null;

create index if not exists game_history_ended_at_idx
  on public.game_history (ended_at desc);

create index if not exists game_history_host_id_idx
  on public.game_history (host_id);

alter table public.game_history enable row level security;

drop policy if exists "game_history_select_authenticated" on public.game_history;
create policy "game_history_select_authenticated"
  on public.game_history for select
  to authenticated
  using (true);

drop policy if exists "game_history_select_anon" on public.game_history;
create policy "game_history_select_anon"
  on public.game_history for select
  to anon
  using (true);

drop policy if exists "game_history_insert_service" on public.game_history;
create policy "game_history_insert_service"
  on public.game_history for insert
  to authenticated, service_role
  with check (true);

drop policy if exists "game_history_update_service" on public.game_history;
create policy "game_history_update_service"
  on public.game_history for update
  to authenticated, service_role
  using (true)
  with check (true);

comment on table public.game_history is 'Completed game archive: winners, player counts, duration for host Past Games tab.';
