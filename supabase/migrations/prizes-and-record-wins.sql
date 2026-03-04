-- Prizes per game (optional – for future "prizes and leaderboard" feature)
-- Run when you're ready to add prizes.

create table if not exists public.prizes (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  rank int not null check (rank >= 1 and rank <= 10),
  label text not null,
  image_url text,
  claim_url text,
  created_at timestamptz default now(),
  unique(game_id, rank)
);

create index if not exists idx_prizes_game on public.prizes(game_id);

alter table public.prizes enable row level security;
create policy "Allow read prizes" on public.prizes for select using (true);
create policy "Allow insert prizes" on public.prizes for insert with check (true);
create policy "Allow update prizes" on public.prizes for update using (true);

-- Optional: link a win to a prize when host assigns it
alter table public.wins add column if not exists prize_id uuid references public.prizes(id) on delete set null;

NOTIFY pgrst, 'reload schema';
