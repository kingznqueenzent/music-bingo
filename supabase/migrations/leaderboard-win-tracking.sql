-- Prevent same card being claimed twice for leaderboard
alter table public.wins add column if not exists claimed_at timestamptz;
create policy "Allow update wins" on public.wins for update using (true);

-- Win tracking: leaderboard table (aggregate stats per player)
create table if not exists public.leaderboard (
  id uuid primary key default gen_random_uuid(),
  player_name text not null,
  identifier text not null unique,
  wins int not null default 0,
  points int not null default 0,
  last_played timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_leaderboard_points on public.leaderboard(points desc);
create index if not exists idx_leaderboard_identifier on public.leaderboard(identifier);

alter table public.leaderboard enable row level security;

create policy "Allow read leaderboard" on public.leaderboard for select using (true);
create policy "Allow insert leaderboard" on public.leaderboard for insert with check (true);
create policy "Allow update leaderboard" on public.leaderboard for update using (true);

comment on table public.leaderboard is 'Aggregate win/points per player for stage leaderboard view';
